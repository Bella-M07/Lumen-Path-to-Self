import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Journal } from './components/Journal';
import { Tasks } from './components/Tasks';
import { Chat } from './components/Chat';
import { Settings } from './components/Settings';
import { Insights } from './components/Insights';
import { 
  NavigationTab, UserSettings, JournalEntry, Task, ChatMessage, 
  SophusTone, MoodLog, UserStats, Badge, Habit, AppTheme, XPLog, QuoteCategory, Goal, ProposedTask, ThemeColors
} from './types';
import { Lock } from 'lucide-react';

const INITIAL_BADGES: Badge[] = [
  { id: 'first_step', name: 'First Step', description: 'Complete your first task.', icon: 'Footprints', unlocked: false, criteriaType: 'tasks', criteriaThreshold: 1 },
  { id: 'streak_3', name: 'Momentum', description: 'Log in 3 days in a row.', icon: 'Zap', unlocked: false, criteriaType: 'streak', criteriaThreshold: 3 },
  { id: 'streak_7', name: 'Unstoppable', description: 'Log in 7 days in a row.', icon: 'Flame', unlocked: false, criteriaType: 'streak', criteriaThreshold: 7 },
  { id: 'journal_5', name: 'Reflector', description: 'Write 5 journal entries.', icon: 'Book', unlocked: false, criteriaType: 'journals', criteriaThreshold: 5 },
  { id: 'mood_master', name: 'Self-Aware', description: 'Log your mood 5 times.', icon: 'Heart', unlocked: false, criteriaType: 'moods', criteriaThreshold: 5 },
  // Higher Tier Badges
  { id: 'hunter_initiate', name: 'Hunter Initiate', description: 'Complete 25 tasks.', icon: 'Target', unlocked: false, criteriaType: 'tasks', criteriaThreshold: 25 },
  { id: 'shadow_scribe', name: 'Shadow Scribe', description: 'Write 20 journal entries.', icon: 'Feather', unlocked: false, criteriaType: 'journals', criteriaThreshold: 20 },
  { id: 'iron_will', name: 'Iron Will', description: 'Reach a 30-day streak.', icon: 'Shield', unlocked: false, criteriaType: 'streak', criteriaThreshold: 30 },
];

const THEMES: Record<AppTheme, Record<string, string>> = {
  'neon-city': { '--color-base': '#020617', '--color-card': 'rgba(30, 41, 59, 0.4)', '--color-primary': '#8b5cf6', '--color-secondary': '#d946ef', '--color-accent': '#3b82f6', '--color-text': '#f8fafc', '--color-mute': '#94a3b8' },
  'crimson-protocol': { '--color-base': '#0a0a0a', '--color-card': 'rgba(23, 23, 23, 0.6)', '--color-primary': '#ef4444', '--color-secondary': '#991b1b', '--color-accent': '#737373', '--color-text': '#f5f5f5', '--color-mute': '#a3a3a3' },
  'noir': { '--color-base': '#000000', '--color-card': 'rgba(20, 20, 20, 0.8)', '--color-primary': '#ffffff', '--color-secondary': '#737373', '--color-accent': '#404040', '--color-text': '#ffffff', '--color-mute': '#888888' },
  'oceanic': { '--color-base': '#020410', '--color-card': 'rgba(15, 23, 42, 0.5)', '--color-primary': '#3b82f6', '--color-secondary': '#6366f1', '--color-accent': '#0ea5e9', '--color-text': '#f0f9ff', '--color-mute': '#94a3b8' },
  'custom': {}
};

const DEFAULT_CUSTOM_COLORS = { base: '#000000', card: 'rgba(30,30,30,0.8)', primary: '#ffffff', secondary: '#808080', accent: '#ff00ff', text: '#ffffff', mute: '#999999' };

