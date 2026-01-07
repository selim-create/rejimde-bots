/**
 * Belirli bir süre bekle
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Rastgele bir süre bekle (min-max ms arası)
 */
export function randomDelay(minMs: number, maxMs: number): Promise<void> {
  const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return delay(ms);
}

/**
 * Rate limiting için bekleme (API çağrıları arası)
 */
export async function rateLimitDelay(): Promise<void> {
  // 1-3 saniye arası rastgele bekle
  await randomDelay(1000, 3000);
}