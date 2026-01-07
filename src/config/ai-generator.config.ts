/**
 * AI Generator Configuration
 * Form alanları için olası değerler ve rastgele data üreticileri
 */

// ============ GLOBAL LIMITS ============

export const GLOBAL_LIMITS = {
  DAILY_DIET_LIMIT: 2,      // Tüm sistemde günde max 2 diyet
  DAILY_EXERCISE_LIMIT: 3,  // Tüm sistemde günde max 3 egzersiz
  DAILY_TOTAL_LIMIT: 5,     // Toplam günlük limit (dokümantasyon için, kod içinde ayrıca kontrol edilmez)
};

// ============ DIET CONFIG ============

export const DIET_CONFIG = {
  genders: ['female', 'male'] as const,
  age: { min: 18, max: 65 },
  height: { min: 150, max: 200 },
  weight: { min: 45, max: 120 },
  activityLevels: ['sedentary', 'light', 'moderate', 'active'] as const,
  goals: ['lose_weight', 'maintain', 'gain_muscle'] as const,
  dietTypes: [
    'Hızlı Sonuç', 'Standart', 'Keto', 'Vegan', 'Vejetaryen',
    'Düşük Karbonhidrat', 'Akdeniz', 'Glutensiz',
    'Ekonomik', 'Detoks', 'Protein Ağırlıklı', 'Aralıklı Oruç'
  ],
  mealsCounts: ['2', '3', '4', '5', '6'],
  days: ['1', '3', '7', '15'],
  cuisines: ['turkish', 'world', 'practical'] as const,
  chronicDiseases: ['Diyabet', 'İnsülin Direnci', 'Tiroid', 'Hipertansiyon', 'Kolesterol', 'IBS/Mide', 'PCOS', 'Çölyak'],
  allergies: ['Süt/Laktoz', 'Yumurta', 'Gluten', 'Kuruyemiş', 'Balık', 'Soya'],
  dislikes: ['Sakatat', 'Mantar', 'Kereviz', 'Brokoli', 'Balık', 'Kırmızı Et'],
  targetSpeeds: ['slow', 'normal', 'fast'] as const,
  workoutTypes: ['none', 'light', 'moderate', 'intense'] as const,
  waterIntakes: ['low', 'medium', 'high'] as const,
  biggestStruggles: ['sweet_cravings', 'night_eating', 'portion_control', 'motivation'] as const,
  cheatMealsPerWeek: ['0', '1', '2', '3'],
};

// ============ EXERCISE CONFIG ============

export const EXERCISE_CONFIG = {
  genders: ['female', 'male'] as const,
  age: { min: 18, max: 65 },
  height: { min: 150, max: 200 },
  weight: { min: 45, max: 120 },
  fitnessLevels: ['beginner', 'intermediate', 'advanced'] as const,
  goals: ['lose_weight', 'muscle_build', 'endurance', 'flexibility'] as const,
  equipments: ['bodyweight', 'home_equipment', 'gym'] as const,
  equipmentDetails: ['Dambıl', 'Mat', 'Direnç Bandı', 'Kettlebell', 'Barfiks Barı', 'Bench/Sehpa', 'Koşu Bandı'],
  durations: ['15', '30', '45', '60'],
  days: ['3', '7', '14', '28'],
  daysPerWeek: ['2', '3', '4', '5', '6'],
  focusAreas: ['full_body', 'upper_body', 'lower_body', 'core', 'cardio'] as const,
  splitPreferences: ['full_body', 'upper_lower', 'ppl', 'regional'] as const,
  workoutTypes: ['mixed', 'strength', 'hiit', 'pilates_yoga'] as const,
  dislikedExercises: ['Burpee', 'Şınav', 'Plank', 'Lunge', 'Squat', 'Zıplama'],
};

// ============ HELPER FUNCTIONS ============

/**
 * Bir diziden rastgele eleman seçer
 */
