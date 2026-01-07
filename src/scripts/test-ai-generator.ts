/**
 * Test script for AI Generator functionality
 * Tests the random form data generators and validates output
 */

import { 
  generateRandomDietFormData, 
  generateRandomExerciseFormData,
  DIET_CONFIG,
  EXERCISE_CONFIG
} from '../config/ai-generator.config';

console.log('========================================');
console.log('AI GENERATOR TEST');
console.log('========================================\n');

// Test Diet Form Generation
console.log('📋 Testing Diet Form Generator...');
console.log('----------------------------------------');

for (let i = 0; i < 3; i++) {
  const dietForm = generateRandomDietFormData();
  console.log(`\nDiet Form ${i + 1}:`);
  console.log(`  Gender: ${dietForm.gender}`);
  console.log(`  Age: ${dietForm.age}`);
  console.log(`  Height: ${dietForm.height} cm`);
  console.log(`  Weight: ${dietForm.weight} kg`);
  console.log(`  Target Weight: ${dietForm.target_weight} kg`);
  console.log(`  Activity Level: ${dietForm.activity_level}`);
  console.log(`  Goal: ${dietForm.goal}`);
  console.log(`  Diet Type: ${dietForm.diet_type}`);
  console.log(`  Meals Count: ${dietForm.meals_count}`);
  console.log(`  Days: ${dietForm.days}`);
  console.log(`  Cuisine: ${dietForm.cuisine_preference}`);
  console.log(`  Chronic Diseases: ${dietForm.chronic_diseases || 'None'}`);
  console.log(`  Allergies: ${dietForm.allergies || 'None'}`);
  console.log(`  Dislikes: ${dietForm.dislikes || 'None'}`);
  console.log(`  Target Speed: ${dietForm.target_speed}`);
  console.log(`  Workout Type: ${dietForm.workout_type}`);
  console.log(`  Water Intake: ${dietForm.water_intake}`);
  console.log(`  Biggest Struggle: ${dietForm.biggest_struggle}`);
  console.log(`  Cheat Meals/Week: ${dietForm.cheat_meals_per_week}`);
  console.log(`  Wake Up Time: ${dietForm.wake_up_time}`);
  console.log(`  Sleep Time: ${dietForm.sleep_time}`);
}

console.log('\n========================================\n');

// Test Exercise Form Generation
console.log('💪 Testing Exercise Form Generator...');
console.log('----------------------------------------');

for (let i = 0; i < 3; i++) {
  const exerciseForm = generateRandomExerciseFormData();
  console.log(`\nExercise Form ${i + 1}:`);
  console.log(`  Gender: ${exerciseForm.gender}`);
  console.log(`  Age: ${exerciseForm.age}`);
  console.log(`  Height: ${exerciseForm.height} cm`);
  console.log(`  Weight: ${exerciseForm.weight} kg`);
  console.log(`  Fitness Level: ${exerciseForm.fitness_level}`);
  console.log(`  Goal: ${exerciseForm.goal}`);
  console.log(`  Equipment: ${exerciseForm.equipment}`);
  console.log(`  Equipment Details: ${exerciseForm.equipment_details || 'None'}`);
  console.log(`  Duration: ${exerciseForm.duration} min`);
  console.log(`  Days: ${exerciseForm.days}`);
  console.log(`  Days/Week: ${exerciseForm.days_per_week}`);
  console.log(`  Focus Area: ${exerciseForm.focus_area}`);
  console.log(`  Split Preference: ${exerciseForm.split_preference}`);
  console.log(`  Workout Type: ${exerciseForm.workout_type}`);
  console.log(`  Disliked Exercises: ${exerciseForm.disliked_exercises || 'None'}`);
  console.log(`  Workout Time: ${exerciseForm.workout_time_preference}`);
}

console.log('\n========================================\n');

// Validation Tests
console.log('✅ Running Validation Tests...');
console.log('----------------------------------------\n');

let passedTests = 0;
let totalTests = 0;

// Test 1: Diet form has all required fields
totalTests++;
const testDiet = generateRandomDietFormData();
const requiredDietFields = ['gender', 'age', 'height', 'weight', 'target_weight', 'activity_level', 
  'goal', 'diet_type', 'meals_count', 'days', 'cuisine_preference'];
const hasDietFields = requiredDietFields.every(field => testDiet[field] !== undefined);
if (hasDietFields) {
  console.log('✓ Diet form has all required fields');
  passedTests++;
} else {
  console.log('✗ Diet form missing required fields');
}

// Test 2: Exercise form has all required fields
totalTests++;
const testExercise = generateRandomExerciseFormData();
const requiredExerciseFields = ['gender', 'age', 'height', 'weight', 'fitness_level', 
  'goal', 'equipment', 'duration', 'days', 'days_per_week', 'focus_area'];
const hasExerciseFields = requiredExerciseFields.every(field => testExercise[field] !== undefined);
if (hasExerciseFields) {
  console.log('✓ Exercise form has all required fields');
  passedTests++;
} else {
  console.log('✗ Exercise form missing required fields');
}

// Test 3: Values are within expected ranges
totalTests++;
const age = parseInt(testDiet.age);
const ageValid = age >= DIET_CONFIG.age.min && age <= DIET_CONFIG.age.max;
if (ageValid) {
  console.log(`✓ Age is within range (${age})`);
  passedTests++;
} else {
  console.log(`✗ Age is out of range (${age})`);
}

// Test 4: Height is within range
totalTests++;
const height = parseInt(testDiet.height);
const heightValid = height >= DIET_CONFIG.height.min && height <= DIET_CONFIG.height.max;
if (heightValid) {
  console.log(`✓ Height is within range (${height})`);
  passedTests++;
} else {
  console.log(`✗ Height is out of range (${height})`);
}

// Test 5: Weight is within range
totalTests++;
const weight = parseInt(testDiet.weight);
const weightValid = weight >= DIET_CONFIG.weight.min && weight <= DIET_CONFIG.weight.max;
if (weightValid) {
  console.log(`✓ Weight is within range (${weight})`);
  passedTests++;
} else {
  console.log(`✗ Weight is out of range (${weight})`);
}

// Test 6: Gender is valid
totalTests++;
const genderValid = DIET_CONFIG.genders.includes(testDiet.gender as any);
if (genderValid) {
  console.log(`✓ Gender is valid (${testDiet.gender})`);
  passedTests++;
} else {
  console.log(`✗ Gender is invalid (${testDiet.gender})`);
}

// Test 7: Equipment details only when equipment is home_equipment or gym
totalTests++;
const hasEquipmentDetails = testExercise.equipment_details && testExercise.equipment_details.length > 0;
const shouldHaveDetails = testExercise.equipment === 'home_equipment' || testExercise.equipment === 'gym';
const equipmentValid = !shouldHaveDetails || (shouldHaveDetails && hasEquipmentDetails);
if (equipmentValid || testExercise.equipment === 'bodyweight') {
  console.log(`✓ Equipment details logic is correct (${testExercise.equipment})`);
  passedTests++;
} else {
  console.log(`✗ Equipment details logic is incorrect`);
}

console.log('\n========================================');
console.log(`TEST RESULTS: ${passedTests}/${totalTests} passed`);
console.log('========================================\n');

if (passedTests === totalTests) {
  console.log('🎉 All tests passed!');
  process.exit(0);
} else {
  console.log('❌ Some tests failed!');
  process.exit(1);
}
