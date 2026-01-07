export type CommentType = 
  | 'appreciation'      // Teşekkür/takdir
  | 'personal_story'    // Kişisel deneyim
  | 'tip_sharing'       // Ek bilgi/ipucu paylaşan
  | 'agreement'         // Katılım belirten
  | 'motivation'        // Motivasyon veren
  | 'specific_point'    // Belirli bir noktaya değinen
  | 'before_after'      // Önce/sonra deneyimi
  | 'recommendation';   // Tavsiye eden

export const COMMENT_TYPE_PROMPTS: Record<CommentType, string> = {
  appreciation: `İçeriği beğendiğini ve faydalı bulduğunu belirt. Teşekkür et veya takdir et.`,
  personal_story: `Kendi deneyiminden kısa bir örnek ver. "Ben de...", "Bende de..." gibi başlayabilirsin.`,
  tip_sharing: `İçerikle ilgili küçük bir ek bilgi, ipucu veya öneri paylaş.`,
  agreement: `İçerikteki bir görüşe katıldığını belirt ve kısaca nedenini açıkla.`,
  motivation: `Diğer okuyucuları veya içerik sahibini motive edici bir yorum yaz.`,
  specific_point: `İçerikteki belirli bir noktaya (tarif, egzersiz, bilgi, madde) değin ve hakkında yorum yap.`,
  before_after: `Bu tarz bir programı/bilgiyi uygulamadan önce ve sonra yaşadığın değişimi veya farkı anlat.`,
  recommendation: `Bu içeriği başkalarına tavsiye et ve nedenini kısaca belirt.`
};

// İçerik tipine göre uygun yorum tipleri
export const CONTENT_TYPE_COMMENT_MAPPING: Record<string, CommentType[]> = {
  blog: ['appreciation', 'personal_story', 'agreement', 'tip_sharing', 'specific_point', 'recommendation'],
  diet: ['appreciation', 'personal_story', 'before_after', 'specific_point', 'motivation', 'recommendation'],
  exercise: ['appreciation', 'personal_story', 'before_after', 'motivation', 'specific_point', 'recommendation']
};
