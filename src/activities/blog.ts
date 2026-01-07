import { LocalBot, BotState, BlogPost, Comment } from '../types';
import { RejimdeAPIClient } from '../utils/api-client';
import { botDb } from '../database/bot-db';
import { OpenAIService } from '../services/openai.service';
import { PERSONA_CONFIGS, PersonaConfig } from '../config/personas.config';
import { logger } from '../utils/logger';
import { shouldPerform, pickRandom } from '../utils/random';
import { PersonaType } from '../types';

const ROOT_COMMENT_PARENT_ID = 0;

export async function performBlogActivities(
  bot: LocalBot,
  state: BotState,
  client: RejimdeAPIClient,
  persona: PersonaConfig,
  openai?:  OpenAIService
): Promise<void> {
  if (!persona) return;
  
  // Blog okuma
  if (shouldPerform(persona.behaviors. blogReading)) {
    await readBlog(bot, state, client);
  }
  
  // Blog yorumlama (AI destekli persona'lar için)
  if (persona.aiEnabled && openai && shouldPerform(persona.behaviors.blogCommenting)) {
    await commentOnBlog(bot, state, client, openai);
  }
  
  // Yorum beğenme
  if (shouldPerform(persona.behaviors.likeComments)) {
    await likeRandomComment(bot, state, client);
  }
  
  // Yorumlara cevap (AI)
  if (persona.aiEnabled && openai && shouldPerform(persona.behaviors. replyToComments)) {
    await replyToComment(bot, state, client, openai);
  }
}

async function readBlog(
  bot: LocalBot,
  state: BotState,
  client: RejimdeAPIClient
): Promise<void> {
  try {
    const blogs = await client.getBlogs({ limit: 50 });
    const unreadBlogs = blogs.filter((b: BlogPost) => !state.read_blogs.includes(b.id));
    
    if (unreadBlogs.length === 0) {
      logger.debug(`[${bot.username}] Tüm bloglar okunmuş`);
      return;
    }
    
    const blog = pickRandom(unreadBlogs);
    
    // Progress endpoint kullan - bu readers listesine ekler
    const result = await client.claimBlogReward(blog. id);
    
    if (result. status === 'success') {
      state.read_blogs. push(blog.id);
      botDb.updateState(bot.id, { read_blogs: state.read_blogs });
      botDb.logActivity(bot.id, 'blog_read', 'blog', blog.id, true);
      logger.bot(bot.username, `Blog okundu: "${blog.title. substring(0, 30)}..."`);
    } else {
      // Zaten okunmuş olabilir - yine de state'e ekle
      if (result.message?. includes('already') || result.message?. includes('zaten')) {
        state.read_blogs.push(blog. id);
        botDb.updateState(bot.id, { read_blogs: state.read_blogs });
        logger.debug(`[${bot.username}] Blog zaten okunmuş:  ${blog.id}`);
      }
    }
  } catch (error:  any) {
    logger.debug(`[${bot.username}] Blog okuma hatası: ${error. message}`);
  }
}

async function commentOnBlog(
  bot: LocalBot,
  state:  BotState,
  client: RejimdeAPIClient,
  openai: OpenAIService
): Promise<void> {
  try {
    // Zaten yorum yapılmış blogları filtrele
    const uncommentedBlogs = state.read_blogs.filter(id => !state.commented_posts.includes(id));
    
    if (uncommentedBlogs.length === 0) {
      logger.debug(`[${bot.username}] Yorum yapılacak blog kalmadı`);
      return;
    }
    
    const blogId = pickRandom(uncommentedBlogs);
    const blog = await client.getBlog(blogId);
    
    if (!blog) return;
    
    const commentText = await openai.generateBlogComment(blog.title, blog.excerpt);
    
    const result = await client.createComment({
      post: blogId,
      content: commentText,
      context: 'blog'
    });
    
    if (result.status === 'success') {
      state.commented_posts.push(blogId);
      botDb.updateState(bot.id, { commented_posts: state.commented_posts });
      botDb.logActivity(bot.id, 'blog_comment', 'blog', blogId, true);
      logger.bot(bot.username, `Blog yorumu: "${commentText.substring(0, 50)}..."`);
    } else if (result.message?.includes('zaten değerlendirdiniz') || result.message?.includes('already')) {
      // 409 - Zaten yorum yapılmış, state'e ekle
      if (!state.commented_posts.includes(blogId)) {
        state.commented_posts.push(blogId);
        botDb.updateState(bot.id, { commented_posts: state.commented_posts });
      }
      logger.debug(`[${bot.username}] Blog zaten yorumlanmış: ${blogId}`);
    } else {
      logger.debug(`[${bot.username}] Yorum hatası: ${result.message}`);
    }
  } catch (error: any) {
    logger.debug(`[${bot.username}] Yorum hatası: ${error.message}`);
  }
}

async function likeRandomComment(
  bot:  LocalBot,
  state: BotState,
  client:  RejimdeAPIClient
): Promise<void> {
  try {
    const blogs = await client.getBlogs({ limit:  20 });
    if (blogs.length === 0) return;
    
    const blog = pickRandom(blogs);
    const comments = await client.getComments(blog.id);
    
    if (comments.length === 0) return;
    
    // Beğenmediğimiz yorumları filtrele
    const unliked = comments.filter((c: Comment) => !state.liked_comments.includes(c.id));
    if (unliked.length === 0) return;
    
    const comment = pickRandom(unliked);
    const result = await client. likeComment(comment.id);
    
    if (result.status === 'success') {
      state.liked_comments.push(comment. id);
      botDb.updateState(bot.id, { liked_comments: state.liked_comments });
      botDb. logActivity(bot. id, 'comment_like', 'comment', comment.id, true);
      logger.debug(`[${bot.username}] Yorum beğenildi`);
    }
  } catch (error: any) {
    logger.debug(`[${bot.username}] Beğeni hatası: ${error.message}`);
  }
}

async function replyToComment(
  bot: LocalBot,
  state: BotState,
  client: RejimdeAPIClient,
  openai: OpenAIService
): Promise<void> {
  try {
    const blogs = await client.getBlogs({ limit:  10 });
    if (blogs.length === 0) return;
    
    const blog = pickRandom(blogs);
    const comments = await client.getComments(blog.id);
    
    // Henüz cevap verilmemiş yorumlar
    const replyable = comments.filter((c: Comment) => 
      !state.replied_comments.includes(c.id) &&
      c.parent === ROOT_COMMENT_PARENT_ID // Ana yorumlar
    );
    
    if (replyable.length === 0) return;
    
    const parentComment = pickRandom(replyable);
    
    // Thread context: Önceki cevapları al
    const previousReplies = comments
      .filter((c: Comment) => c.parent === parentComment.id)
      .map((c: Comment) => c.content);
    
    const reply = await openai.generateCommentReply(
      parentComment.content,
      previousReplies,
      blog.title
    );
    
    const result = await client.createComment({
      post:  blog.id,
      content: reply,
      parent: parentComment.id,
      context:  'blog'
    });
    
    if (result.status === 'success') {
      state.replied_comments.push(parentComment.id);
      botDb.updateState(bot.id, { replied_comments: state.replied_comments });
      botDb.logActivity(bot.id, 'comment_reply', 'comment', parentComment.id, true);
      logger.bot(bot.username, `Yoruma cevap: "${reply.substring(0, 50)}..."`);
    }
  } catch (error: any) {
    logger.debug(`[${bot.username}] Cevap hatası: ${error. message}`);
  }
}