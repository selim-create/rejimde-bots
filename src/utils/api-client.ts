import axios, { AxiosInstance, AxiosError } from 'axios';
import { ApiResponse, AuthResponse } from '../types';
import { logger } from './logger';
import { rateLimitDelay } from './delay';

export class RejimdeAPIClient {
  private client: AxiosInstance;
  private token: string | null = null;
  private userId: number | null = null;
  private username: string | null = null;

  constructor(baseURL?:  string) {
    const apiUrl = baseURL || process. env.REJIMDE_API_URL || 'https://api.rejimde.com/wp-json';
    
    this.client = axios.create({
      baseURL: apiUrl,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    // Response interceptor for error handling
    this.client. interceptors.response.use(
      response => response,
      (error: AxiosError) => {
        if (error.response) {
          logger.error(`API Error: ${error.response. status}`, error.response.data);
        } else if (error.request) {
          logger.error('No response received', { url: error.config?. url });
        } else {
          logger.error('Request error', { message: error.message });
        }
        throw error;
      }
    );
  }

  // ================== AUTH ==================

  setAuth(token: string, userId: number, username?:  string): void {
    this.token = token;
    this. userId = userId;
    this. username = username || null;
    this.client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  clearAuth(): void {
    this.token = null;
    this. userId = null;
    this. username = null;
    delete this.client.defaults.headers. common['Authorization'];
  }

  isAuthenticated(): boolean {
    return this.token !== null;
  }

  getCurrentUserId(): number | null {
    return this.userId;
  }

  /**
   * Kullanıcı kaydı
   */
  async register(data: {
    username: string;
    email: string;
    password: string;
    role?:  string;
    meta?: Record<string, any>;
  }): Promise<ApiResponse<AuthResponse>> {
    await rateLimitDelay();
    
    const response = await this. client.post('/rejimde/v1/auth/register', {
      username: data.username,
      email: data.email,
      password: data.password,
      role: data.role || 'rejimde_user',
      meta: data. meta || {},
    });

    if (response.data.status === 'success' && response.data.data?. token) {
      this.setAuth(
        response.data.data.token,
        response.data.data.user_id,
        data.username
      );
    }

    return response. data;
  }

  /**
   * Kullanıcı girişi
   */
  async login(username: string, password: string): Promise<ApiResponse<AuthResponse>> {
    await rateLimitDelay();
    
    const response = await this.client.post('/rejimde/v1/auth/login', {
      username,
      password,
    });

    if (response.data.status === 'success' && response.data.data?.token) {
      this.setAuth(
        response.data.data.token,
        response.data.data.user_id,
        username
      );
    }

    return response.data;
  }

  // ================== GAMIFICATION ==================

  /**
   * Puan kazan (event dispatch)
   */
  async earnPoints(action: string, entityType?:  string, entityId?: number): Promise<ApiResponse> {
    await rateLimitDelay();
    
    const response = await this.client.post('/rejimde/v1/gamification/earn', {
      action,
      entity_type: entityType,
      entity_id: entityId,
    });
    
    return response.data;
  }

  /**
   * Event dispatch
   */
  async dispatchEvent(eventType: string, payload: Record<string, any> = {}): Promise<ApiResponse> {
    await rateLimitDelay();
    
    const response = await this.client.post('/rejimde/v1/events/dispatch', {
      event_type: eventType,
      ... payload,
    });
    
    return response.data;
  }

  /**
   * Kullanıcı istatistikleri
   */
  async getMyStats(): Promise<ApiResponse> {
    const response = await this.client.get('/rejimde/v1/gamification/me');
    return response.data;
  }

  // ================== DIET ==================

  /**
   * Diyetleri listele
   */
  async getDiets(limit: number = 20): Promise<ApiResponse> {
    const response = await this.client.get('/rejimde/v1/plans', {
      params: { per_page: limit },
    });
    return response.data;
  }

  /**
   * Diyete başla
   */
  async startDiet(planId: number): Promise<ApiResponse> {
    await rateLimitDelay();
    const response = await this.client.post(`/rejimde/v1/plans/start/${planId}`);
    return response.data;
  }

  /**
   * Diyeti tamamla
   */
  async completeDiet(planId: number): Promise<ApiResponse> {
    await rateLimitDelay();
    const response = await this.client.post(`/rejimde/v1/plans/complete/${planId}`);
    return response.data;
  }

  /**
   * Öğün tamamla
   */
  async completeMealItem(planId: number, itemId: string): Promise<ApiResponse> {
    await rateLimitDelay();
    const response = await this. client.post(`/rejimde/v1/progress/diet/${planId}/complete-item`, {
      item_id: itemId,
    });
    return response.data;
  }

  // ================== EXERCISE ==================

  /**
   * Egzersizleri listele
   */
  async getExercises(limit:  number = 20): Promise<ApiResponse> {
    const response = await this.client.get('/rejimde/v1/exercises', {
      params: { per_page: limit },
    });
    return response.data;
  }

  /**
   * Egzersize başla
   */
  async startExercise(exerciseId: number): Promise<ApiResponse> {
    await rateLimitDelay();
    const response = await this.client.post(`/rejimde/v1/progress/exercise/${exerciseId}/start`);
    return response.data;
  }

  /**
   * Egzersizi tamamla
   */
  async completeExercise(exerciseId: number): Promise<ApiResponse> {
    await rateLimitDelay();
    const response = await this.client.post(`/rejimde/v1/progress/exercise/${exerciseId}/complete`);
    return response.data;
  }

  // ================== BLOG ==================

  /**
   * Blog yazılarını listele
   */
  async getBlogs(limit: number = 20): Promise<ApiResponse> {
    const response = await this. client.get('/wp/v2/posts', {
      params: { per_page: limit, _embed: true },
    });
    // WordPress standart API farklı format döner
    return { status: 'success', data: response.data };
  }

  /**
   * Blog okuma puanı al
   */
  async claimBlogReward(blogId: number): Promise<ApiResponse> {
    await rateLimitDelay();
    const response = await this.client.post(`/rejimde/v1/progress/blog/${blogId}/claim`);
    return response.data;
  }

  // ================== COMMENTS ==================

  /**
   * Yorum yap
   */
  async createComment(postId: number, content: string, parentId?: number): Promise<ApiResponse> {
    await rateLimitDelay();
    const response = await this.client.post('/rejimde/v1/comments', {
      post:  postId,
      content,
      parent: parentId || 0,
    });
    return response.data;
  }

  /**
   * Yorumları getir
   */
  async getComments(postId: number): Promise<ApiResponse> {
    const response = await this.client.get('/rejimde/v1/comments', {
      params: { post: postId },
    });
    return response. data;
  }

  /**
   * Yorum beğen
   */
  async likeComment(commentId: number): Promise<ApiResponse> {
    await rateLimitDelay();
    const response = await this.client. post(`/rejimde/v1/comments/${commentId}/like`);
    return response.data;
  }

  // ================== SOCIAL ==================

  /**
   * Kullanıcı takip et
   */
  async followUser(userId: number): Promise<ApiResponse> {
    await rateLimitDelay();
    const response = await this.client. post(`/rejimde/v1/profile/${userId}/follow`);
    return response.data;
  }

  /**
   * Beşlik çak
   */
  async sendHighFive(userId: number): Promise<ApiResponse> {
    await rateLimitDelay();
    const response = await this.client. post(`/rejimde/v1/profile/${userId}/high-five`);
    return response.data;
  }

  /**
   * Kullanıcı listesi
   */
  async getUsers(limit: number = 50): Promise<ApiResponse> {
    const response = await this.client.get('/wp/v2/users', {
      params: { per_page:  limit },
    });
    return { status: 'success', data:  response.data };
  }

  // ================== CIRCLE ==================

  /**
   * Circle listesi
   */
  async getCircles(): Promise<ApiResponse> {
    const response = await this.client. get('/rejimde/v1/circles');
    return response.data;
  }

  /**
   * Circle'a katıl
   */
  async joinCircle(circleId: number): Promise<ApiResponse> {
    await rateLimitDelay();
    const response = await this. client.post(`/rejimde/v1/circles/${circleId}/join`);
    return response.data;
  }

  // ================== EXPERTS ==================

  /**
   * Uzman listesi
   */
  async getExperts(): Promise<ApiResponse> {
    const response = await this.client. get('/rejimde/v1/experts');
    return response. data;
  }

  /**
   * Uzman takip et
   */
  async followExpert(expertId: number): Promise<ApiResponse> {
    await rateLimitDelay();
    const response = await this.client.post(`/rejimde/v1/profile/${expertId}/follow`);
    return response.data;
  }

  // ================== PROGRESS ==================

  /**
   * Su kaydet
   */
  async logWater(amount: number = 200): Promise<ApiResponse> {
    await rateLimitDelay();
    return this.dispatchEvent('water_added', { amount });
  }

  /**
   * Adım kaydet
   */
  async logSteps(steps: number): Promise<ApiResponse> {
    await rateLimitDelay();
    return this.dispatchEvent('steps_logged', { steps });
  }

  // ================== CALCULATOR ==================

  /**
   * Hesaplayıcı sonucu kaydet
   */
  async saveCalculator(calculatorType: string, result: Record<string, any>): Promise<ApiResponse> {
    await rateLimitDelay();
    const response = await this.client.post(`/rejimde/v1/progress/calculator/${calculatorType}/save`, result);
    return response.data;
  }

  // ================== ADMIN (Bot sistemi için) ==================

  /**
   * AI ayarlarını getir (admin only)
   */
  async getAISettings(): Promise<ApiResponse> {
    const response = await this. client.get('/rejimde/v1/admin/settings/ai');
    return response.data;
  }

  /**
   * Bot istatistikleri (admin only)
   */
  async getBotStats(): Promise<ApiResponse> {
    const response = await this.client.get('/rejimde/v1/admin/bots/stats');
    return response.data;
  }
}

// Singleton instance
export const apiClient = new RejimdeAPIClient();