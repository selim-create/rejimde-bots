import OpenAI from 'openai';
import { logger } from '../utils/logger';
import { PersonaConfig } from '../config/personas.config';
import { WritingStyle, WRITING_STYLE_PROMPTS } from '../config/writing-styles.config';
import { CommentType, COMMENT_TYPE_PROMPTS, CONTENT_TYPE_COMMENT_MAPPING } from '../config/comment-prompts.config';

// Fallback yorumlar - daha fazla varyasyon
const FALLBACK_BLOG_COMMENTS = [
  'Çok faydalı bir yazı olmuş, teşekkürler!  👏',
  'Bu bilgileri arıyordum, harika paylaşım! ',
  'Gerçekten aydınlatıcı bir içerik 🙏',
  'Çok güzel özetlemişsiniz, emeğinize sağlık.',
  'Bu konuda tam da böyle bir yazıya ihtiyacım vardı.',
  'Paylaşım için teşekkürler, çok işime yaradı!',
  'Süper bir yazı, kaydettim 📌',
  'Bu bilgiler gerçekten çok değerli.',
  'Harika içerik, teşekkürler.',
  'Çok bilgilendirici olmuş.',
  'Bunu bekliyordum, elinize sağlık!',
  'Net ve anlaşılır anlatım, tebrikler.',
];

const FALLBACK_COMMENT_REPLIES = [
  'Kesinlikle katılıyorum!  👍',
  'Çok doğru söylüyorsunuz.',
  'Ben de aynı şeyi düşünüyorum.',
  'Güzel bir bakış açısı, teşekkürler!',
  'Evet, bence de öyle.',
  'Aynen, ben de öyle düşünüyorum.',
  'Haklısınız.',
  'Doğru tespit!',
];

const FALLBACK_DIET_COMMENTS = [
  'Bu diyeti denedim, gerçekten işe yarıyor!  💪',
  'Tarifler çok lezzetli ve doyurucu.',
  'Kolay uygulanabilir bir program, tavsiye ederim.',
  'İlk haftada fark görmeye başladım!',
  'Çok dengeli bir program, memnunum.',
  'Pratik ve uygulanabilir, teşekkürler.',
  'Sonuçlardan memnunum.',
  'Herkese tavsiye ederim.',
];

const FALLBACK_EXERCISE_COMMENTS = [
  'Harika bir antrenman programı!  🔥',
  'Bu egzersizler gerçekten etkili.',
  'Başlangıç seviyesi için ideal.',
  'Düzenli yapınca sonuçları görmek mümkün.',
  'Evde yapılabilir olması büyük avantaj!',
  'Çok iyi bir program, teşekkürler.',
  'Tam aradığım şeydi!',
  'Etkili ve pratik.',
];

