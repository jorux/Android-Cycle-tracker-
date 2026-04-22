export type Mood = 'Happy' | 'Anxious' | 'Irritable' | 'Sad' | 'Calm' | 'Tired';
export type Symptom = 'Cramps' | 'Bloating' | 'Headache' | 'Back Pain' | 'Acne' | 'Nausea';

export interface DailyLog {
  id: string;
  date: string; // ISO format
  moods: Mood[];
  symptoms: Symptom[];
  notes: string;
}

export interface Cycle {
  id: string;
  startDate: string; // ISO format
  endDate?: string; // ISO format (active cycle if undefined)
  intensity: 'Light' | 'Medium' | 'Heavy';
}

export interface GiftIdea {
  id: string;
  name: string;
  notes?: string;
  images?: string[];
}

export interface ImportantDate {
  id: string;
  label: string;
  date: string; // ISO format
  isRecurring: boolean;
  notes?: string;
  images?: string[];
}

export interface Profile {
  id: string;
  name: string;
  color: string;
  folder?: string;
  avatarUrl?: string; // base64 or URL
  gallery?: string[]; // additional photos
  averageCycleLength: number; // default 28
  averagePeriodLength: number; // default 5
  manualNextPeriodDate?: string; // ISO format
  manualOvulationDate?: string; // ISO format
  birthday?: string; // ISO format
  genderPreference?: string;
  logs: DailyLog[];
  cycles: Cycle[];
  // Personal Details
  phaseNotes?: Record<string, string>;
  likes?: string[];
  dislikes?: string[];
  loveUser?: number; // 0-100
  lovePerceived?: number; // 0-100
  giftIdeasObjects?: GiftIdea[];
  importantDates?: ImportantDate[];
  letter?: string;
  attachments?: { id: string; name: string; url: string; type: string; date: string }[];
  socialLinks?: { id: string; platform: string; url: string }[];
  deletedAt?: string; // ISO format
}

export interface AppState {
  profiles: Profile[];
  activeProfileId: string | null;
}
