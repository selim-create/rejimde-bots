import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  ApiResponse,
  RegisterResponse,
  LoginResponse,
  EventDispatchResponse,
  BlogPost,
  DietPlan,
  ExercisePlan,
  Circle,
  Expert,
  Comment,
  LeaderboardUser
} from '../types';
import { logger } from './logger';

const API_BASE_URL = process.env. REJIMDE_API_URL || 'https://api.rejimde.com/wp-json';

export class RejimdeAPIClient {
  private client:  AxiosInstance;
  private token:  string | null = null;

  constructor(token?: string) {
    this.token = token || null;
    this. client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Response interceptor - daha detaylı log
    this.client.interceptors.response.use(
      (response) => response,
      (error:  AxiosError) => {
        const url = error.config?.url || 'unknown';
        const method = error. config?.method?. toUpperCase() || 'unknown';
        const status = error.response?. status || 'no response';
        const message = (error.response?.data as any)?.message || error.message;
        
        logger. debug(`API Error [${status}] ${method} ${url}: ${message}`);
        return Promise.reject(error);
      }
    );
  }

  setToken(token: string): void {
    this.token = token;
  }

  private getAuthHeaders(): Record<string, string> {
    if (! this.token) return {};
    return { Authorization: `Bearer ${this.token}` };
  }

  // ============ AUTH ============

  async register(data: {
    username: string;
    email:  string;
    password: string;
    role: string;
    meta:  Record<string, string>;
  }): Promise<ApiResponse<RegisterResponse>> {
    try {
      const response = await this.client.post('/rejimde/v1/auth/register', data);
      return response.data;
    } catch (error: any) {
      return {
        status:  'error',
        message: error. response?.data?.message || error.message,
      };
    }
  }

  async login(username: string, password:  string): Promise<ApiResponse<LoginResponse>> {
    try {
      const response = await this.client. post('/rejimde/v1/auth/login', {
        username,
        password,
      });
      
      if (response.data. status === 'success' && response.data. data?. token) {
        this.token = response.data.data. token;
      }
      
      return response.data;
    } catch (error: any) {
      return {
        status: 'error',
        message: error.response?. data?.message || error.message,
      };
    }
  }

  // ============ EVENTS / GAMIFICATION ============

  async dispatchEvent(
    eventType: string,
    entityType?:  string | null,
    entityId?: number | null,
    context?: Record<string, any>
  ): Promise<ApiResponse<EventDispatchResponse>> {
    try {
      const response = await this.client.post(
        '/rejimde/v1/events/dispatch',
        {
          event_type: eventType,
          entity_type: entityType,
          entity_id: entityId,
          context,
        },
        { headers: this. getAuthHeaders() }
      );
      return response.data;
    } catch (error: any) {
      return {
        status: 'error',
        message: error.response?. data?.message || error.message,
      };
    }
  }

  // ============ BLOGS ============

  async getBlogs(options?: { limit?: number; offset?: number }): Promise<BlogPost[]> {
    try {
      const params = new URLSearchParams();
      if (options?.limit) params.append('per_page', String(options.limit));
      if (options?.offset) params.append('offset', String(options.offset));
      params.append('_embed', 'true');

      const response = await this.client. get(`/wp/v2/posts?${params.toString()}`);
      
      return response.data.map((post: any) => ({
        id:  post.id,
        title: post. title?. rendered || post.title,
        slug: post.slug,
        excerpt: (post.excerpt?.rendered || '').replace(/<[^>]+>/g, ''),
        content: post.content?.rendered,
        is_sticky: post.sticky || false,
        author_id: post.author,
      }));
    } catch (error) {
      logger.debug('Blog listesi alınamadı');
      return [];
    }
  }

  async getBlog(id: number): Promise<BlogPost | null> {
    try {
      const response = await this. client.get(`/wp/v2/posts/${id}`);
      const post = response.data;
      return {
        id:  post.id,
        title: post. title?.rendered || post.title,
        slug: post.slug,
        excerpt:  (post.excerpt?. rendered || '').replace(/<[^>]+>/g, ''),
        content: post.content?.rendered,
        is_sticky: post.sticky || false,
        author_id: post.author,
      };
    } catch (error) {
      return null;
    }
  }