export function pickRandom<T>(arr: readonly T[] | T[]): T {
  if (arr.length === 0) {
    throw new Error('Cannot pick from empty array');
  }
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Bir diziden rastgele birden fazla eleman seçer
 */
export function pickRandomMultiple<T>(arr: readonly T[] | T[], min: number, max: number): T[] {
  if (arr.length === 0) return [];
  
  const count = randomInt(min, Math.min(max, arr.length));
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Min-max arasında rastgele tam sayı üretir (dahil)
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Belirli bir saat aralığında rastgele zaman üretir (HH:MM formatında)
 */
export function randomTime(startHour: number, endHour: number): string {
  const hour = randomInt(startHour, endHour);
  const minute = randomInt(0, 59);
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

// ============ RANDOM FORM DATA GENERATORS ============

/**
 * Rastgele diyet formu verisi oluşturur
 */
export function generateRandomDietFormData(): Record<string, any> {
  const gender = pickRandom(DIET_CONFIG.genders);
  const age = randomInt(DIET_CONFIG.age.min, DIET_CONFIG.age.max);
  const height = randomInt(DIET_CONFIG.height.min, DIET_CONFIG.height.max);
  const weight = randomInt(DIET_CONFIG.weight.min, DIET_CONFIG.weight.max);
  const targetWeight = weight + randomInt(-20, -5); // Hedef kilo genelde mevcut kilodan düşük
  
  // Rastgele 0-2 kronik hastalık seç
  const chronicDiseases = pickRandomMultiple(DIET_CONFIG.chronicDiseases, 0, 2);
  
  // Rastgele 0-2 alerji seç
  const allergies = pickRandomMultiple(DIET_CONFIG.allergies, 0, 2);
  
  // Rastgele 0-3 beğenilmeyen yiyecek seç
  const dislikes = pickRandomMultiple(DIET_CONFIG.dislikes, 0, 3);

  return {
    gender,
    age: age.toString(),
    height: height.toString(),
    weight: weight.toString(),
    target_weight: targetWeight.toString(),
    activity_level: pickRandom(DIET_CONFIG.activityLevels),
    goal: pickRandom(DIET_CONFIG.goals),
    diet_type: pickRandom(DIET_CONFIG.dietTypes),
    meals_count: pickRandom(DIET_CONFIG.mealsCounts),
    days: pickRandom(DIET_CONFIG.days),
    cuisine_preference: pickRandom(DIET_CONFIG.cuisines),
    chronic_diseases: chronicDiseases.join(', '),
    allergies: allergies.join(', '),
    dislikes: dislikes.join(', '),
    target_speed: pickRandom(DIET_CONFIG.targetSpeeds),
    workout_type: pickRandom(DIET_CONFIG.workoutTypes),
    water_intake: pickRandom(DIET_CONFIG.waterIntakes),
    biggest_struggle: pickRandom(DIET_CONFIG.biggestStruggles),
    cheat_meals_per_week: pickRandom(DIET_CONFIG.cheatMealsPerWeek),
    wake_up_time: randomTime(5, 8),
    sleep_time: randomTime(21, 23),
  };
}

/**
 * Rastgele egzersiz formu verisi oluşturur
 */
export function generateRandomExerciseFormData(): Record<string, any> {
  const gender = pickRandom(EXERCISE_CONFIG.genders);
  const age = randomInt(EXERCISE_CONFIG.age.min, EXERCISE_CONFIG.age.max);
  const height = randomInt(EXERCISE_CONFIG.height.min, EXERCISE_CONFIG.height.max);
  const weight = randomInt(EXERCISE_CONFIG.weight.min, EXERCISE_CONFIG.weight.max);
  
  const equipment = pickRandom(EXERCISE_CONFIG.equipments);
  
  // Equipment details sadece home_equipment veya gym seçildiyse
  let equipmentDetails: string[] = [];
  if (equipment === 'home_equipment' || equipment === 'gym') {
    equipmentDetails = pickRandomMultiple(EXERCISE_CONFIG.equipmentDetails, 1, 4);
  }
  
  // Rastgele 0-3 beğenilmeyen egzersiz seç
  const dislikedExercises = pickRandomMultiple(EXERCISE_CONFIG.dislikedExercises, 0, 3);

  return {
    gender,
    age: age.toString(),
    height: height.toString(),
    weight: weight.toString(),
    fitness_level: pickRandom(EXERCISE_CONFIG.fitnessLevels),
    goal: pickRandom(EXERCISE_CONFIG.goals),
    equipment,
    equipment_details: equipmentDetails.join(', '),
    duration: pickRandom(EXERCISE_CONFIG.durations),
    days: pickRandom(EXERCISE_CONFIG.days),
    days_per_week: pickRandom(EXERCISE_CONFIG.daysPerWeek),
    focus_area: pickRandom(EXERCISE_CONFIG.focusAreas),
    split_preference: pickRandom(EXERCISE_CONFIG.splitPreferences),
    workout_type: pickRandom(EXERCISE_CONFIG.workoutTypes),
    disliked_exercises: dislikedExercises.join(', '),
    workout_time_preference: pickRandom(['morning', 'afternoon', 'evening']),
  };
}