const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavigationTab>('tasks');
  const [settings, setSettings] = useState<UserSettings>(() => {
    const saved = localStorage.getItem('lumen_settings');
    const defaults: UserSettings = { 
        name: 'Traveler', 
        sophusTone: SophusTone.EMPATHETIC, 
        calendarSynced: false, 
        theme: 'neon-city', 
        shareJournalContent: false, 
        customThemeColors: DEFAULT_CUSTOM_COLORS, 
        appLockEnabled: false, 
        appLockPin: '', 
        likedQuotes: [],
        quoteCategories: ['affirmation'],
        customQuotePreference: ''
    };
    return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
  });

  const [isLocked, setIsLocked] = useState<boolean>(settings.appLockEnabled);
  const [pinInput, setPinInput] = useState('');
  const [lockError, setLockError] = useState(false);

  // Data States
  const [entries, setEntries] = useState<JournalEntry[]>(() => JSON.parse(localStorage.getItem('lumen_entries') || '[]'));
  const [moodLogs, setMoodLogs] = useState<MoodLog[]>(() => JSON.parse(localStorage.getItem('lumen_moods') || '[]'));
  const [tasks, setTasks] = useState<Task[]>(() => JSON.parse(localStorage.getItem('lumen_tasks') || '[]'));
  const [habits, setHabits] = useState<Habit[]>(() => JSON.parse(localStorage.getItem('lumen_habits') || '[]'));
  const [goals, setGoals] = useState<Goal[]>(() => JSON.parse(localStorage.getItem('lumen_goals') || '[]'));
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(() => JSON.parse(localStorage.getItem('lumen_chat') || '[]'));
  const [stats, setStats] = useState<UserStats>(() => {
      const saved = localStorage.getItem('lumen_stats');
      const defaults = { xp: 0, xpGained: 0, xpLost: 0, level: 1, rank: 'E-Rank', currentStreak: 0, longestStreak: 0, lastLoginDate: '', tasksCompleted: 0, journalsWritten: 0, moodsLogged: 0, xpHistory: [] };
      return saved ? { ...defaults, ...JSON.parse(saved) } : defaults as UserStats;
  });
  const [badges, setBadges] = useState<Badge[]>(() => JSON.parse(localStorage.getItem('lumen_badges') || JSON.stringify(INITIAL_BADGES)));
  
  // State to trigger automatic chat response for Breakdown Flow
  const [triggerChatResponse, setTriggerChatResponse] = useState(false);

  // Persistence
  useEffect(() => { localStorage.setItem('lumen_settings', JSON.stringify(settings)); }, [settings]);
  useEffect(() => { localStorage.setItem('lumen_entries', JSON.stringify(entries)); }, [entries]);
  useEffect(() => { localStorage.setItem('lumen_moods', JSON.stringify(moodLogs)); }, [moodLogs]);
  useEffect(() => { localStorage.setItem('lumen_tasks', JSON.stringify(tasks)); }, [tasks]);
  useEffect(() => { localStorage.setItem('lumen_habits', JSON.stringify(habits)); }, [habits]);
  useEffect(() => { localStorage.setItem('lumen_goals', JSON.stringify(goals)); }, [goals]);
  useEffect(() => { localStorage.setItem('lumen_chat', JSON.stringify(chatHistory)); }, [chatHistory]);
  useEffect(() => { localStorage.setItem('lumen_stats', JSON.stringify(stats)); }, [stats]);
  useEffect(() => { localStorage.setItem('lumen_badges', JSON.stringify(badges)); }, [badges]);

  // Theme
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'custom' && settings.customThemeColors) {
        // Map custom colors to CSS variables (e.g. 'base' -> '--color-base')
        Object.entries(settings.customThemeColors).forEach(([key, value]) => {
            root.style.setProperty(`--color-${key}`, value as string);
        });
    } else {
        const themeVars = THEMES[settings.theme];
        Object.entries(themeVars).forEach(([key, value]) => {
            root.style.setProperty(key, value as string);
        });
    }
  }, [settings.theme, settings.customThemeColors]);

  // Gamification
  const logXP = (amount: number, source: string, type: 'gain' | 'loss') => {
      setStats(prev => {
          const newXP = type === 'gain' ? prev.xp + amount : Math.max(0, prev.xp - amount);
          const newHistory: XPLog = { id: Date.now().toString(), date: new Date().toISOString(), amount, source, type };
          return {
              ...prev,
              xp: newXP,
              xpGained: type === 'gain' ? prev.xpGained + amount : prev.xpGained,
              xpLost: type === 'loss' ? prev.xpLost + amount : prev.xpLost,
              level: Math.floor(newXP / 100) + 1,
              xpHistory: [...prev.xpHistory, newHistory].slice(-50) // Keep last 50 logs
          };
      });
  };

  const unlockBadge = (badge: Badge) => {
    setBadges(prev => prev.map(b => {
      if (b.id === badge.id && !b.unlocked) {
        logXP(100, `Badge: ${b.name}`, 'gain');
        return { ...b, unlocked: true, dateUnlocked: new Date().toISOString() };
      }
      return b;
    }));
  };

  useEffect(() => {
    badges.forEach(badge => {
        if (!badge.unlocked) {
            let currentValue = 0;
            switch(badge.criteriaType) {
                case 'tasks': currentValue = stats.tasksCompleted; break;
                case 'streak': currentValue = stats.currentStreak; break;
                case 'journals': currentValue = stats.journalsWritten; break;
                case 'moods': currentValue = stats.moodsLogged; break;
            }
            if (currentValue >= badge.criteriaThreshold) {
                unlockBadge(badge);
            }
        }
    });
  }, [stats.tasksCompleted, stats.currentStreak, stats.journalsWritten, stats.moodsLogged, badges]);

  // Daily Streak Logic
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    if (stats.lastLoginDate !== today) {
      const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      const newStreak = (stats.lastLoginDate === yesterdayStr) ? stats.currentStreak + 1 : 1;
      setStats(prev => ({ ...prev, lastLoginDate: today, currentStreak: newStreak, longestStreak: Math.max(prev.longestStreak, newStreak) }));
    }
  }, []);

  const handleTaskCompletion = (taskId: string) => {
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;
    const task = tasks[taskIndex];
    const isCompleting = !task.completed;
    
    // Update Task
    const updatedTasks = [...tasks];
    updatedTasks[taskIndex] = { ...task, completed: isCompleting, completedAt: isCompleting ? new Date().toISOString() : undefined };
    
    // Handle Recurring
    if (isCompleting && task.recurrence !== 'none') {
       const nextDate = new Date(task.date);
       if (task.recurrence === 'daily') nextDate.setDate(nextDate.getDate() + 1);
       if (task.recurrence === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
       if (task.recurrence === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);
       updatedTasks.push({ ...task, id: Date.now().toString(), completed: false, completedAt: undefined, date: nextDate.toISOString() });
    }
    setTasks(updatedTasks);

    if (isCompleting) {
        logXP(task.xpValue || 20, `Task: ${task.text}`, 'gain');
        setStats(p => ({...p, tasksCompleted: p.tasksCompleted + 1}));
    } else {
        logXP(task.xpValue || 20, `Undo Task: ${task.text}`, 'loss');
    }
  };

  const handleHabitToggle = (habitId: string) => {
      const today = new Date().toISOString().split('T')[0];
      setHabits(prev => prev.map(h => {
          if (h.id !== habitId) return h;
          const isCompletedToday = h.completedDates.includes(today);
          if (isCompletedToday) {
               // Undo completion
               logXP(h.xpValue, `Undo Habit: ${h.title}`, 'loss');
               return { ...h, completedDates: h.completedDates.filter(d => d !== today), streak: Math.max(0, h.streak - 1) };
          } else {
               logXP(h.xpValue, `Habit: ${h.title}`, 'gain');
               return { ...h, completedDates: [...h.completedDates, today], streak: h.streak + 1 };
          }
      }));
  };

  const handleHabitRelapse = (habitId: string) => {
      setHabits(prev => prev.map(h => {
          if(h.id !== habitId) return h;
          logXP(h.penaltyValue, `Relapse: ${h.title}`, 'loss');
          return { ...h, streak: 0 };
      }));
  };

  const handleAction = (action: any, id?: string) => {
    if (action === 'task_complete' && id) handleTaskCompletion(id);
    if (action === 'habit_toggle' && id) handleHabitToggle(id);
    if (action === 'habit_relapse' && id) handleHabitRelapse(id);
    if (action === 'journal_add') { logXP(25, 'Journal Entry', 'gain'); setStats(p => ({...p, journalsWritten: p.journalsWritten + 1})); }
    if (action === 'mood_log') { logXP(10, 'Mood Log', 'gain'); setStats(p => ({...p, moodsLogged: p.moodsLogged + 1})); }
  };
  
  // Handler for Goal Breakdown from Tasks component
  const handleBreakdownGoal = (goalText: string) => {
      // 1. Add goal to profile
      const newGoal: Goal = {
          id: Date.now().toString(),
          title: goalText,
          status: 'active',
          dateAdded: new Date().toISOString()
      };
      setGoals(prev => [newGoal, ...prev]);

      // 2. Add user message to history
      const newMessage: ChatMessage = {
          id: Date.now().toString(),
          role: 'user',
          text: `I have a big goal: "${goalText}". Please help me break this down into smaller steps by asking clarifying questions first.`
      };
      setChatHistory(prev => [...prev, newMessage]);
      
      // 3. Switch to chat tab
      setCurrentTab('chat');
      
      // 4. Trigger AI response
      setTriggerChatResponse(true);
  };

  // --- Sophus Tool Execution Handling ---
  const handleChatToolCall = (toolName: string, args: any) => {
      if (toolName === 'propose_plan') {
          // Do NOT add tasks here. Return the plan to the chat UI for approval.
          const proposal = {
              title: args.title || "Proposed Schedule",
              tasks: args.tasks
          };
          return { result: 'success', plan: proposal };
      }
      if (toolName === 'add_goal') {
          const newGoal: Goal = {
              id: Date.now().toString(),
              title: args.title,
              status: 'active',
              dateAdded: new Date().toISOString()
          };
          setGoals(prev => [newGoal, ...prev]);
          return { result: 'success', goalId: newGoal.id, name: 'add_goal' };
      }
      return { result: 'error', message: 'Tool not found' };
  };

  const handleAcceptPlan = (proposedTasks: ProposedTask[]) => {
      const newTasks = proposedTasks.map(pt => ({
          id: Date.now().toString() + Math.random().toString().slice(2, 6),
          text: pt.text,
          priority: pt.priority,
          duration: pt.duration || 30,
          date: pt.date || new Date().toISOString().split('T')[0],
          dueTime: pt.time,
          completed: false,
          type: 'todo',
          recurrence: 'none',
          xpValue: pt.xp || 20
      } as Task));
      
      setTasks(prev => [...prev, ...newTasks]);
  };

  // Lock Screen
  const handlePinInput = (num: string) => {
      const newPin = pinInput + num;
      if (newPin.length <= 6) setPinInput(newPin);
      if (newPin.length === 6) {
          if (newPin === settings.appLockPin) { setIsLocked(false); setPinInput(''); }
          else { setLockError(true); setPinInput(''); setTimeout(() => setLockError(false), 1000); }
      }
  };

  if (isLocked) {
      return (
          <div className="fixed inset-0 z-[9999] bg-lumen-base flex items-center justify-center flex-col animate-fadeIn">
              <div className="mb-8 flex flex-col items-center"><div className={`p-4 rounded-full bg-white/5 mb-4 border border-white/10 ${lockError ? 'animate-shake border-red-500' : ''}`}><Lock size={32} className="text-lumen-primary" /></div><h2 className="text-xl font-bold text-white mb-2">Lumen Locked</h2></div>
              <div className="flex gap-4 mb-8">{[...Array(6)].map((_, i) => <div key={i} className={`w-3 h-3 rounded-full transition-all ${i < pinInput.length ? 'bg-lumen-secondary scale-125' : 'bg-white/10'}`}></div>)}</div>
              <div className="grid grid-cols-3 gap-4">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((num) => <button key={num} onClick={() => handlePinInput(num.toString())} className="w-16 h-16 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-xl font-bold text-white transition-all active:scale-95 border border-white/5">{num}</button>)}
                  <button onClick={() => setPinInput(prev => prev.slice(0, -1))} className="col-start-3 w-16 h-16 rounded-full bg-transparent text-lumen-mute hover:text-white flex items-center justify-center transition-all active:scale-95">DEL</button>
              </div>
          </div>
      );
  }

  return (
    <Layout currentTab={currentTab} setTab={setCurrentTab} stats={stats} settings={settings} badges={badges} goals={goals} setGoals={setGoals}>
      {currentTab === 'journal' && <Journal entries={entries} setEntries={setEntries} moodLogs={moodLogs} setMoodLogs={setMoodLogs} onAction={handleAction} userName={settings.name} settings={settings} />}
      {currentTab === 'tasks' && <Tasks tasks={tasks} setTasks={setTasks} habits={habits} setHabits={setHabits} settings={settings} setSettings={setSettings} onAction={handleAction} badges={badges} onBreakdownGoal={handleBreakdownGoal} />}
      {currentTab === 'insights' && <Insights moodLogs={moodLogs} tasks={tasks} habits={habits} entries={entries} stats={stats} userName={settings.name} settings={settings} />}
      {currentTab === 'chat' && <Chat messages={chatHistory} setMessages={setChatHistory} settings={settings} onToolCall={handleChatToolCall} triggerResponse={triggerChatResponse} onResponseTriggered={() => setTriggerChatResponse(false)} onPlanAccepted={handleAcceptPlan} />}
      {currentTab === 'settings' && <Settings settings={settings} setSettings={setSettings} resetData={() => { localStorage.clear(); window.location.reload(); }} />}
    </Layout>
  );
};

export default App;