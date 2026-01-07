export const API_CONFIG = {
  BASE_URL: process. env. REJIMDE_API_URL || 'https://api.rejimde.com/wp-json',
  ENDPOINTS: {
    // Auth
    REGISTER: '/rejimde/v1/auth/register',
    LOGIN: '/rejimde/v1/auth/login',
    
    // Content
    BLOGS: '/wp/v2/posts',
    DIETS: '/rejimde/v1/plans',
    EXERCISES:  '/rejimde/v1/exercises',
    CIRCLES: '/rejimde/v1/circles',
    
    // Actions
    DISPATCH_EVENT: '/rejimde/v1/events/dispatch',
    COMMENTS: '/rejimde/v1/comments',
    FOLLOW: '/rejimde/v1/profile/{id}/follow',
    HIGH_FIVE: '/rejimde/v1/profile/{id}/high-five',
    
    // Plans
    START_PLAN: '/rejimde/v1/plans/start/{id}',
    COMPLETE_PLAN: '/rejimde/v1/plans/complete/{id}',
    
    // Admin
    BOT_STATS:  '/rejimde/v1/admin/bots/stats'
  }
};