  async claimBlogReward(blogId: number): Promise<ApiResponse> {
    try {
      const response = await this.client. post(
        `/rejimde/v1/progress/blog/${blogId}/claim`,
        {},
        { headers:  this.getAuthHeaders() }
      );
      return response. data;
    } catch (error: any) {
      return {
        status:  'error',
        message: error. response?.data?.message || error.message,
      };
    }
  }

  // ============ DIETS ============

  async getDiets(options?: { limit?: number }): Promise<DietPlan[]> {
    try {
      const params = new URLSearchParams();
      if (options?. limit) params.append('limit', String(options. limit));

      const response = await this. client.get(`/rejimde/v1/plans?${params.toString()}`);
      const data = response.data. data || response.data;
      
      return Array.isArray(data) ? data : [];
    } catch (error) {
      logger.debug('Diyet listesi alınamadı');
      return [];
    }
  }

  async startDiet(dietId:  number): Promise<ApiResponse> {
    try {
      const response = await this. client.post(
        `/rejimde/v1/progress/diet/${dietId}/start`,
        {},
        { headers: this.getAuthHeaders() }
      );
      return response.data;
    } catch (error: any) {
      return {
        status: 'error',
        message:  error.response?.data?.message || error. message,
      };
    }
  }

  async completeDiet(dietId: number): Promise<ApiResponse> {
    try {
      const response = await this.client.post(
        `/rejimde/v1/progress/diet/${dietId}/complete`,
        {},
        { headers: this.getAuthHeaders() }
      );
      return response.data;
    } catch (error: any) {
      return {
        status: 'error',
        message:  error.response?.data?.message || error. message,
      };
    }
  }

  // Eski metodlar - yeni endpoint'lere yönlendir
  async startPlan(planId:  number): Promise<ApiResponse> {
    return this.startDiet(planId);
  }

  async completePlan(planId: number): Promise<ApiResponse> {
    return this.completeDiet(planId);
  }

  // ============ EXERCISES ============

  async getExercises(options?: { limit?:  number }): Promise<ExercisePlan[]> {
    try {
      const params = new URLSearchParams();
      if (options?.limit) params.append('limit', String(options. limit));

      const response = await this. client.get(`/rejimde/v1/exercises?${params.toString()}`);
      const data = response. data.data || response.data;
      
      return Array. isArray(data) ? data : [];
    } catch (error) {
      logger.debug('Egzersiz listesi alınamadı');
      return [];
    }
  }

  async startExerciseProgress(exerciseId: number): Promise<ApiResponse> {
    try {
      const response = await this.client.post(
        `/rejimde/v1/progress/exercise/${exerciseId}/start`,
        {},
        { headers: this.getAuthHeaders() }
      );
      return response.data;
    } catch (error:  any) {
      return {
        status: 'error',
        message: error.response?.data?. message || error.message,
      };
    }
  }

  async completeExerciseProgress(exerciseId: number): Promise<ApiResponse> {
    try {
      const response = await this.client.post(
        `/rejimde/v1/progress/exercise/${exerciseId}/complete`,
        {},
        { headers: this.getAuthHeaders() }
      );
      return response.data;
    } catch (error:  any) {
      return {
        status: 'error',
        message: error.response?.data?. message || error.message,
      };
    }
  }

  // Eski metodlar - yeni endpoint'lere yönlendir
  async startExercise(exerciseId: number): Promise<ApiResponse> {
    return this. startExerciseProgress(exerciseId);
  }

  async completeExercise(exerciseId: number): Promise<ApiResponse> {
    return this.completeExerciseProgress(exerciseId);
  }

  // ============ COMMENTS ============

  async getComments(postId: number): Promise<Comment[]> {
    try {
      const response = await this.client. get(`/rejimde/v1/comments? post=${postId}`);
      const data = response.data. comments || response.data. data || response.data;
      return Array.isArray(data) ? data : [];
    } catch (error) {
      return [];
    }
  }

