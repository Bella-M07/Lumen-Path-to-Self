

export type NavigationTab = 'journal' | 'tasks' | 'chat' | 'settings' | 'insights';

export enum SophusTone {
  EMPATHETIC = 'Empathetic & Gentle',
  STOIC = 'Stoic & Direct',
  MOTIVATIONAL = 'High Energy & Motivational',
  ANALYTICAL = 'Analytical & Strategic',
  CUSTOM = 'Custom Personality'
}

export type AppTheme = 'neon-city' | 'crimson-protocol' | 'noir' | 'oceanic' | 'custom';
export type QuoteCategory = 'affirmation' | 'stoic' | 'productivity' | 'confidence' | 'literature' | 'custom';

export interface ThemeColors {
  base: string;
  card: string;
  primary: string;
  secondary: string;
  accent: string;
  text: string;
  mute: string;
}

export interface UserSettings {
  name: string;
  sophusTone: SophusTone;
  customTonePrompt?: string;
  calendarSynced: boolean;
  theme: AppTheme;
  customThemeColors?: ThemeColors;
  shareJournalContent: boolean;
  appLockEnabled: boolean;
  appLockPin?: string;
  profileImage?: string; // Base64 or URL
  userTitle?: string; // e.g., "Shadow Monarch"
  likedQuotes: string[];
  quoteCategories: QuoteCategory[];
  customQuotePreference?: string;
}

export type JournalType = 'free' | 'morning' | 'afternoon' | 'evening' | 'night';

export interface JournalEntry {
  id: string;
  date: string;
  content: string;
  prompt?: string;
  mood?: string;
  type: JournalType;
  checkInData?: {
    question: string;
    rating: number; // 0-10
    comment: string;
  }[];
}

export type MoodType = 
  'Excited' | 'Happy' | 'Motivated' | 'Content' | 'Grateful' | 'Calm' | 
  'Tired' | 'Sad' | 'Anxious' | 'Stressed' | 'Frustrated' | 'Overwhelmed';

export const MoodValue: Record<MoodType, number> = {
  'Excited': 5,
  'Happy': 5,
  'Motivated': 5,
  'Grateful': 5,
  'Content': 4,
  'Calm': 4,
  'Tired': 2,
  'Sad': 1,
  'Anxious': 2,
  'Stressed': 2,
  'Frustrated': 2,
  'Overwhelmed': 1
};

export interface MoodLog {
  id: string;
  date: string;
  mood: MoodType;
  note?: string;
}

export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly';
export type PriorityType = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  completedAt?: string;
  type: 'affirmation' | 'todo';
  date: string; // ISO date string (YYYY-MM-DD)
  dueDate?: string; // ISO date string (YYYY-MM-DD)
  dueTime?: string; // HH:MM string
  duration?: number; // minutes
  recurrence: RecurrenceType;
  priority: PriorityType;
  isCalendarEvent?: boolean;
  xpValue: number; // XP earned on completion
}

export interface ProposedTask {
  text: string;
  priority: PriorityType;
  duration: number;
  date?: string;
  time?: string;
  xp: number;
}

export interface Habit {
  id: string;
  title: string;
  type: 'build' | 'break'; // Build = Good habit, Break = Bad habit
  completedDates: string[]; // ISO date strings
  streak: number;
  xpValue: number; // XP per completion
  penaltyValue: number; // XP lost on relapse
  time?: string; // HH:MM optional schedule
  duration?: number; // Minutes
}

export interface Goal {
  id: string;
  title: string;
  status: 'active' | 'completed';
  dateAdded: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isStreaming?: boolean;
  toolCallId?: string;
  toolResponse?: string;
  planProposal?: { title?: string, tasks: ProposedTask[] };
  isPlanAccepted?: boolean;
}

export type BadgeCriteria = 'tasks' | 'streak' | 'journals' | 'moods';

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  dateUnlocked?: string;
  criteriaType: BadgeCriteria;
  criteriaThreshold: number;
}

export type HunterRank = 'E-Rank' | 'D-Rank' | 'C-Rank' | 'B-Rank' | 'A-Rank' | 'S-Rank' | 'National Level';

export interface XPLog {
  id: string;
  date: string;
  amount: number;
  source: string; // "Task: Title", "Badge: Name", "Habit: Name"
  type: 'gain' | 'loss';
}

export interface UserStats {
  xp: number;
  xpGained: number; // Total gained lifetime
  xpLost: number; // Total lost lifetime
  level: number;
  rank: HunterRank;
  currentStreak: number;
  longestStreak: number;
  lastLoginDate: string;
  tasksCompleted: number;
  journalsWritten: number;
  moodsLogged: number;
  xpHistory: XPLog[];
}

export type InsightRange = 'week' | 'month' | '90days' | 'all';