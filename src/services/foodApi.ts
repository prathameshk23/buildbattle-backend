import { FoodItem } from '../types/index.js';

const BASE_URL = 'https://world.openfoodfacts.org';

function getUserAgent(): string {
  return process.env.OPEN_FOOD_FACTS_USER_AGENT ?? 'HealthFitnessApp/1.0';
}

/**
 * Normalises a raw Open Food Facts product object into a `FoodItem`.
 * Returns `null` values for any missing nutrition fields — never throws.
 *
 * @param product - Raw product object from Open Food Facts API
 * @returns Normalised FoodItem
 */
function normaliseProduct(product: Record<string, unknown>): FoodItem {
  const nutriments = (product.nutriments ?? {}) as Record<string, unknown>;

  const safeNumber = (value: unknown): number | null => {
    const n = Number(value);
    return isNaN(n) ? null : n;
  };

  const safeString = (value: unknown): string | null =>
    typeof value === 'string' && value.trim() !== '' ? value.trim() : null;

  return {
    name:
      safeString(product.product_name) ??
      safeString(product.product_name_en) ??
      'Unknown Product',
    brand: safeString(product.brands),
    kcal_per_100g: safeNumber(nutriments['energy-kcal_100g']),
    protein_g: safeNumber(nutriments['proteins_100g']),
    carbs_g: safeNumber(nutriments['carbohydrates_100g']),
    fat_g: safeNumber(nutriments['fat_100g']),
    serving_size_g: safeNumber(product.serving_quantity),
  };
}

// ─── Search by Name ───────────────────────────────────────────────────────────

/**
 * Searches Open Food Facts by food name.
 * Returns up to 20 normalised FoodItem results.
 *
 * @param query - Food name search string
 * @returns Array of FoodItem results (may be empty if no results found)
 */
export async function searchByName(query: string): Promise<FoodItem[]> {
  const params = new URLSearchParams({
    search_terms: query,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: '20',
    fields:
      'product_name,product_name_en,brands,nutriments,serving_quantity',
  });

  const url = `${BASE_URL}/cgi/search.pl?${params.toString()}`;

  const response = await fetch(url, {
    headers: { 'User-Agent': getUserAgent() },
  });

  if (!response.ok) {
    console.error(`[FoodAPI] Search failed: ${response.status} ${response.statusText}`);
    return [];
  }

  const json = (await response.json()) as { products?: unknown[] };
  const products = json.products ?? [];

  return products
    .filter((p) => p !== null && typeof p === 'object')
    .map((p) => normaliseProduct(p as Record<string, unknown>));
}

// ─── Lookup by Barcode ────────────────────────────────────────────────────────

/**
 * Looks up a product by EAN barcode via Open Food Facts.
 *
 * @param barcode - EAN-8 or EAN-13 barcode string
 * @returns Normalised FoodItem or null if not found
 */
export async function lookupBarcode(barcode: string): Promise<FoodItem | null> {
  const url = `${BASE_URL}/api/v0/product/${encodeURIComponent(barcode)}.json`;

  const response = await fetch(url, {
    headers: { 'User-Agent': getUserAgent() },
  });

  if (!response.ok) {
    console.error(`[FoodAPI] Barcode lookup failed: ${response.status} ${response.statusText}`);
    return null;
  }

  const json = (await response.json()) as { status: number; product?: Record<string, unknown> };

  // status 0 means product not found
  if (json.status === 0 || !json.product) {
    return null;
  }

  return normaliseProduct(json.product);
}
