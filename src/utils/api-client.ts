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

const API_BASE_URL = process.env.REJIMDE_API_URL || 'https://api.rejimde.com/wp-json';

export class RejimdeAPIClient {
  private client: AxiosInstance;
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

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error:  AxiosError) => {
        logger.debug(`API Error: ${error.message}`);
        return Promise.reject(error);
      }
    );
  }

  setToken(token: string): void {
    this.token = token;
  }

  private getAuthHeaders(): Record<string, string> {
    if (!this.token) return {};
    return { Authorization: `Bearer ${this.token}` };
  }

  // ============ AUTH ============

  async register(data: {
    username: string;
    email: string;
    password: string;
    role: string;
    meta:  Record<string, string>;
  }): Promise<ApiResponse<RegisterResponse>> {
    try {
      const response = await this.client.post('/rejimde/v1/auth/register', data);
      return response. data;
    } catch (error:  any) {
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
      
      if (response. data.status === 'success' && response.data. data?. token) {
        this.token = response.data. data.token;
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

  // ============ BLOGS ============

  async getBlogs(options?:  { limit?: number; offset?: number }): Promise<BlogPost[]> {
    try {
      const params = new URLSearchParams();
      if (options?.limit) params.append('per_page', String(options.limit));
      if (options?.offset) params.append('offset', String(options. offset));
      params.append('_embed', 'true');

      const response = await this.client.get(`/wp/v2/posts?${params. toString()}`);
      
      return response.data.map((post: any) => ({
        id:  post.id,
        title: post. title?. rendered || post.title,
        slug: post. slug,
        excerpt: (post.excerpt?.rendered || '').replace(/<[^>]+>/g, ''),
        content: post.content?.rendered,
        is_sticky: post.sticky || false,
        author_id: post. author,
      }));
    } catch (error) {
      logger.debug('Blog listesi alınamadı');
      return [];
    }
  }

  async getBlog(id: number): Promise<BlogPost | null> {
    try {
      const response = await this.client.get(`/wp/v2/posts/${id}`);
      const post = response.data;
      return {
        id: post.id,
        title: post.title?.rendered || post. title,
        slug: post.slug,
        excerpt: (post.excerpt?.rendered || '').replace(/<[^>]+>/g, ''),
        content: post.content?.rendered,
        is_sticky: post.sticky || false,
        author_id: post. author,
      };
    } catch (error) {
      return null;
    }
  }

  // ============ DIETS & EXERCISES ============

  async getDiets(options?: { limit?: number }): Promise<DietPlan[]> {
    try {
      const params = new URLSearchParams();
      if (options?.limit) params.append('limit', String(options. limit));

      const response = await this.client.get(`/rejimde/v1/plans? ${params.toString()}`);
      const data = response.data. data || response.data;
      
      return Array.isArray(data) ? data : [];
    } catch (error) {
      logger.debug('Diyet listesi alınamadı');
      return [];
    }
  }

  async getExercises(options?: { limit?: number }): Promise<ExercisePlan[]> {
    try {
      const params = new URLSearchParams();
      if (options?. limit) params.append('limit', String(options.limit));

      const response = await this.client.get(`/rejimde/v1/exercises?${params.toString()}`);
      const data = response. data.data || response.data;
      
      return Array. isArray(data) ? data : [];
    } catch (error) {
      logger.debug('Egzersiz listesi alınamadı');
      return [];
    }
  }

  async startPlan(planId:  number): Promise<ApiResponse> {
    try {
      const response = await this.client. post(
        `/rejimde/v1/plans/start/${planId}`,
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

  async completePlan(planId: number): Promise<ApiResponse> {
    try {
      const response = await this.client.post(
        `/rejimde/v1/plans/complete/${planId}`,
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

  async startExercise(exerciseId: number): Promise<ApiResponse> {
    try {
      const response = await this.client. post(
        `/rejimde/v1/exercises/start/${exerciseId}`,
        {},
        { headers: this.getAuthHeaders() }
      );
      return response.data;
    } catch (error: any) {
      return {
        status: 'error',
        message: error.response?.data?.message || error.message,
      };
    }
  }

  async completeExercise(exerciseId:  number): Promise<ApiResponse> {
    try {
      const response = await this. client.post(
        `/rejimde/v1/exercises/complete/${exerciseId}`,
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
    context?: string;
    parent?: number;
    rating?: number;
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

  // ============ SOCIAL ============

  async followUser(userId: number): Promise<ApiResponse> {
    try {
      const response = await this.client.post(
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
      const response = await this.client.post(
        `/rejimde/v1/profile/${userId}/high-five`,
        {},
        { headers: this.getAuthHeaders() }
      );
      return response.data;
    } catch (error: any) {
      return {
        status: 'error',
        message: error.response?.data?.message || error.message,
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
      if (options?.limit) params.append('limit', String(options.limit));

      const response = await this.client. get(`/rejimde/v1/professionals?${params.toString()}`);
      const data = response. data.data || response.data;
      return Array.isArray(data) ? data : [];
    } catch (error) {
      return [];
    }
  }

  async trackProfileView(expertSlug: string, sessionId: string): Promise<ApiResponse> {
    try {
      const response = await this.client.post('/rejimde/v1/profile-views/track', {
        expert_slug: expertSlug,
        session_id: sessionId,
      });
      return response. data;
    } catch (error: any) {
      return {
        status:  'error',
        message: error. response?.data?.message || error.message,
      };
    }
  }

  // ============ ADMIN (for bot management) ============

  async getBotStats(): Promise<ApiResponse> {
    try {
      const response = await this.client. get(
        '/rejimde/v1/admin/bots/stats',
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

  async toggleAllBots(active: boolean): Promise<ApiResponse> {
    try {
      const response = await this.client.post(
        '/rejimde/v1/admin/bots/toggle-all',
        { active },
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
}

// Default export singleton
export const apiClient = new RejimdeAPIClient();