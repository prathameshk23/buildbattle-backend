import { AppError } from '../types/index.js';

export interface FoodScanResult {
  name: string;
  confidence: number;
  serving_g: number;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  notes: string | null;
}

const fallbackModel = 'local-vision-model';

function stripFence(content: string): string {
  return content
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();
}

function asNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normaliseScan(raw: Record<string, unknown>): FoodScanResult {
  return {
    name: String(raw.name || raw.food_name || 'Unknown food'),
    confidence: Math.max(0, Math.min(1, asNumber(raw.confidence, 0.5))),
    serving_g: Math.max(0, asNumber(raw.serving_g, 100)),
    kcal: Math.max(0, asNumber(raw.kcal ?? raw.calories, 0)),
    protein_g: Math.max(0, asNumber(raw.protein_g ?? raw.protein, 0)),
    carbs_g: Math.max(0, asNumber(raw.carbs_g ?? raw.carbs, 0)),
    fat_g: Math.max(0, asNumber(raw.fat_g ?? raw.fat, 0)),
    notes: typeof raw.notes === 'string' && raw.notes.trim() ? raw.notes.trim() : null,
  };
}

export async function scanFoodImage(
  imageBase64: string,
  mimeType: string
): Promise<FoodScanResult> {
  const baseUrl = process.env.LM_STUDIO_BASE_URL ?? 'http://localhost:1234/v1';
  const model = process.env.LM_STUDIO_MODEL ?? fallbackModel;

  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.LM_STUDIO_API_KEY
        ? { Authorization: `Bearer ${process.env.LM_STUDIO_API_KEY}` }
        : {}),
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You estimate nutrition from food photos. Return strict JSON only with keys: name, confidence, serving_g, kcal, protein_g, carbs_g, fat_g, notes. Use numbers, no units. If uncertain, give best estimate and explain in notes.',
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Identify visible food and estimate calories/macros for pictured serving.',
            },
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType};base64,${imageBase64}` },
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new AppError(
      `LM Studio scan failed: ${response.status} ${text.slice(0, 180)}`,
      502,
      'LM_STUDIO_FAILED'
    );
  }

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content;
  if (!content) {
    throw new AppError('LM Studio returned no scan result', 502, 'EMPTY_SCAN_RESULT');
  }

  try {
    return normaliseScan(JSON.parse(stripFence(content)) as Record<string, unknown>);
  } catch {
    throw new AppError('LM Studio returned invalid JSON', 502, 'INVALID_SCAN_JSON');
  }
}
