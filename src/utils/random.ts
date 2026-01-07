/**
 * Verilen olasılığa göre bir eylemin gerçekleşip gerçekleşmeyeceğini belirler
 * @param probability 0-1 arası olasılık değeri
 */
export function shouldPerform(probability: number): boolean {
  return Math.random() < probability;
}

/**
 * Bir diziden rastgele eleman seçer
 */
export function pickRandom<T>(array: T[]): T {
  if (array.length === 0) {
    throw new Error('Cannot pick from empty array');
  }
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Min-max arasında rastgele tam sayı üretir (dahil)
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Min-max arasında rastgele ondalıklı sayı üretir
 */
export function randomFloat(min: number, max: number): number {
  return Math. random() * (max - min) + min;
}

/**
 * Weighted random selection - ağırlıklı seçim
 */
export function weightedRandom<T>(items: T[], weights: number[]): T {
  if (items.length !== weights.length) {
    throw new Error('Items and weights must have same length');
  }
  
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let random = Math.random() * totalWeight;
  
  for (let i = 0; i < items.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return items[i];
    }
  }
  
  return items[items.length - 1];
}

/**
 * Bir diziyi karıştırır (Fisher-Yates shuffle)
 */
export function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Belirli bir aralıkta rastgele tarih üretir
 */
export function randomDate(start: Date, end:  Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

/**
 * Gauss dağılımına göre rastgele sayı üretir
 */
export function randomGaussian(mean: number, stdDev: number): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return num * stdDev + mean;
}