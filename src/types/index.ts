// User Types
export interface BotUser {
  id?:  number;
  username: string;
  email: string;
  password: string;
  name:  string;
  gender: 'male' | 'female';
  birth_date: string;
  height: number;
  current_weight: number;
  target_weight: number;
  goal: 'weight_loss' | 'muscle_gain' | 'healthy_living';
  activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  description: string;
  location: string;
  avatar_url:  string;
  // Simulation metadata
  is_simulation: boolean;
  simulation_persona: PersonaType;
  simulation_batch: string;
  simulation_active: boolean;
}

export type PersonaType = 
  | 'super_active' 
  | 'active' 
  | 'normal' 
  | 'low_activity' 
  | 'dormant' 
  | 'diet_focused' 
  | 'exercise_focused';

// API Response Types
export interface ApiResponse<T = any> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
}

export interface AuthResponse {
  token: string;
  user_id: number;
  user_email: string;
  user_display_name: string;
  user_nicename: string;
  roles: string[];
}

// Activity Types
export interface ActivityConfig {
  daily_login?:  number;
  blog_read?: number;
  blog_comment?: number;
  comment_reply?: number;
  diet_start?: number;
  diet_meal_complete?: number;
  diet_comment?: number;
  exercise_start?: number;
  exercise_complete?: number;
  water_log?: number;
  step_log?: number;
  meal_log?: number;
  circle_join?: number;
  follow_user?: number;
  high_five?: number;
  expert_follow?: number;
  calculator_use?: number;
  like_comment?: number;
}

export interface PersonaConfig {
  count: number;
  description: string;
  activities: ActivityConfig;
  ai_enabled: boolean;
}

// Database Types
export interface StoredBot {
  id: number;
  user_id: number;
  username: string;
  email: string;
  password: string;  // ← BU SATIRI EKLE
  persona: PersonaType;
  batch_id: string;
  is_active: boolean;
  last_login: string | null;
  last_activity: string | null;
  total_score: number;
  created_at: string;
}