  async createComment(data: {
    post:  number;
    content: string;
    parent?: number;
    rating?: number;
    context?: string;
  }): Promise<ApiResponse> {
    try {
      const response = await this.client. post(
        '/rejimde/v1/comments',
        data,
        { headers: this. getAuthHeaders() }
      );
      return response.data;
    } catch (error: any) {
      return {
        status: 'error',
        message: error.response?. data?.message || error.message,
      };
    }
  }

  async likeComment(commentId: number): Promise<ApiResponse> {
    try {
      const response = await this.client.post(
        `/rejimde/v1/comments/${commentId}/like`,
        {},
        { headers:  this.getAuthHeaders() }
      );
      return response. data;
    } catch (error: any) {
      return {
        status:  'error',
        message: error. response?.data?.message || error.message,
      };
    }
  }

  // ============ SOCIAL ============

  async followUser(userId: number): Promise<ApiResponse> {
    try {
      const response = await this.client. post(
        `/rejimde/v1/profile/${userId}/follow`,
        {},
        { headers: this.getAuthHeaders() }
      );
      return response.data;
    } catch (error: any) {
      return {
        status: 'error',
        message:  error.response?.data?.message || error. message,
      };
    }
  }

  async sendHighFive(userId: number): Promise<ApiResponse> {
    try {
      const response = await this.client. post(
        `/rejimde/v1/profile/${userId}/high-five`,
        {},
        { headers: this. getAuthHeaders() }
      );
      return response.data;
    } catch (error: any) {
      return {
        status: 'error',
        message: error.response?. data?.message || error.message,
      };
    }
  }

  async getLeaderboard(options?:  { limit?: number }): Promise<LeaderboardUser[]> {
    try {
      const params = new URLSearchParams();
      if (options?. limit) params.append('limit', String(options.limit));

      const response = await this.client.get(`/rejimde/v1/gamification/leaderboard?${params.toString()}`);
      const data = response. data.data || response.data;
      return Array.isArray(data) ? data : [];
    } catch (error) {
      return [];
    }
  }

  // ============ CIRCLES ============

  async getCircles(options?: { limit?: number }): Promise<Circle[]> {
    try {
      const params = new URLSearchParams();
      if (options?.limit) params.append('limit', String(options. limit));

      const response = await this. client.get(`/rejimde/v1/circles?${params.toString()}`);
      const data = response.data. data || response.data;
      return Array.isArray(data) ? data : [];
    } catch (error) {
      return [];
    }
  }

  async joinCircle(circleId: number): Promise<ApiResponse> {
    try {
      const response = await this.client.post(
        `/rejimde/v1/circles/${circleId}/join`,
        {},
        { headers: this.getAuthHeaders() }
      );
      return response.data;
    } catch (error: any) {
      return {
        status: 'error',
        message:  error.response?.data?.message || error. message,
      };
    }
  }

  // ============ EXPERTS ============

  async getExperts(options?: { limit?: number }): Promise<Expert[]> {
    try {
      const params = new URLSearchParams();
      if (options?.limit) params.append('limit', String(options. limit));

      const response = await this. client.get(`/rejimde/v1/professionals?${params.toString()}`);
      const data = response.data. data || response.data;
      return Array.isArray(data) ? data : [];
    } catch (error) {
      return [];
    }
  }

  async trackProfileView(expertSlug: string, sessionId: string): Promise<ApiResponse> {
    try {
      const response = await this.client.post('/rejimde/v1/profile-views/track', {
        expert_slug:  expertSlug,
        session_id:  sessionId,
      });
      return response.data;
    } catch (error:  any) {
      return {
        status: 'error',
        message: error.response?.data?. message || error.message,
      };
    }
  }

  // ============ ADMIN ============

  async toggleAllBots(active: boolean): Promise<ApiResponse> {
    try {
      const response = await this.client.post(
        '/rejimde/v1/admin/bots/toggle-all',
        { active },
        { headers: this. getAuthHeaders() }
      );
      return response.data;
    } catch (error: any) {
      return {
        status: 'error',
        message: error.response?. data?.message || error.message,
      };
    }
  }
}

export const apiClient = new RejimdeAPIClient();