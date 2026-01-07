/**
 * Test script for global limits functionality
 * Tests the atomic operations and limit enforcement
 */

import { botDb } from '../database/bot-db';
import { GLOBAL_LIMITS } from '../config/ai-generator.config';

console.log('========================================');
console.log('GLOBAL LIMITS TEST');
console.log('========================================\n');

const today = new Date().toISOString().split('T')[0];

console.log(`📅 Testing for date: ${today}\n`);

// Test 1: Check initial state
console.log('Test 1: Initial State');
console.log('----------------------------------------');
const initialLimits = botDb.getGlobalLimits(today);
console.log(`Initial diets: ${initialLimits.diets}`);
console.log(`Initial exercises: ${initialLimits.exercises}`);
console.log(`Can create diet: ${botDb.canCreateDiet(today, GLOBAL_LIMITS.DAILY_DIET_LIMIT)}`);
console.log(`Can create exercise: ${botDb.canCreateExercise(today, GLOBAL_LIMITS.DAILY_EXERCISE_LIMIT)}\n`);

// Test 2: Increment diet counter
console.log('Test 2: Increment Diet Counter');
console.log('----------------------------------------');
for (let i = 0; i < GLOBAL_LIMITS.DAILY_DIET_LIMIT + 1; i++) {
  const success = botDb.incrementGlobalDietCount(today, GLOBAL_LIMITS.DAILY_DIET_LIMIT);
  const limits = botDb.getGlobalLimits(today);
  console.log(`Attempt ${i + 1}: ${success ? '✅ Success' : '❌ Failed (limit reached)'} - Current: ${limits.diets}/${GLOBAL_LIMITS.DAILY_DIET_LIMIT}`);
}
console.log();

// Test 3: Increment exercise counter
console.log('Test 3: Increment Exercise Counter');
console.log('----------------------------------------');
for (let i = 0; i < GLOBAL_LIMITS.DAILY_EXERCISE_LIMIT + 1; i++) {
  const success = botDb.incrementGlobalExerciseCount(today, GLOBAL_LIMITS.DAILY_EXERCISE_LIMIT);
  const limits = botDb.getGlobalLimits(today);
  console.log(`Attempt ${i + 1}: ${success ? '✅ Success' : '❌ Failed (limit reached)'} - Current: ${limits.exercises}/${GLOBAL_LIMITS.DAILY_EXERCISE_LIMIT}`);
}
console.log();

// Test 4: Check can create after limits
console.log('Test 4: Can Create After Limits');
console.log('----------------------------------------');
console.log(`Can create diet: ${botDb.canCreateDiet(today, GLOBAL_LIMITS.DAILY_DIET_LIMIT)}`);
console.log(`Can create exercise: ${botDb.canCreateExercise(today, GLOBAL_LIMITS.DAILY_EXERCISE_LIMIT)}\n`);

// Test 5: Rollback test
console.log('Test 5: Rollback (Decrement)');
console.log('----------------------------------------');
const beforeRollback = botDb.getGlobalLimits(today);
console.log(`Before rollback - Diets: ${beforeRollback.diets}, Exercises: ${beforeRollback.exercises}`);

botDb.decrementGlobalDietCount(today);
botDb.decrementGlobalExerciseCount(today);

const afterRollback = botDb.getGlobalLimits(today);
console.log(`After rollback - Diets: ${afterRollback.diets}, Exercises: ${afterRollback.exercises}`);
console.log(`Can create diet: ${botDb.canCreateDiet(today, GLOBAL_LIMITS.DAILY_DIET_LIMIT)}`);
console.log(`Can create exercise: ${botDb.canCreateExercise(today, GLOBAL_LIMITS.DAILY_EXERCISE_LIMIT)}\n`);

// Test 6: Final state
console.log('Test 6: Final State');
console.log('----------------------------------------');
const finalLimits = botDb.getGlobalLimits(today);
console.log(`Final diets: ${finalLimits.diets}/${GLOBAL_LIMITS.DAILY_DIET_LIMIT}`);
console.log(`Final exercises: ${finalLimits.exercises}/${GLOBAL_LIMITS.DAILY_EXERCISE_LIMIT}`);
console.log(`Total created: ${finalLimits.diets + finalLimits.exercises}/${GLOBAL_LIMITS.DAILY_TOTAL_LIMIT}\n`);

console.log('========================================');
console.log('✅ All tests completed!');
console.log('========================================\n');

console.log('💡 Note: To reset today\'s counts, you can manually delete the entry from the global_limits table.');
