import { Bot, BotState } from '../types/bot.types';
import { ApiService } from '../services/api.service';
import { Database } from '../database/sqlite';
import { OpenAIService } from '../services/openai.service';
import { PERSONAS } from '../config/personas.config';
import { logger } from '../utils/logger';
import { shouldPerformAction, pickRandom, delay } from '../utils/random';

export async function performBlogActivities(
  bot: Bot,
  state: BotState,
  api: ApiService,
  db: Database,
  openai?:  OpenAIService
): Promise<void> {
  const persona = PERSONAS[bot.persona];
  if (! persona) return;
  
  // Blog okuma
  if (shouldPerformAction(persona. behaviors.blogReading)) {
    await readBlog(bot, state, api, db);
  }
  
  // Blog yorumlama (AI destekli persona'lar için)
  if (persona.aiEnabled && openai && shouldPerformAction(persona.behaviors.blogCommenting)) {
    await commentOnBlog(bot, state, api, db, openai);
  }
  
  // Yorum beğenme
  if (shouldPerformAction(persona.behaviors.likeComments)) {
    await likeRandomComment(bot, api, db);
  }
  
  // Yorumlara cevap (AI)
  if (persona.aiEnabled && openai && shouldPerformAction(persona.behaviors.replyToComments)) {
    await replyToComment(bot, state, api, db, openai);
  }
}

async function readBlog(bot: Bot, state:  BotState, api: ApiService, db: Database): Promise<void> {
  try {
    // Rastgele blog seç (henüz okumadığımız)
    const blogs = await api.getBlogs({ limit: 50 });
    const unreadBlogs = blogs.filter(b => !state.readBlogs.includes(b.id));
    
    if (unreadBlogs.length === 0) {
      logger.debug(`[${bot.username}] Tüm bloglar okunmuş`);
      return;
    }
    
    const blog = pickRandom(unreadBlogs);
    
    // Blog okuma point'i claim et
    const result = await api.dispatchEvent(bot.token, 'blog_points_claimed', 'blog', blog.id, {
      is_sticky: blog.is_sticky || false
    });
    
    if (result.success) {
      state.readBlogs. push(blog.id);
      db.updateBotState(bot.id, state);
      db.logActivity(bot.id, 'blog_read', 'blog', blog. id, true);
      logger.success(`[${bot.username}] Blog okundu: "${blog.title. substring(0, 30)}..."`);
    }
  } catch (error:  any) {
    logger.error(`[${bot.username}] Blog okuma hatası: ${error. message}`);
  }
}

async function commentOnBlog(
  bot: Bot,
  state: BotState,
  api: ApiService,
  db: Database,
  openai:  OpenAIService
): Promise<void> {
  try {
    // Okuduğumuz ama yorum yapmadığımız bloglar
    const uncommentedBlogs = state.readBlogs. filter(id => !state.commentedPosts.includes(id));
    
    if (uncommentedBlogs.length === 0) return;
    
    const blogId = pickRandom(uncommentedBlogs);
    const blog = await api. getBlog(blogId);
    
    // AI ile yorum üret
    const comment = await openai. generateBlogComment(blog. title, blog.excerpt);
    
    // Yorum yap
    const result = await api.createComment(bot.token, {
      post:  blogId,
      content: comment,
      context: 'blog'
    });
    
    if (result.success) {
      state.commentedPosts.push(blogId);
      db.updateBotState(bot.id, state);
      db.logActivity(bot.id, 'blog_comment', 'blog', blogId, true);
      logger.success(`[${bot.username}] Blog yorumu: "${comment.substring(0, 50)}..."`);
    }
  } catch (error: any) {
    logger.error(`[${bot.username}] Yorum hatası: ${error. message}`);
  }
}

async function likeRandomComment(bot: Bot, api:  ApiService, db:  Database): Promise<void> {
  try {
    // Rastgele post seç ve yorumları al
    const blogs = await api.getBlogs({ limit:  20 });
    const blog = pickRandom(blogs);
    const comments = await api. getComments(blog.id);
    
    if (comments.length === 0) return;
    
    // Kendi yorumumuz değilse beğen
    const otherComments = comments.filter(c => c.author_id !== bot.wpUserId);
    if (otherComments.length === 0) return;
    
    const comment = pickRandom(otherComments);
    const result = await api. likeComment(bot. token, comment.id);
    
    if (result.success) {
      db.logActivity(bot.id, 'comment_like', 'comment', comment.id, true);
      logger.debug(`[${bot.username}] Yorum beğenildi`);
    }
  } catch (error: any) {
    logger.debug(`[${bot.username}] Beğeni hatası: ${error. message}`);
  }
}

async function replyToComment(
  bot:  Bot,
  state: BotState,
  api: ApiService,
  db: Database,
  openai: OpenAIService
): Promise<void> {
  try {
    // Rastgele blog seç
    const blogs = await api.getBlogs({ limit: 10 });
    const blog = pickRandom(blogs);
    const comments = await api. getComments(blog.id);
    
    // Kendi yorumumuz olmayan, henüz cevap verilmemiş yorumlar
    const replyable = comments.filter(c => 
      c.author_id !== bot. wpUserId && 
      c.reply_count === 0
    );
    
    if (replyable.length === 0) return;
    
    const parentComment = pickRandom(replyable);
    
    // AI ile cevap üret
    const reply = await openai. generateCommentReply(parentComment.content, blog.title);
    
    const result = await api. createComment(bot. token, {
      post: blog.id,
      content:  reply,
      parent: parentComment.id,
      context:  'blog'
    });
    
    if (result.success) {
      db.logActivity(bot.id, 'comment_reply', 'comment', parentComment.id, true);
      logger.success(`[${bot.username}] Yoruma cevap: "${reply.substring(0, 50)}..."`);
    }
  } catch (error: any) {
    logger.error(`[${bot.username}] Cevap hatası: ${error. message}`);
  }
}