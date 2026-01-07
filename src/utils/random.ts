/**
 * Random utility fonksiyonları
 */

/**
 * Min-max arası rastgele tam sayı
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math. random() * (max - min + 1)) + min;
}

/**
 * Diziden rastgele eleman seç
 */
export function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math. random() * arr.length)];
}

/**
 * Belirli bir olasılıkla true döndür (0-1 arası)
 */
export function shouldAct(chance: number): boolean {
  return Math. random() < chance;
}

/**
 * Rastgele boolean
 */
export function randomBoolean(): boolean {
  return Math.random() > 0.5;
}

/**
 * Diziden n adet rastgele eleman seç
 */
export function randomElements<T>(arr:  T[], count: number): T[] {
  const shuffled = [...arr]. sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, arr.length));
}