// Yardımcı fonksiyon
function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

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

  private getEmojiInstruction(frequency: 'none' | 'low' | 'medium' | 'high'): string {
    switch (frequency) {
      case 'none': return 'Emoji KULLANMA.';
      case 'low': return 'Emoji kullanma veya en fazla 1 tane kullan.';
      case 'medium': return '1-2 emoji kullanabilirsin.';
      case 'high': return '2-3 emoji kullanabilirsin 🎉💪';
      default: return '1 emoji kullanabilirsin.';
    }
  }

  async generateBlogComment(
    blogTitle: string, 
    excerpt: string,
    persona?: PersonaConfig
  ): Promise<string> {
    if (!this.isAvailable || !this.client) {
      return this.pickFallback(FALLBACK_BLOG_COMMENTS);
    }

    try {
      // Persona varsa stil ve tip seç, yoksa default
      const writingStyle = persona 
        ? pickRandom(persona.writingStyles) 
        : 'casual' as WritingStyle;
      
      const availableTypes = CONTENT_TYPE_COMMENT_MAPPING['blog'];
      const preferredTypes = persona?.preferredCommentTypes || availableTypes;
      const validTypes = preferredTypes.filter(t => availableTypes.includes(t));
      const commentType = pickRandom(validTypes.length > 0 ? validTypes : availableTypes);
      
      const emojiInstruction = persona 
        ? this.getEmojiInstruction(persona.emojiFrequency)
        : '1-2 emoji kullanabilirsin.';

      const systemPrompt = `Sen bir sağlık ve fitness blogu okuyucususun. Türkçe yorum yazıyorsun.

## YAZIM STİLİN:
${WRITING_STYLE_PROMPTS[writingStyle]}

## YORUM TİPİN:
${COMMENT_TYPE_PROMPTS[commentType]}

## GENEL KURALLAR:
- 1-3 cümle yaz (kısa ve öz)
- İçerikle ALAKALI ol, genel geçer yorum yazma
- Doğal ve gerçek bir insan gibi yaz
- ${emojiInstruction}
- Soru SORMA
- "Harika yazı", "Süper içerik" gibi GENEL ifadelerden KAÇIN
- İçerikteki SPECIFIC bir noktaya değin`;

      const userPrompt = `Blog: "${blogTitle}"
İçerik özeti: ${excerpt.substring(0, 400)}

Bu blog için doğal bir yorum yaz.`;

      const response = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 150,
        temperature: 0.9,
      });

      const comment = response.choices[0]?.message?.content?.trim();
      return comment || this.pickFallback(FALLBACK_BLOG_COMMENTS);

    } catch (error: any) {
      logger.debug(`OpenAI hatası: ${error.message}`);
      return this.pickFallback(FALLBACK_BLOG_COMMENTS);
    }
  }

  async generateCommentReply(
    originalComment: string, 
    previousReplies: string[] = [],
    blogTitle?: string,
    persona?: PersonaConfig
  ): Promise<string> {
    if (!this.isAvailable || !this. client) {
      return this.pickFallback(FALLBACK_COMMENT_REPLIES);
    }

    try {
      const writingStyle = persona 
        ? pickRandom(persona.writingStyles) 
        : 'casual' as WritingStyle;
      
      const emojiInstruction = persona 
        ? this.getEmojiInstruction(persona.emojiFrequency)
        : '1 emoji kullanabilirsin.';

      const systemPrompt = `Sen bir blog okuyucususun ve başka bir yoruma yanıt yazıyorsun. Türkçe yaz.

## YAZIM STİLİN:
${WRITING_STYLE_PROMPTS[writingStyle]}

## KURALLAR:
- 1-2 cümle yaz
- Orijinal yoruma yanıt ver
- Katılıyorsan belirt, eklemek istediğin varsa ekle
- ${emojiInstruction}
- Doğal ve samimi ol`;

      const userPrompt = `${blogTitle ? `Blog konusu: "${blogTitle}"\n` : ''}
Yanıt vereceğin yorum: "${originalComment}"
${previousReplies.length > 0 ? `\nÖnceki yanıtlar (TEKRAR ETME):\n${previousReplies.map(r => `- ${r}`).join('\n')}` : ''}

Bu yoruma kısa bir yanıt yaz.`;

      const response = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 100,
        temperature: 0.9,
      });

      const reply = response.choices[0]?.message?.content?.trim();
      return reply || this.pickFallback(FALLBACK_COMMENT_REPLIES);

    } catch (error: any) {
      logger.debug(`OpenAI hatası: ${error.message}`);
      return this. pickFallback(FALLBACK_COMMENT_REPLIES);
    }
  }

  async generateDietComment(
    dietTitle: string,
    dietSlug: string,
    persona?: PersonaConfig
  ): Promise<string> {
    if (!this.isAvailable || !this.client) {
      return this.pickFallback(FALLBACK_DIET_COMMENTS);
    }

    try {
      const writingStyle = persona 
        ? pickRandom(persona.writingStyles) 
        : 'casual' as WritingStyle;
      
      const availableTypes = CONTENT_TYPE_COMMENT_MAPPING['diet'];
      const preferredTypes = persona?.preferredCommentTypes || availableTypes;
      const validTypes = preferredTypes.filter(t => availableTypes.includes(t));
      const commentType = pickRandom(validTypes.length > 0 ? validTypes : availableTypes);
      
      const emojiInstruction = persona 
        ? this.getEmojiInstruction(persona.emojiFrequency)
        : '1-2 emoji kullanabilirsin.';

      const systemPrompt = `Sen bir diyet programını deneyen kullanıcısın. Türkçe değerlendirme yazıyorsun.

## YAZIM STİLİN:
${WRITING_STYLE_PROMPTS[writingStyle]}

## YORUM TİPİN:
${COMMENT_TYPE_PROMPTS[commentType]}

## KURALLAR:
- 1-3 cümle yaz
- Sanki bu diyeti gerçekten denedin gibi yaz
- Olumlu ama gerçekçi ol
- ${emojiInstruction}
- Spesifik bir şeyden bahset (tarifler, porsiyon, zorluk vs.)`;

      const userPrompt = `Diyet programı: "${dietTitle}"

Bu diyet programı için bir değerlendirme yaz.`;

      const response = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 150,
        temperature: 0.9,
      });

      const comment = response.choices[0]?.message?.content?.trim();
      return comment || this.pickFallback(FALLBACK_DIET_COMMENTS);

    } catch (error: any) {
      logger.debug(`OpenAI hatası: ${error.message}`);
      return this.pickFallback(FALLBACK_DIET_COMMENTS);
    }
  }

  async generateExerciseComment(
    exerciseTitle: string,
    exerciseSlug: string,
    persona?: PersonaConfig
  ): Promise<string> {
    if (!this.isAvailable || !this.client) {
      return this.pickFallback(FALLBACK_EXERCISE_COMMENTS);
    }

    try {
      const writingStyle = persona 
        ? pickRandom(persona.writingStyles) 
        : 'casual' as WritingStyle;
      
      const availableTypes = CONTENT_TYPE_COMMENT_MAPPING['exercise'];
      const preferredTypes = persona?.preferredCommentTypes || availableTypes;
      const validTypes = preferredTypes.filter(t => availableTypes.includes(t));
      const commentType = pickRandom(validTypes.length > 0 ? validTypes : availableTypes);
      
      const emojiInstruction = persona 
        ? this.getEmojiInstruction(persona.emojiFrequency)
        : '1-2 emoji kullanabilirsin.';

      const systemPrompt = `Sen bir egzersiz programını deneyen kullanıcısın. Türkçe değerlendirme yazıyorsun.

## YAZIM STİLİN:
${WRITING_STYLE_PROMPTS[writingStyle]}

## YORUM TİPİN:
${COMMENT_TYPE_PROMPTS[commentType]}

## KURALLAR:
- 1-3 cümle yaz
- Sanki bu programı gerçekten denedin gibi yaz
- Olumlu ama gerçekçi ol
- ${emojiInstruction}
- Spesifik bir şeyden bahset (zorluk, süre, etkili hareketler vs.)`;

      const userPrompt = `Egzersiz programı: "${exerciseTitle}"

Bu egzersiz programı için bir değerlendirme yaz.`;

      const response = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 150,
        temperature: 0.9,
      });

      const comment = response.choices[0]?.message?.content?.trim();
      return comment || this.pickFallback(FALLBACK_EXERCISE_COMMENTS);

    } catch (error: any) {
      logger.debug(`OpenAI hatası: ${error.message}`);
      return this.pickFallback(FALLBACK_EXERCISE_COMMENTS);
    }
  }

  private pickFallback(fallbacks: string[]): string {
    return pickRandom(fallbacks);
  }
}