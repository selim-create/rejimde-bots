# Global Daily Limit System

## Overview
This system implements global daily limits for AI-generated content across all bots in the system. Instead of each bot independently trying to create content (which led to 21-35 items per day with 1500-2500 bots), we now have a centralized limit of **4-5 items per day** (2 diets + 3 exercises).

## Architecture

### Database Table: `global_limits`
```sql
CREATE TABLE IF NOT EXISTS global_limits (
  id INTEGER PRIMARY KEY,
  date TEXT NOT NULL UNIQUE,           -- "2026-01-07"
  diets_created INTEGER DEFAULT 0,
  exercises_created INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### Configuration (ai-generator.config.ts)
```typescript
export const GLOBAL_LIMITS = {
  DAILY_DIET_LIMIT: 2,      // Max 2 diets per day across all bots
  DAILY_EXERCISE_LIMIT: 3,  // Max 3 exercises per day across all bots
  DAILY_TOTAL_LIMIT: 5,     // Total daily limit
};
```

## How It Works

### 1. Content Distribution
- **40%** chance for diet (if available)
- **60%** chance for exercise (if available)
- This ensures we get a good mix of content types

### 2. Atomic Reservation System
When a bot attempts to create content:

1. **Check Global Limit**: `canCreateDiet()` or `canCreateExercise()`
2. **Atomic Increment**: `incrementGlobalDietCount()` or `incrementGlobalExerciseCount()`
   - Uses SQLite transactions for atomicity
   - Returns `true` if reservation successful
   - Returns `false` if limit already reached (race condition protection)
3. **Create Content**: Call API to generate diet/exercise
4. **On Success**: Keep the reservation, update bot state
5. **On Failure**: Rollback with `decrementGlobalDietCount()` or `decrementGlobalExerciseCount()`

### 3. Race Condition Protection
The atomic operations ensure that even if multiple bots try to create content simultaneously:
- Only the first N bots (within limit) succeed in reserving a slot
- Remaining bots get `false` and skip content creation
- No over-creation beyond the daily limits

## Flow Diagram

```
Bot wants to create content
    ↓
Check global limits (read-only)
    ↓
Both diet & exercise available?
    ↓
Choose randomly (40% diet, 60% exercise)
    ↓
ATOMIC: Try to reserve slot
    ↓
    ├── Reservation failed → Return (another bot got it)
    └── Reservation successful
            ↓
        Call API to create content
            ↓
            ├── API success → Keep reservation, log activity
            └── API failure → ROLLBACK reservation
```

## API Functions

### Database Functions (bot-db.ts)

#### Read Operations
- `getGlobalLimits(date: string)` - Get current counts for a date
- `canCreateDiet(date: string, limit: number)` - Check if diet can be created
- `canCreateExercise(date: string, limit: number)` - Check if exercise can be created

#### Atomic Write Operations
- `incrementGlobalDietCount(date: string, limit: number)` - Reserve a diet slot
- `incrementGlobalExerciseCount(date: string, limit: number)` - Reserve an exercise slot

#### Rollback Operations
- `decrementGlobalDietCount(date: string)` - Rollback a failed diet creation
- `decrementGlobalExerciseCount(date: string)` - Rollback a failed exercise creation

## Daily Behavior

### Day Start (00:00)
- New date in YYYY-MM-DD format
- No entry in `global_limits` table
- All bots can attempt to create content

### During the Day
- First bot creates diet → `diets_created = 1`
- Second bot creates diet → `diets_created = 2`
- Third bot tries diet → **REJECTED** (limit reached)
- Third bot tries exercise instead → `exercises_created = 1`
- ... continues until both limits reached

### After Limits Reached
- All bots see "limit full" and skip AI content creation
- System generates exactly 2 diets + 3 exercises = 5 items total
- Much more controlled than the previous 21-35 items per day

## Configuration Changes

### Before (Per-Bot Limits)
```typescript
const DAILY_DIET_LIMIT = 2;        // Per bot
const DAILY_EXERCISE_LIMIT = 2;    // Per bot
const DAILY_TOTAL_LIMIT = 4;       // Per bot
AI_GENERATION_PROBABILITY = 0.15;  // 15% chance per bot
```
**Result**: With 1500 bots → ~225 attempts → ~21 items created per day

### After (Global Limits)
```typescript
GLOBAL_LIMITS.DAILY_DIET_LIMIT = 2;      // System-wide
GLOBAL_LIMITS.DAILY_EXERCISE_LIMIT = 3;  // System-wide
GLOBAL_LIMITS.DAILY_TOTAL_LIMIT = 5;     // System-wide
AI_GENERATION_PROBABILITY = 0.08;        // 8% chance per bot (reduced)
```
**Result**: With any number of bots → exactly 5 items per day

## Benefits

1. **Predictable Content Volume**: Exactly 4-5 items per day, regardless of bot count
2. **Resource Efficiency**: No wasted API calls after limits reached
3. **Fair Distribution**: Race-free slot reservation
4. **Failure Resilience**: Failed creations don't count against limits (rollback)
5. **Scalable**: Works with 100 bots or 10,000 bots

## Testing

Run the test script to verify functionality:
```bash
npm run test-global-limits
```

This will:
- Test initial state
- Test atomic increment operations
- Test limit enforcement
- Test rollback mechanism
- Verify race condition handling
