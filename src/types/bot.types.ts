export interface Bot {
  id:  number;                      // WordPress user ID
  localId: number;                 // Local SQLite ID
  username: string;
  email: string;
  password: string;                // Encrypted
  token: string;                   // JWT token
  tokenExpiry: Date;
  
  // Profile
  displayName: string;
  avatarUrl:  string;
  bio: string;
  gender: 'male' | 'female';
  height: number;
  currentWeight: number;
  targetWeight: number;
  birthDate: string;
  
  // Simulation
  persona:  string;
  batchId: string;
  isActive: boolean;
  
  // State
  currentStreak: number;
  lastLoginDate: string;
  activeDietId: number | null;
  activeExerciseId:  number | null;
  circleId: number | null;
  
  // Statistics
  totalScore: number;
  totalLogins: number;
  totalComments: number;
  totalLikes: number;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface BotActivity {
  id:  number;
  botId: number;
  activityType:  string;
  entityType: string | null;
  entityId: number | null;
  success: boolean;
  response:  string | null;
  createdAt: Date;
}

export interface BotState {
  startedDiets: number[];
  completedDiets:  number[];
  startedExercises:  number[];
  completedExercises:  number[];
  followedUsers: number[];
  joinedCircle: number | null;
  readBlogs: number[];
  commentedPosts: number[];
}