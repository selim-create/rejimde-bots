import OpenAI from 'openai';
import { logger } from '../utils/logger';

const FALLBACK_BLOG_COMMENTS = [
  'Çok faydalı bir yazı olmuş, teşekkürler!  👏',
  'Bu bilgileri arıyordum, harika paylaşım! ',
  'Gerçekten aydınlatıcı bir içerik 🙏',
  'Çok güzel özetlemişsiniz, emeğinize sağlık.',
  'Bu konuda tam da böyle bir yazıya ihtiyacım vardı.',
  'Paylaşım için teşekkürler, çok işime yaradı!',
  'Süper bir yazı, kaydettim 📌',
  'Bu bilgiler gerçekten çok değerli, teşekkürler.',
];

const FALLBACK_COMMENT_REPLIES = [
  'Kesinlikle katılıyorum!  👍',
  'Çok doğru söylüyorsunuz.',
  'Ben de aynı şeyi düşünüyorum.',
  'Güzel bir bakış açısı, teşekkürler! ',
  'Evet, bence de öyle.',
];

export class OpenAIService {
  private client: OpenAI | null = null;
  private isAvailable:  boolean = false;

  constructor() {
    const apiKey = process. env.OPENAI_API_KEY;
    if (apiKey && apiKey.startsWith('sk-')) {
      try {
        this. client = new OpenAI({ apiKey });
        this.isAvailable = true;
        logger.debug('OpenAI servisi başlatıldı');
      } catch (error) {
        logger.warn('OpenAI servisi başlatılamadı');
      }
    } else {
      logger.warn('⚠️ OpenAI API key bulunamadı.  Fallback yorumlar kullanılacak.');
    }
  }

  async generateBlogComment(blogTitle: string, excerpt: string): Promise<string> {
    if (!this.isAvailable || !this.client) {
      return this.pickFallback(FALLBACK_BLOG_COMMENTS);
    }

    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role:  'system',
            content: `Sen bir sağlık ve fitness blogu okuyucususun. Türkçe yorum yazıyorsun. 
Kurallar:
- Yorumlar 1-3 cümle olmalı
- Samimi ve pozitif ol
- Blog konusuyla ilgili kısa bir düşünce paylaş
- Emoji kullanabilirsin (1-2 tane)
- Soru sorma, sadece düşünceni paylaş`
          },
          {
            role:  'user',
            content: `Blog başlığı: "${blogTitle}"
Özet: ${excerpt. substring(0, 300)}...

Bu blog için kısa bir yorum yaz. `
          }
        ],
        max_tokens: 150,
        temperature: 0.8,
      });

      return response.choices[0]?.message?.content?. trim() || this.pickFallback(FALLBACK_BLOG_COMMENTS);
    } catch (error:  any) {
      logger.debug(`OpenAI hatası: ${error. message}`);
      return this.pickFallback(FALLBACK_BLOG_COMMENTS);
    }
  }

  async generateCommentReply(originalComment: string, context?:  string): Promise<string> {
    if (!this.isAvailable || !this. client) {
      return this.pickFallback(FALLBACK_COMMENT_REPLIES);
    }

    try {
      const response = await this.client. chat.completions. create({
        model: 'gpt-4o-mini',
        messages:  [
          {
            role: 'system',
            content: `Sen bir sağlık ve fitness topluluğu üyesisin. Türkçe cevap yazıyorsun. 
Kurallar:
- Cevaplar 1-2 cümle olmalı
- Samimi ve destekleyici ol
- Emoji kullanabilirsin (1 tane)`
          },
          {
            role:  'user',
            content: `Orijinal yorum: "${originalComment}"
${context ? `Bağlam: ${context}` : ''}

Bu yoruma kısa bir cevap yaz.`
          }
        ],
        max_tokens: 100,
        temperature:  0.8,
      });

      return response.choices[0]?.message?.content?.trim() || this.pickFallback(FALLBACK_COMMENT_REPLIES);
    } catch (error:  any) {
      logger.debug(`OpenAI hatası:  ${error.message}`);
      return this.pickFallback(FALLBACK_COMMENT_REPLIES);
    }
  }

  private pickFallback(list: string[]): string {
    return list[Math.floor(Math.random() * list.length)];
  }
}