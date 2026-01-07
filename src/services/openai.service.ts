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
  'Dengeli bir program gibi görünüyor.',
  'Uygulanabilir görünüyor, denemeye değer.',
  'Pratik öneriler var.',
  'Mantıklı bir yaklaşım.',
  'Denemeye değer görünüyor.',
  'İşe yarar gibi duruyor.',
  'Makul bir program.',
  'Uygulanabilir.',
];

const FALLBACK_EXERCISE_COMMENTS = [
  'Etkili görünüyor.',
  'Pratik bir program.',
  'Başlangıç için uygun gibi.',
  'Evde yapılabilir olması güzel.',
  'Denemeye değer.',
  'Uygulanabilir.',
  'Mantıklı hareketler var.',
  'İşe yarar gibi.',
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

## TEMEL PRENSİPLER:
🚫 ASLA YAPMA:
- Uydurma kişisel sonuç veya deneyim yazma ("Bu diyeti uyguladım, 3 kilo verdim" ❌)
- Tıbbi tavsiye, teşhis veya kesin hüküm verme
- İçerikte verilmeyen detayları uydurma
- Sürekli aynı kalıpları kullanma ("harika yazı", "süper içerik" ❌)

✅ YAP:
- Sadece verilen başlık ve özete dayan
- İçerikten en az 1 somut noktaya değin
- "Denemeye değer", "mantıklı görünüyor", "uygulanabilir" gibi yumuşak ifadeler kullan

## YORUM UZUNLUĞU (ÇOK KRİTİK):
Yorumlar her zaman uzun olmak zorunda DEĞİL. Varyasyonlar:
- Çok kısa (2-5 kelime): "Gayet net anlatılmış."
- Kısa tek cümle: "Özellikle kalori dengesi kısmı açıklayıcı olmuş."
- 1-2 cümle: "Pratik öneriler güzel toparlanmış."
- En fazla 3 cümle (NADİR)

## YORUM TİPLERİ (RASTGELE SEÇ):
1. Fayda Odaklı: "İşe yarar", "pratik", "uygulanabilir"
2. Bilgi/İçgörü: "Şu konuyu net anlatmış"
3. Kısa Özet: "Derli toplu", "net anlatım"
4. Nazik Katkı: "Biraz daha örnek olsa iyi olurdu" (yumuşak)

## EMOJİ KURALI:
${emojiInstruction}
- Bazı yorumda hiç emoji kullanma
- Asla her yorumda emoji olmasın

## GENEL KURALLAR:
- İçerikle ALAKALI ol, genel geçer yorum yazma
- Doğal ve gerçek bir insan gibi yaz
- Soru SORMA
- İçerikteki SPECIFIC bir noktaya değin (eğer yeterli bilgi varsa)`;

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
    if (!this.isAvailable || !this.client) {
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

## REPLY (YORUMA YANIT) ÖZELLİKLERİ:
- 1-2 cümle (kısa ve öz)
- Destekleyici, doğal
- Önceki yanıtlarla aynı cümleyi kurma
- Soru SORMA
- Gerekirse sadece: "Katılıyorum." "Güzel tespit."

## TEMEL PRENSİPLER:
🚫 ASLA YAPMA:
- Uydurma kişisel deneyim yazma
- Tıbbi tavsiye veya kesin hüküm verme
- Önceki yanıtları tekrar etme

✅ YAP:
- Yoruma katıl veya nazikçe farklı bakış açısı sun
- Doğal ve samimi ol
- Kısa ve öz tut

## EMOJİ KURALI:
${emojiInstruction}
- Çoğu reply'de emoji olmasın`;

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
      return this.pickFallback(FALLBACK_COMMENT_REPLIES);
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

      const systemPrompt = `Sen bir diyet programını değerlendiren kullanıcısın. Türkçe değerlendirme yazıyorsun.

## YAZIM STİLİN:
${WRITING_STYLE_PROMPTS[writingStyle]}

## YORUM TİPİN:
${COMMENT_TYPE_PROMPTS[commentType]}

## TEMEL PRENSİPLER:
🚫 ASLA YAPMA:
- Uydurma kişisel sonuç veya deneyim yazma ("Bu diyeti uyguladım, 3 kilo verdim" ❌)
- "İlk haftada fark görmeye başladım" gibi sahte deneyimler ❌
- Tıbbi tavsiye, teşhis veya kesin hüküm verme
- İçerikte verilmeyen detayları uydurma

✅ YAP:
- Sadece verilen başlığa ve genel değerlendirmeye dayan
- "Denemeye değer", "mantıklı görünüyor", "uygulanabilir", "pratik" gibi yumuşak ifadeler kullan
- Program hakkında genel izlenimler ver (zorluk, süre, uygulanabilirlik)

## YORUM UZUNLUĞU:
- Çok kısa (2-5 kelime): "Pratik görünüyor."
- Kısa tek cümle: "Dengeli bir program gibi duruyor."
- 1-2 cümle: "Uygulanabilir görünüyor. Denemeye değer."
- En fazla 3 cümle (NADİR)

## EMOJİ KURALI:
${emojiInstruction}`;

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

      const systemPrompt = `Sen bir egzersiz programını değerlendiren kullanıcısın. Türkçe değerlendirme yazıyorsun.

## YAZIM STİLİN:
${WRITING_STYLE_PROMPTS[writingStyle]}

## YORUM TİPİN:
${COMMENT_TYPE_PROMPTS[commentType]}

## TEMEL PRENSİPLER:
🚫 ASLA YAPMA:
- Uydurma kişisel sonuç veya deneyim yazma ("Bu programı uyguladım, harika sonuç aldım" ❌)
- "İlk haftada kas kazandım" gibi sahte deneyimler ❌
- Tıbbi tavsiye, teşhis veya kesin hüküm verme
- İçerikte verilmeyen detayları uydurma

✅ YAP:
- Sadece verilen başlığa ve genel değerlendirmeye dayan
- "Denemeye değer", "etkili görünüyor", "uygulanabilir", "pratik" gibi yumuşak ifadeler kullan
- Program hakkında genel izlenimler ver (zorluk, süre, uygulanabilirlik)

## YORUM UZUNLUĞU:
- Çok kısa (2-5 kelime): "Etkili görünüyor."
- Kısa tek cümle: "Evde yapılabilir, pratik."
- 1-2 cümle: "Başlangıç için uygun. Denemeye değer."
- En fazla 3 cümle (NADİR)

## EMOJİ KURALI:
${emojiInstruction}`;

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