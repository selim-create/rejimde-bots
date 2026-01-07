import { RejimdeAPIClient } from '../utils/api-client';
import { logger } from '../utils/logger';
import { randomElement, randomInt } from '../utils/random';

// Türk mutfağı yemekleri
const TURKISH_MEALS = {
  breakfast: [
    { name:  'Menemen', calories: 250, protein: 12, carbs: 15, fat: 16 },
    { name: 'Simit + Peynir + Çay', calories: 350, protein: 10, carbs: 45, fat: 12 },
    { name: 'Yulaf Ezmesi + Muz', calories: 300, protein: 8, carbs: 50, fat: 6 },
    { name:  'Sucuklu Yumurta', calories:  400, protein:  20, carbs: 5, fat: 32 },
    { name: 'Poğaça + Ayran', calories: 320, protein: 8, carbs: 40, fat: 14 },
    { name:  'Tam Buğday Ekmek + Avokado', calories: 280, protein: 6, carbs: 30, fat: 16 },
    { name:  'Sahanda Yumurta + Domates', calories: 220, protein: 14, carbs: 8, fat: 15 },
  ],
  lunch:  [
    { name: 'Tavuk Izgara + Salata', calories: 450, protein: 40, carbs: 15, fat: 25 },
    { name: 'Mercimek Çorbası + Ekmek', calories: 350, protein: 15, carbs: 50, fat: 8 },
    { name: 'Kuru Fasulye Pilav', calories: 550, protein: 18, carbs: 80, fat: 12 },
    { name: 'Döner + Ayran', calories: 600, protein: 30, carbs: 45, fat: 35 },
    { name: 'Izgara Köfte + Bulgur', calories: 500, protein: 35, carbs: 40, fat: 22 },
    { name: 'Sebzeli Makarna', calories: 420, protein: 12, carbs: 65, fat: 12 },
    { name: 'Balık Izgara + Roka Salatası', calories: 380, protein: 35, carbs: 10, fat: 22 },
  ],
  dinner: [
    { name:  'Zeytinyağlı Dolma', calories: 300, protein: 6, carbs: 40, fat: 14 },
    { name: 'Etli Kuru Fasulye', calories:  450, protein:  25, carbs: 45, fat: 18 },
    { name: 'Tavuk Sote + Pilav', calories: 480, protein: 32, carbs: 45, fat: 18 },
    { name: 'Sebze Çorbası', calories:  180, protein: 5, carbs: 25, fat: 6 },
    { name: 'Lahmacun', calories: 350, protein: 15, carbs: 40, fat: 14 },
    { name: 'Karnıyarık', calories: 400, protein: 18, carbs: 30, fat: 24 },
    { name: 'Yoğurtlu Kabak', calories: 200, protein: 8, carbs: 20, fat: 10 },
  ],
  snack: [
    { name: 'Elma', calories: 80, protein: 0, carbs: 20, fat: 0 },
    { name: 'Ceviz (30g)', calories: 200, protein: 5, carbs: 4, fat: 18 },
    { name: 'Yoğurt', calories: 120, protein: 8, carbs: 10, fat: 5 },
    { name: 'Muz', calories: 100, protein: 1, carbs: 25, fat: 0 },
    { name: 'Protein Bar', calories: 200, protein: 20, carbs: 22, fat: 6 },
    { name: 'Badem (20g)', calories: 140, protein: 5, carbs: 3, fat: 12 },
  ],
};

export interface MealLogResult {
  success:  boolean;
  mealType: string;
  mealName: string;
  calories: number;
}

export async function logRandomMeal(
  client: RejimdeAPIClient,
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
): Promise<MealLogResult> {
  const meals = TURKISH_MEALS[mealType];
  const meal = randomElement(meals);

  try {
    // Küçük varyasyon ekle
    const calorieVariation = randomInt(-30, 30);
    const finalCalories = meal. calories + calorieVariation;

    const response = await client.logMeal({
      meal_type: mealType,
      description: meal.name,
      calories: finalCalories,
      protein: meal.protein,
      carbs: meal.carbs,
      fat:  meal.fat,
    });

    return {
      success:  response.status === 'success',
      mealType,
      mealName: meal.name,
      calories: finalCalories,
    };
  } catch (error) {
    return {
      success:  false,
      mealType,
      mealName: meal.name,
      calories: 0,
    };
  }
}