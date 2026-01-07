export type WritingStyle = 
  | 'formal'           // Düzgün Türkçe, imla kurallarına dikkat
  | 'casual'           // Günlük konuşma dili
  | 'gen_z'            // Z kuşağı dili (kısaltmalar, argo)
  | 'enthusiastic'     // Heyecanlı, emoji bol
  | 'minimalist'       // Kısa, öz
  | 'storyteller'      // Kişisel deneyim paylaşan
  | 'analytical'       // Analitik, bilgi odaklı
  | 'supportive';      // Destekleyici, motive edici

export const WRITING_STYLE_PROMPTS: Record<WritingStyle, string> = {
  formal: `
    - Düzgün Türkçe kullan, imla kurallarına dikkat et
    - "de/da" ayrı, "-ki" bitişik gibi kurallara uy
    - Emoji kullanma veya çok az kullan (max 1)
    - Kibar ve saygılı bir ton kullan
  `,
  casual: `
    - Günlük konuşma dilinde yaz
    - Bazen küçük imla hataları olabilir (gerçekçilik için)
    - "yaa, aa, hani, şey" gibi dolgu kelimeler kullanabilirsin
    - 1-2 emoji olabilir
  `,
  gen_z: `
    - Z kuşağı gibi yaz
    - "çko, mq, harbiden, efsane, aşırı, resmen" gibi kelimeler kullan
    - Emoji bol olabilir 🔥💯
    - Kısa cümleler, bazen büyük harf yok
    - "ya" ile cümle bitirebilirsin
  `,
  enthusiastic: `
    - Çok heyecanlı ve pozitif yaz
    - Ünlem işaretleri kullan!
    - Emoji kullan 🎉💪✨
    - Enerji dolu bir ton
    - "Harika!", "Süper!" gibi ifadeler kullan
  `,
  minimalist: `
    - Çok kısa yaz, 1-2 cümle maximum
    - Gereksiz kelime kullanma
    - Az veya hiç emoji yok
    - Sadece özü söyle
  `,
  storyteller: `
    - Kişisel deneyimini paylaş
    - "Ben de...", "Benim de başıma...", "Geçen hafta..." gibi başla
    - Küçük bir hikaye veya anekdot anlat
    - Samimi ve içten ol
  `,
  analytical: `
    - Bilgi odaklı yorum yap
    - Belirli bir noktaya veya detaya değin
    - Mantıklı ve düşünceli ol
    - Neden-sonuç ilişkisi kurabilirsin
  `,
  supportive: `
    - Motive edici ve destekleyici ol
    - Başarıları kutla
    - Teşvik edici mesajlar ver
    - "Başarabilirsin", "Harika gidiyorsun" gibi ifadeler
  `
};
