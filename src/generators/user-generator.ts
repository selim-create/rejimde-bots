import { BotUser, PersonaType } from '../types';
import turkishNames from '../../data/turkish-names.json';
import turkishSurnames from '../../data/turkish-surnames.json';
import turkishCities from '../../data/turkish-cities.json';
import bioTemplates from '../../data/bio-templates.json';

/**
 * Rastgele eleman seç
 */
function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Rastgele sayı üret (min-max arası)
 */
function randomInt(min: number, max: number): number {
  return Math. floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Türkçe karakterleri ASCII'ye çevir
 */
function toAscii(str: string): string {
  return str
    .toLowerCase()
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Username oluştur (WordPress uyumlu - nokta yok)
 */
function generateUsername(firstName: string, lastName:  string): string {
  const first = toAscii(firstName);
  const last = toAscii(lastName);
  
  const variations = [
    () => `${first}${last}`,
    () => `${first}_${last}`,
    () => `${first}${randomInt(1, 999)}`,
    () => `${first}${last. substring(0, 3)}`,
    () => `${first}${last}${randomInt(1, 99)}`,
    () => `${first}_${last}${randomInt(1, 99)}`,
  ];
  
  return randomElement(variations)();
}

/**
 * Doğum tarihi oluştur (1970-2005 arası)
 */
function generateBirthDate(): string {
  const year = randomInt(1970, 2005);
  const month = String(randomInt(1, 12)).padStart(2, '0');
  const day = String(randomInt(1, 28)).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Yaş hesapla
 */
function calculateAge(birthDate: string): number {
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today. getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

/**
 * Fiziksel özellikler oluştur
 */
function generatePhysicalAttributes(
  gender: 'male' | 'female',
  goal: 'weight_loss' | 'muscle_gain' | 'healthy_living'
): { height: number; currentWeight: number; targetWeight: number } {
  // Boy
  const heightBase = gender === 'male' ? 175 : 163;
  const heightVar = 15;
  const height = heightBase + randomInt(-heightVar, heightVar);

  // Kilo (BMI bazlı)
  const bmi = 20 + Math.random() * 15; // 20-35 BMI
  const currentWeight = Math.round(bmi * Math.pow(height / 100, 2));

  // Hedef kilo
  let targetWeight:  number;
  if (goal === 'weight_loss') {
    targetWeight = Math.round(currentWeight * (0.8 + Math.random() * 0.15));
  } else if (goal === 'muscle_gain') {
    targetWeight = Math.round(currentWeight * (1.05 + Math.random() * 0.1));
  } else {
    targetWeight = currentWeight;
  }

  return { height, currentWeight, targetWeight };
}

/**
 * Bio oluştur
 */
function generateBio(data: {
  goal: string;
  city: string;
  age: number;
}): string {
  const goalLabels:  Record<string, string> = {
    weight_loss: 'kilo vermek',
    muscle_gain:  'kas yapmak',
    healthy_living: 'sağlıklı yaşamak',
  };

  const template = randomElement(bioTemplates);
  
  return template
    .replace(/{hedef}/g, goalLabels[data.goal] || 'sağlıklı yaşamak')
    .replace(/{sehir}/g, data. city)
    .replace(/{yas}/g, String(data.age));
}

/**
 * Avatar URL oluştur (DiceBear API)
 */
function generateAvatarUrl(seed: string): string {
  const styles = ['personas', 'avataaars', 'lorelei', 'micah'];
  const style = randomElement(styles);
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}`;
}

/**
 * Tüm botlar için sabit şifre (. env'den veya varsayılan)
 */
function generatePassword(): string {
  return process.env.BOT_PASSWORD || 'RejimdeBot2026!';
}
/**
 * Bot kullanıcısı oluştur
 */
export function generateBotUser(options: {
  persona: PersonaType;
  batchId: string;
  index: number;
}): BotUser {
  // Cinsiyet
  const gender:  'male' | 'female' = Math.random() > 0.5 ? 'male' : 'female';

  // İsim
  const names = gender === 'male' ? turkishNames. male : turkishNames.female;
  const firstName = randomElement(names);
  const lastName = randomElement(turkishSurnames);
  const fullName = `${firstName} ${lastName}`;

  // Username ve email
  const username = generateUsername(firstName, lastName);
  const email = `${username}@rejimde-bot.test`;

  // Doğum tarihi ve yaş
  const birthDate = generateBirthDate();
  const age = calculateAge(birthDate);

  // Hedef
  const goals: Array<'weight_loss' | 'muscle_gain' | 'healthy_living'> = [
    'weight_loss',
    'weight_loss',
    'weight_loss', // %50 kilo verme
    'muscle_gain',
    'muscle_gain', // %33 kas yapma
    'healthy_living', // %17 sağlıklı yaşam
  ];
  const goal = randomElement(goals);

  // Aktivite seviyesi
  const activityLevels:  Array<'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'> = [
    'sedentary',
    'sedentary',
    'light',
    'light',
    'moderate',
    'moderate',
    'active',
    'very_active',
  ];
  const activityLevel = randomElement(activityLevels);

  // Fiziksel özellikler
  const { height, currentWeight, targetWeight } = generatePhysicalAttributes(gender, goal);

  // Lokasyon
  const location = randomElement(turkishCities);

  // Bio
  const description = generateBio({ goal, city: location, age });

  // Avatar
  const avatarUrl = generateAvatarUrl(`${username}_${options.index}`);

  // Şifre
  const password = generatePassword();

  return {
    username,
    email,
    password,
    name: fullName,
    gender,
    birth_date: birthDate,
    height,
    current_weight: currentWeight,
    target_weight:  targetWeight,
    goal,
    activity_level: activityLevel,
    description,
    location,
    avatar_url: avatarUrl,
    is_simulation: true,
    simulation_persona: options.persona,
    simulation_batch:  options.batchId,
    simulation_active:  true,
  };
}

/**
 * Birden fazla bot kullanıcısı oluştur
 */
export function generateBotUsers(
  count: number,
  persona: PersonaType,
  batchId: string
): BotUser[] {
  const users: BotUser[] = [];
  
  for (let i = 0; i < count; i++) {
    users.push(generateBotUser({ persona, batchId, index: i }));
  }
  
  return users;
}