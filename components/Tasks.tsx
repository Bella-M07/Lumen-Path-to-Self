

import React, { useState, useEffect, useRef } from 'react';
import { Task, Badge, UserSettings, RecurrenceType, Habit, PriorityType } from '../types';
import { Check, Plus, Sun, RefreshCw, Trash, Lock, Award, Zap, Flame, Book, Heart, Footprints, Calendar as CalendarIcon, Clock, Repeat, Link2, Shield, ShieldAlert, GripVertical, ArrowDown, ArrowUp, Minus, X, AlertTriangle, Bot, Skull, Moon, CloudSun, Sunrise, Goal } from 'lucide-react';
import { generateAffirmation, estimateTaskXP, recommendTasks } from '../services/geminiService';

interface TasksProps {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  habits: Habit[];
  setHabits: React.Dispatch<React.SetStateAction<Habit[]>>;
  settings: UserSettings;
  setSettings: React.Dispatch<React.SetStateAction<UserSettings>>;
  onAction: (action: 'task_complete' | 'habit_toggle' | 'habit_relapse', id: string) => void;
  badges: Badge[];
  onBreakdownGoal?: (goal: string) => void;
}

// Unified interface for rendering both Tasks and Habits on the timeline
interface TimelineItem {
    id: string;
    originalId: string; // Real ID in the DB
    isHabit: boolean;
    text: string;
    completed: boolean;
    time?: string;
    duration: number;
    priority: PriorityType;
    xpValue: number;
    type: 'todo' | 'habit_build' | 'habit_break';
}

const BadgeIcon = ({ name, className }: { name: string; className?: string }) => {
    switch(name) {
        case 'Zap': return <Zap size={16} className={className} />;
        case 'Flame': return <Flame size={16} className={className} />;
        case 'Book': return <Book size={16} className={className} />;
        case 'Heart': return <Heart size={16} className={className} />;
        case 'Footprints': return <Footprints size={16} className={className} />;
        default: return <Award size={16} className={className} />;
    }
}

const CompletionCheck = ({ completed, onClick, isHabit }: { completed: boolean; onClick: (e: React.MouseEvent) => void; isHabit?: boolean }) => (
    <button 
        onClick={onClick}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        className={`
            relative z-20 flex items-center justify-center w-5 h-5 rounded-md border transition-all duration-300
            ${completed 
                ? 'bg-lumen-secondary border-lumen-secondary shadow-[0_0_15px_rgba(217,70,239,0.8)] animate-neon-burst' 
                : 'bg-white/5 border-white/20 hover:border-lumen-primary hover:bg-lumen-primary/20'
            }
            ${isHabit ? 'rounded-full' : ''}
        `}
    >
        <Check size={12} className={`transition-all duration-300 ${completed ? 'animate-glitch text-white' : 'text-transparent group-hover:text-lumen-primary opacity-0 group-hover:opacity-100'}`} />
    </button>
);

const getPriorityColor = (p: PriorityType) => {
    switch(p) {
        case 'high': return 'bg-red-500/20 border-red-500/50 text-red-100';
        case 'medium': return 'bg-yellow-500/20 border-yellow-500/50 text-yellow-100';
        case 'low': return 'bg-green-500/20 border-green-500/50 text-green-100';
    }
}

const getStreakStyle = (streak: number) => {
    if (streak === 0) return "text-lumen-mute opacity-30";
    if (streak < 3) return "text-yellow-400";
    if (streak < 7) return "text-orange-500 drop-shadow-[0_0_5px_rgba(249,115,22,0.5)]";
    if (streak < 14) return "text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse-slow";
    return "text-lumen-secondary drop-shadow-[0_0_10px_rgba(217,70,239,0.8)] animate-pulse";
};

const PIXELS_PER_MINUTE = 1.5; 
const MINUTES_SNAP = 15;
const timeToMinutes = (time: string) => { const [h, m] = time.split(':').map(Number); return h * 60 + m; };
const minutesToTime = (minutes: number) => { const h = Math.floor(minutes / 60); const m = minutes % 60; return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`; };

export const Tasks: React.FC<TasksProps> = ({ tasks, setTasks, habits, setHabits, settings, setSettings, onAction, badges, onBreakdownGoal }) => {
  const today = new Date().toISOString().split('T')[0];
  const [activeSection, setActiveSection] = useState<'focus' | 'schedule' | 'habits'>('focus');
  
  // Modal State
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [newTaskText, setNewTaskText] = useState("");
  const [newTaskRecurrence, setNewTaskRecurrence] = useState<RecurrenceType>('none');
  const [newTaskPriority, setNewTaskPriority] = useState<PriorityType>('medium');
  const [newTaskDate, setNewTaskDate] = useState(today);
  const [newTaskTime, setNewTaskTime] = useState("");
  const [newTaskDuration, setNewTaskDuration] = useState(30);
  const [newTaskXP, setNewTaskXP] = useState(20);
  const [estimatingXP, setEstimatingXP] = useState(false);
  
  // Goal Breakdown Modal
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);
  const [breakdownGoal, setBreakdownGoal] = useState("");
  
  const [affirmation, setAffirmation] = useState<string>("");
  const [loadingAffirmation, setLoadingAffirmation] = useState(false);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  // Drag State
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [resizingId, setResizingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [previewSlot, setPreviewSlot] = useState<{ time: string, duration: number } | null>(null);
  const [ghostStyle, setGhostStyle] = useState<React.CSSProperties | null>(null); 
  const timelineRef = useRef<HTMLDivElement>(null);

  // Habit Form State
  const [habitFormText, setHabitFormText] = useState("");
  const [habitFormType, setHabitFormType] = useState<'build' | 'break'>('build');
  const [habitFormTime, setHabitFormTime] = useState("");
  const [habitFormDuration, setHabitFormDuration] = useState(30);

  // --- TIME BASED VISUALS ---
  const hour = new Date().getHours();
  let timeBackground = "bg-gradient-to-r from-lumen-primary/10 to-lumen-secondary/10";
  let TimeIcon = Sun;
  
  if (hour >= 5 && hour < 12) {
      timeBackground = "bg-gradient-to-br from-yellow-500/20 via-orange-500/10 to-lumen-primary/10"; // Morning
      TimeIcon = Sunrise;
  } else if (hour >= 12 && hour < 18) {
      timeBackground = "bg-gradient-to-br from-cyan-400/20 via-blue-500/10 to-lumen-primary/10"; // Afternoon
      TimeIcon = CloudSun;
  } else if (hour >= 18 && hour < 21) {
      timeBackground = "bg-gradient-to-br from-purple-500/20 via-pink-500/10 to-orange-500/10"; // Evening
      TimeIcon = Sun;
  } else {
      timeBackground = "bg-gradient-to-br from-indigo-900/40 via-purple-900/30 to-black/50"; // Night
      TimeIcon = Moon;
  }

  // --- DATA PREPARATION ---
  
  // 1. Process Tasks
  const timelineTasks = tasks.filter(t => t.date === today && t.dueTime && t.type === 'todo');
  const inboxTasks = tasks.filter(t => {
      const isToday = t.date === today;
      const isPast = t.date < today && !t.completed;
      return (isToday || isPast) && t.type === 'todo' && !t.dueTime;
  });
  const overviewTasks = tasks.filter(t => {
      const isFuture = t.date > today;
      const isRecurring = t.recurrence !== 'none';
      return (isFuture || isRecurring) && t.type === 'todo';
  });

  // 2. Process Habits into "Task-like" items for Timeline/Inbox
  const timelineHabits = habits.filter(h => h.time).map(h => ({
      id: `habit-${h.id}`,
      originalId: h.id,
      isHabit: true,
      text: h.title,
      completed: h.completedDates.includes(today),
      time: h.time,
      duration: h.duration || 30,
      priority: 'medium' as PriorityType, // Habits default to medium visualization
      xpValue: h.xpValue,
      type: h.type === 'build' ? 'habit_build' : 'habit_break' as any
  }));

  const inboxHabits = habits.filter(h => !h.time).map(h => ({
      id: `habit-${h.id}`,
      originalId: h.id,
      isHabit: true,
      text: h.title,
      completed: h.completedDates.includes(today),
      time: undefined,
      duration: h.duration || 30,
      priority: 'medium' as PriorityType,
      xpValue: h.xpValue,
      type: h.type === 'build' ? 'habit_build' : 'habit_break' as any
  }));

  // 3. Combined Arrays for Rendering
  const combinedTimelineItems: TimelineItem[] = [
      ...timelineTasks.map(t => ({ id: t.id, originalId: t.id, isHabit: false, text: t.text, completed: t.completed, time: t.dueTime, duration: t.duration || 30, priority: t.priority, xpValue: t.xpValue, type: 'todo' as const })),
      ...timelineHabits
  ];

  const combinedInboxItems: TimelineItem[] = [
      ...inboxTasks.map(t => ({ id: t.id, originalId: t.id, isHabit: false, text: t.text, completed: t.completed, time: t.dueTime, duration: t.duration || 30, priority: t.priority, xpValue: t.xpValue, type: 'todo' as const })),
      ...inboxHabits
  ];

  useEffect(() => { if (!affirmation) fetchAffirmation(); }, []);

  const fetchAffirmation = async () => {
    setLoadingAffirmation(true);
    setIsLiked(false);
    const result = await generateAffirmation(
        settings.sophusTone, 
        settings.likedQuotes,
        settings.quoteCategories,
        settings.customQuotePreference
    );
    setAffirmation(result);
    setLoadingAffirmation(false);
  };

  const handleLikeQuote = () => {
      if(isLiked) return;
      setIsLiked(true);
      const updatedLikes = [...(settings.likedQuotes || []), affirmation].slice(-20); // Keep last 20
      setSettings(prev => ({ ...prev, likedQuotes: updatedLikes }));
  };

  const estimateXP = async () => {
      if(!newTaskText) return;
      setEstimatingXP(true);
      const xp = await estimateTaskXP(newTaskText, newTaskPriority, newTaskDuration);
      setNewTaskXP(xp);
      setEstimatingXP(false);
  };

  const handleRecommendTasks = async () => {
      setLoadingRecommendations(true);
      const recs = await recommendTasks(inboxTasks, habits, "Self-improvement");
      recs.forEach(rec => {
          const newTask: Task = {
              id: Date.now().toString() + Math.random(),
              text: rec.text,
              completed: false,
              type: 'todo',
              date: today,
              recurrence: 'none',
              priority: rec.priority,
              duration: 30,
              xpValue: rec.xp
          };
          setTasks(prev => [...prev, newTask]);
      });
      setLoadingRecommendations(false);
  };

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    const newTask: Task = {
      id: Date.now().toString(),
      text: newTaskText,
      completed: false,
      type: 'todo',
      date: new Date(newTaskDate).toISOString().split('T')[0],
      recurrence: newTaskRecurrence,
      priority: newTaskPriority,
      duration: newTaskDuration,
      dueTime: newTaskTime || undefined,
      xpValue: newTaskXP
    };
    setTasks([...tasks, newTask]);
    setNewTaskText("");
    setIsAddTaskOpen(false);
  };

  const addHabit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!habitFormText.trim()) return;
      setHabits([...habits, {
          id: Date.now().toString(),
          title: habitFormText,
          type: habitFormType,
          completedDates: [],
          streak: 0,
          xpValue: 10,
          penaltyValue: 20,
          time: habitFormTime || undefined,
          duration: habitFormTime ? habitFormDuration : undefined
      }]);
      setHabitFormText("");
      setHabitFormTime("");
  };

  const handleBreakdownSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (breakdownGoal.trim() && onBreakdownGoal) {
          onBreakdownGoal(breakdownGoal);
          setBreakdownGoal("");
          setIsBreakdownOpen(false);
      }
  };

  const deleteTask = (id: string) => setTasks(tasks.filter(t => t.id !== id));
  const deleteHabit = (id: string) => setHabits(habits.filter(h => h.id !== id));

  // --- Interaction Handlers ---

  const getItemById = (id: string): TimelineItem | undefined => {
      return combinedTimelineItems.find(i => i.id === id) || combinedInboxItems.find(i => i.id === id);
  };

  const handleDragStart = (e: any, id: string, type: 'move' | 'resize') => {
      e.stopPropagation();
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      
      const item = getItemById(id);
      if (!item) return;

      if (type === 'resize') { setResizingId(id); setDragOffset(0); }
      else {
          setDraggingId(id);
          if (item.time && timelineRef.current) {
              const rect = timelineRef.current.getBoundingClientRect();
              setDragOffset(clientY - (rect.top - timelineRef.current.scrollTop + timeToMinutes(item.time) * PIXELS_PER_MINUTE));
          } else { setDragOffset(20); }
      }
      setGhostStyle({ position: 'fixed', left: clientX + 15, top: clientY + 15, zIndex: 9999, pointerEvents: 'none', opacity: 0.9 });
  };

  const handleMove = (e: any) => {
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    if (draggingId) setGhostStyle(prev => ({ ...prev!, left: clientX + 15, top: clientY + 15 }));
    
    if ((draggingId || resizingId) && timelineRef.current) {
        const rect = timelineRef.current.getBoundingClientRect();
        if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top - 50 && clientY <= rect.bottom + 50) {
            const relY = clientY - rect.top + timelineRef.current.scrollTop;
            const item = getItemById(draggingId || resizingId!);
            
            if (draggingId) {
                const snapped = Math.round(((relY - dragOffset) / PIXELS_PER_MINUTE) / MINUTES_SNAP) * MINUTES_SNAP;
                setPreviewSlot({ time: minutesToTime(Math.max(0, Math.min(1425, snapped))), duration: item?.duration || 30 });
            } else if (resizingId) {
                if(item?.time) {
                    const diff = relY - (timeToMinutes(item.time) * PIXELS_PER_MINUTE);
                    setPreviewSlot({ time: item.time, duration: Math.max(15, Math.round((diff / PIXELS_PER_MINUTE) / MINUTES_SNAP) * MINUTES_SNAP) });
                }
            }
        } else { setPreviewSlot(null); }
    }
  };

  const handleEnd = (e: any) => {
    const id = draggingId || resizingId;
    if (!id) return;

    const item = getItemById(id);
    if (!item) return;

    if (previewSlot) {
        // Scheduled on Timeline
        if (item.isHabit) {
             setHabits(prev => prev.map(h => h.id === item.originalId ? { ...h, time: draggingId ? previewSlot.time : h.time, duration: previewSlot.duration } : h));
        } else {
             setTasks(prev => prev.map(t => t.id === item.originalId ? { ...t, dueTime: draggingId ? previewSlot.time : t.dueTime, duration: previewSlot.duration } : t));
        }
    } else if (draggingId) {
        // Dropped potentially in Inbox
        const inboxEl = document.getElementById('inbox-container');
        if (inboxEl) {
             const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
             const clientY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;
             const rect = inboxEl.getBoundingClientRect();
             if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
                 if (item.isHabit) {
                     setHabits(prev => prev.map(h => h.id === item.originalId ? { ...h, time: undefined } : h));
                 } else {
                     setTasks(prev => prev.map(t => t.id === item.originalId ? { ...t, dueTime: undefined } : t));
                 }
             }
        }
    }
    setDraggingId(null); setResizingId(null); setGhostStyle(null); setPreviewSlot(null);
  };

  useEffect(() => {
      if (draggingId || resizingId) {
          window.addEventListener('mousemove', handleMove); window.addEventListener('mouseup', handleEnd);
          window.addEventListener('touchmove', handleMove, { passive: false }); window.addEventListener('touchend', handleEnd);
      }
      return () => {
          window.removeEventListener('mousemove', handleMove); window.removeEventListener('mouseup', handleEnd);
          window.removeEventListener('touchmove', handleMove); window.removeEventListener('touchend', handleEnd);
      };
  }, [draggingId, resizingId, previewSlot]);

  // Handle completion toggle
  const toggleItem = (item: TimelineItem) => {
      if (item.isHabit) {
          onAction('habit_toggle', item.originalId);
      } else {
          onAction('task_complete', item.originalId);
      }
  };

  return (
    <div className="h-full flex flex-col space-y-6 animate-fadeIn relative">
       {draggingId && ghostStyle && <div style={ghostStyle} className="bg-lumen-primary/90 p-3 rounded-xl border border-white/20 shadow-2xl w-48"><span className="text-white text-sm">{getItemById(draggingId)?.text}</span></div>}

       {/* Create Task Modal */}
       {isAddTaskOpen && (
           <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center p-4">
               <div className="bg-[#0f172a] border border-white/10 w-full max-w-md rounded-2xl p-6 shadow-2xl">
                   <div className="flex justify-between items-center mb-6">
                       <h3 className="text-xl font-bold text-white">New Mission</h3>
                       <button onClick={() => setIsAddTaskOpen(false)} className="text-lumen-mute hover:text-white"><X size={24} /></button>
                   </div>
                   <form onSubmit={addTask} className="space-y-4">
                       <input autoFocus type="text" value={newTaskText} onChange={(e) => setNewTaskText(e.target.value)} placeholder="Objective..." className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-lg" />
                       <div className="grid grid-cols-2 gap-4">
                           <input type="date" value={newTaskDate} onChange={(e) => setNewTaskDate(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white" />
                           <input type="time" value={newTaskTime} onChange={(e) => setNewTaskTime(e.target.value)} className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white" />
                       </div>
                       {newTaskTime && <input type="range" min="15" max="180" step="15" value={newTaskDuration} onChange={(e) => setNewTaskDuration(parseInt(e.target.value))} className="w-full" />}
                       <div className="flex gap-2 bg-white/5 p-2 rounded-xl">
                            {['low','medium','high'].map(p => (
                                <button key={p} type="button" onClick={() => setNewTaskPriority(p as any)} className={`flex-1 capitalize py-2 rounded-lg text-xs font-bold ${newTaskPriority === p ? getPriorityColor(p as any) : 'text-lumen-mute'}`}>{p}</button>
                            ))}
                       </div>
                       
                       {/* Sophus XP Estimator */}
                       <div className="flex items-center gap-2">
                           <div className="flex-1 bg-white/5 rounded-xl px-4 py-3 text-white flex justify-between items-center border border-white/5">
                               <div className="flex flex-col">
                                   <span className="text-[10px] text-lumen-mute uppercase tracking-wider">Reward</span>
                                   <span className="font-bold text-lumen-primary text-lg">{newTaskXP} XP</span>
                               </div>
                           </div>
                           <button 
                                type="button" 
                                onClick={estimateXP} 
                                disabled={!newTaskText || estimatingXP} 
                                className="bg-lumen-secondary/10 border border-lumen-secondary/50 text-lumen-secondary p-3 rounded-xl flex items-center gap-2 hover:bg-lumen-secondary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Ask Sophus to estimate XP based on difficulty"
                           >
                               {estimatingXP ? <RefreshCw className="animate-spin" size={20} /> : <Bot size={20} />}
                               <span className="text-xs font-bold">Est. XP</span>
                           </button>
                       </div>

                       <select value={newTaskRecurrence} onChange={(e) => setNewTaskRecurrence(e.target.value as any)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white">
                            <option value="none">One-time</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option>
                       </select>
                       <button type="submit" disabled={!newTaskText.trim()} className="w-full liquid-button py-4 rounded-xl text-white font-bold text-lg mt-4">Initialize Mission</button>
                   </form>
               </div>
           </div>
       )}

       {/* Goal Breakdown Modal */}
       {isBreakdownOpen && (
           <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
               <div className="bg-[#0f172a] border border-lumen-primary/50 w-full max-w-md rounded-2xl p-6 shadow-[0_0_50px_rgba(139,92,246,0.2)]">
                   <div className="flex justify-between items-center mb-6">
                       <h3 className="text-xl font-bold text-white flex items-center gap-2">
                           <Goal className="text-lumen-primary" /> Goal Deconstruction
                       </h3>
                       <button onClick={() => setIsBreakdownOpen(false)} className="text-lumen-mute hover:text-white"><X size={24} /></button>
                   </div>
                   <p className="text-sm text-lumen-mute mb-4">Sophus will interview you to understand your goal, then generate a step-by-step roadmap.</p>
                   <form onSubmit={handleBreakdownSubmit} className="space-y-4">
                       <textarea 
                            autoFocus 
                            value={breakdownGoal} 
                            onChange={(e) => setBreakdownGoal(e.target.value)} 
                            placeholder="e.g. Become a Senior Full-Stack Developer in 6 months..." 
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-base min-h-[100px] focus:border-lumen-primary focus:outline-none" 
                       />
                       <button type="submit" disabled={!breakdownGoal.trim()} className="w-full liquid-button py-3 rounded-xl text-white font-bold flex items-center justify-center gap-2">
                           <Bot size={18} /> Initiate Protocol
                       </button>
                   </form>
               </div>
           </div>
       )}

       <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div><h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-lumen-accent to-lumen-secondary">Focus & Flow</h1><p className="text-lumen-mute text-sm mt-1">Align your intentions.</p></div>
          
          <div className="flex items-center gap-2">
             <button 
                onClick={() => setIsBreakdownOpen(true)}
                className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-lumen-primary/30 text-lumen-primary bg-lumen-primary/5 hover:bg-lumen-primary/10 transition-colors text-xs font-bold uppercase tracking-wider"
             >
                 <Goal size={14} /> Breakdown Goal
             </button>
             
             <div className="flex bg-white/5 rounded-lg p-1 gap-1">
                {['focus', 'habits', 'schedule'].map(s => (
                    <button key={s} onClick={() => setActiveSection(s as any)} className={`px-3 py-1 text-xs font-medium rounded-md capitalize ${activeSection === s ? 'bg-lumen-primary text-white' : 'text-lumen-mute hover:text-white'}`}>{s === 'focus' ? 'Day Plan' : s}</button>
                ))}
             </div>
          </div>
       </header>

       {/* Mobile breakdown button (visible only on small screens) */}
       <button 
            onClick={() => setIsBreakdownOpen(true)}
            className="md:hidden flex items-center justify-center gap-2 w-full py-2 rounded-lg border border-lumen-primary/30 text-lumen-primary bg-lumen-primary/5 text-xs font-bold uppercase"
        >
             <Goal size={14} /> Breakdown Big Goal
       </button>

       {activeSection === 'focus' && (
           <>
            {/* Dynamic Affirmation Card */}
            <div className={`glass-panel p-6 rounded-2xl relative overflow-hidden group mb-4 transition-all duration-1000 ${timeBackground} border border-white/10`}>
                <div className="absolute top-0 right-0 p-4 opacity-10 animate-pulse-slow">
                    <TimeIcon size={120} />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
                    <div className="flex-1">
                        <p className={`text-xl md:text-2xl font-serif italic text-white leading-relaxed drop-shadow-md`}>
                            "{affirmation}"
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button 
                            onClick={handleLikeQuote}
                            className={`p-3 rounded-full transition-all duration-300 transform active:scale-95
                            ${isLiked ? 'bg-pink-500/20 text-pink-500' : 'bg-white/5 text-white/50 hover:text-pink-400 hover:bg-white/10'}`}
                        >
                            <Heart size={20} fill={isLiked ? "currentColor" : "none"} className={isLiked ? "animate-neon-burst" : ""} />
                        </button>
                        <button 
                            onClick={fetchAffirmation} 
                            disabled={loadingAffirmation}
                            className="p-3 rounded-full bg-white/5 text-white/50 hover:text-white hover:bg-white/10 transition-all"
                        >
                            <RefreshCw size={20} className={`${loadingAffirmation ? 'animate-spin':''}`} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 h-[calc(100vh-350px)] min-h-[500px]">
                {/* Timeline */}
                <div className="flex-[2] glass-panel rounded-2xl p-4 flex flex-col relative border border-white/10">
                    <div className="flex justify-between mb-2"><h3 className="text-white font-medium flex gap-2"><Clock size={16}/> Timeline</h3><span className="text-[10px] text-lumen-mute">Drag to schedule</span></div>
                    <div ref={timelineRef} className="relative flex-1 overflow-y-auto custom-scrollbar bg-black/20 rounded-xl">
                        <div style={{ height: `${24 * 60 * PIXELS_PER_MINUTE}px` }} className="absolute w-full">
                            {[...Array(24)].map((_, i) => <div key={i} className="absolute w-full border-t border-white/5" style={{ top: i * 60 * PIXELS_PER_MINUTE }}><span className="absolute -top-3 left-1 text-[10px] text-lumen-mute">{i}:00</span></div>)}
                            <div className="absolute w-full border-t border-red-500 z-10 opacity-50 pointer-events-none" style={{ top: `${(new Date().getHours() * 60 + new Date().getMinutes()) * PIXELS_PER_MINUTE}px` }}></div>
                            {previewSlot && <div style={{ top: `${timeToMinutes(previewSlot.time) * PIXELS_PER_MINUTE}px`, height: `${previewSlot.duration * PIXELS_PER_MINUTE}px` }} className="absolute left-2 right-2 border-2 border-dashed border-lumen-secondary/50 bg-lumen-secondary/10 z-0 animate-pulse rounded-lg"></div>}
                            
                            {combinedTimelineItems.map(item => (
                                <div key={item.id} style={{ top: `${timeToMinutes(item.time!) * PIXELS_PER_MINUTE}px`, height: `${(item.duration) * PIXELS_PER_MINUTE}px` }}
                                    className={`absolute left-10 right-2 rounded-lg p-2 text-xs border flex flex-col group 
                                        ${item.isHabit ? 'bg-lumen-secondary/10 border-lumen-secondary/30' : getPriorityColor(item.priority)} 
                                        ${item.completed ? 'grayscale opacity-60' : ''}`}
                                    onMouseDown={(e) => handleDragStart(e, item.id, 'move')} onTouchStart={(e) => handleDragStart(e, item.id, 'move')}>
                                    <div className="flex justify-between pointer-events-none">
                                        <span className="font-bold truncate flex items-center gap-1">
                                            {item.isHabit && <Shield size={10} />} {item.text}
                                        </span>
                                        <div className="pointer-events-auto">
                                            <CompletionCheck completed={item.completed} isHabit={item.isHabit} onClick={(e) => { e.stopPropagation(); toggleItem(item); }} />
                                        </div>
                                    </div>
                                    <span className="mt-auto opacity-70">{item.time} - {item.xpValue} XP</span>
                                    <div className="absolute bottom-0 left-0 right-0 h-3 cursor-row-resize z-20" onMouseDown={(e) => handleDragStart(e, item.id, 'resize')} onTouchStart={(e) => handleDragStart(e, item.id, 'resize')}></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Inbox */}
                <div id="inbox-container" className="flex-1 glass-panel rounded-2xl p-4 flex flex-col border border-white/10">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-white font-medium flex gap-2"><Plus size={16}/> Inbox (Today)</h3>
                        <button 
                            onClick={handleRecommendTasks} 
                            title="Ask Sophus for tasks" 
                            className="bg-transparent border-none p-0 cursor-pointer text-lumen-secondary hover:scale-110 transition-transform"
                        >
                            <Bot size={16} className={loadingRecommendations ? 'animate-spin' : ''} />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2">
                        {combinedInboxItems.map(item => (
                            <div key={item.id} className={`p-3 rounded-xl bg-white/5 border border-white/5 flex gap-3 group hover:bg-white/10 cursor-grab active:cursor-grabbing ${draggingId === item.id ? 'opacity-30' : ''}`}
                                onMouseDown={(e) => handleDragStart(e, item.id, 'move')} onTouchStart={(e) => handleDragStart(e, item.id, 'move')}>
                                <GripVertical size={16} className="text-lumen-mute" />
                                <CompletionCheck completed={item.completed} isHabit={item.isHabit} onClick={(e) => { e.stopPropagation(); toggleItem(item); }} />
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm text-white truncate flex items-center gap-1 ${item.completed?'line-through':''}`}>
                                        {item.isHabit && <Shield size={12} className="text-lumen-secondary" />} {item.text}
                                    </p>
                                    <div className="flex gap-2 mt-1">
                                        {!item.isHabit && <span className={`text-[9px] px-1 rounded uppercase ${getPriorityColor(item.priority)}`}>{item.priority}</span>}
                                        <span className="text-xs text-lumen-primary">{item.xpValue} XP</span>
                                    </div>
                                </div>
                                {!item.isHabit && <button onClick={(e) => { e.stopPropagation(); deleteTask(item.originalId); }} className="opacity-0 group-hover:opacity-100"><Trash size={14}/></button>}
                            </div>
                        ))}
                    </div>
                    <button 
                        onClick={() => {
                            setNewTaskDate(today);
                            setIsAddTaskOpen(true);
                        }} 
                        className="w-full mt-4 py-3 rounded-xl border border-dashed border-white/20 text-lumen-mute hover:text-white flex justify-center gap-2 text-sm"
                    >
                        New Mission
                    </button>
                </div>
            </div>
           </>
       )}

       {activeSection === 'habits' && (
           <div className="flex-1 glass-panel rounded-2xl p-6 flex flex-col">
               <h3 className="text-white font-medium mb-6 flex items-center gap-2"><Shield size={18} className="text-lumen-secondary" /> Habit Formation</h3>
               <form onSubmit={addHabit} className="flex flex-col gap-3 mb-6 bg-white/5 p-4 rounded-xl border border-white/10">
                   <div className="flex gap-3">
                        <select value={habitFormType} onChange={(e) => setHabitFormType(e.target.value as any)} className="bg-black/20 border border-white/10 rounded-lg text-white p-2 text-sm"><option value="build">Build</option><option value="break">Break</option></select>
                        <input type="text" value={habitFormText} onChange={(e) => setHabitFormText(e.target.value)} placeholder="New habit..." className="flex-1 bg-transparent border-b border-white/20 text-white focus:outline-none" />
                   </div>
                   <div className="flex items-center gap-4 text-xs text-lumen-mute">
                       <div className="flex items-center gap-2">
                           <Clock size={12} />
                           <input type="time" value={habitFormTime} onChange={(e) => setHabitFormTime(e.target.value)} className="bg-black/20 border border-white/10 rounded px-2 py-1 text-white" />
                           <span>Optional Time</span>
                       </div>
                       {habitFormTime && (
                           <div className="flex items-center gap-2">
                               <span>Duration (min):</span>
                               <input type="number" min="15" step="15" value={habitFormDuration} onChange={(e) => setHabitFormDuration(parseInt(e.target.value))} className="w-16 bg-black/20 border border-white/10 rounded px-2 py-1 text-white" />
                           </div>
                       )}
                   </div>
                   <button type="submit" className="self-end px-4 py-1 bg-lumen-primary/20 text-lumen-primary rounded-lg text-sm hover:bg-lumen-primary/40">Add Habit</button>
               </form>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {habits.map(habit => {
                       const completedToday = habit.completedDates.includes(today);
                       return (
                           <div key={habit.id} className="bg-white/5 border border-white/5 rounded-xl p-4 group relative overflow-hidden">
                               <div className="flex justify-between items-start relative z-10">
                                   <div>
                                       <span className="text-white font-medium flex items-center gap-2">
                                            {habit.type==='build'?<Shield size={14}/>:<ShieldAlert size={14}/>} 
                                            {habit.title}
                                       </span>
                                       {habit.time && <div className="text-xs text-lumen-mute mt-1 flex items-center gap-1"><Clock size={10} /> {habit.time} ({habit.duration}m)</div>}
                                   </div>
                                   
                                   {/* Prominent Streak Indicator */}
                                   <div className="flex items-center gap-3">
                                        <div className={`flex items-center gap-1 font-bold ${getStreakStyle(habit.streak)} transition-all duration-500`} title="Current Streak">
                                            <Flame size={habit.streak > 20 ? 24 : 18} fill={habit.streak > 0 ? "currentColor" : "none"} />
                                            <span className="text-lg">{habit.streak}</span>
                                        </div>
                                        <button onClick={()=>deleteHabit(habit.id)} className="opacity-0 group-hover:opacity-100 text-lumen-mute hover:text-white transition-opacity"><Trash size={14}/></button>
                                   </div>
                               </div>
                               <div className="flex justify-between items-end mt-4 relative z-10">
                                   <div className="text-xs text-lumen-mute">Reward: <span className="text-lumen-primary">{habit.xpValue} XP</span></div>
                                   <div className="flex gap-2">
                                       {habit.type === 'break' && (
                                           <button onClick={() => onAction('habit_relapse', habit.id)} className="px-3 py-1.5 rounded border border-red-500/30 text-red-400 text-xs hover:bg-red-500/20 transition-colors font-medium">Relapse</button>
                                       )}
                                       <button onClick={() => onAction('habit_toggle', habit.id)} className={`px-4 py-1.5 rounded text-xs font-bold border transition-all shadow-lg ${completedToday ? 'bg-lumen-accent border-lumen-accent text-white shadow-lumen-accent/30' : 'border-white/20 text-lumen-mute hover:border-white/50 hover:text-white'}`}>{completedToday ? 'Done' : 'Mark'}</button>
                                   </div>
                               </div>
                               {/* Subtle background glow based on streak */}
                               {habit.streak > 7 && <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-lumen-secondary/10 blur-[50px] rounded-full pointer-events-none"></div>}
                           </div>
                       )
                   })}
               </div>
           </div>
       )}

       {activeSection === 'schedule' && (
           <div className="flex-1 glass-panel rounded-2xl p-6 flex flex-col">
               <div className="flex justify-between items-center mb-6">
                   <h3 className="text-white font-medium flex items-center gap-2"><CalendarIcon size={18} className="text-lumen-accent" /> Overview (Future & Recurring)</h3>
                   <button onClick={()=>setSettings({...settings, calendarSynced: !settings.calendarSynced})} className={`flex gap-2 px-3 py-1 text-xs border rounded ${settings.calendarSynced ? 'bg-green-500/10 text-green-400' : 'text-lumen-mute'}`}><Link2 size={12}/> {settings.calendarSynced?'Synced':'Sync Google Calendar'}</button>
               </div>
               {settings.calendarSynced && <div className="text-xs text-center text-lumen-mute mb-4">Note: Integration simulated. In a real app, this would open OAuth flow.</div>}
               <div className="space-y-3">
                   {overviewTasks.map(task => (
                       <div key={task.id} className="bg-white/5 rounded-xl p-4 border border-white/5 flex gap-4">
                           <div className="flex flex-col items-center justify-center w-16 bg-black/20 rounded-lg p-2 text-lumen-accent border border-white/5">
                               <span className="text-xs font-bold uppercase">{new Date(task.date).toLocaleDateString(undefined,{weekday:'short'})}</span>
                               <span className="text-lg font-bold">{new Date(task.date).getDate()}</span>
                           </div>
                           <div className="flex-1">
                               <h4 className="text-white font-medium">{task.text}</h4>
                               <div className="flex gap-3 mt-2 text-xs text-lumen-mute">
                                   {task.recurrence !== 'none' && <span className="flex gap-1 items-center"><Repeat size={12}/> {task.recurrence}</span>}
                                   {task.dueTime && <span className="flex gap-1 items-center"><Clock size={12}/> {task.dueTime}</span>}
                                   <span className={`px-1.5 py-0.5 rounded uppercase text-[9px] ${getPriorityColor(task.priority)}`}>{task.priority}</span>
                               </div>
                           </div>
                           <button onClick={()=>deleteTask(task.id)} className="text-lumen-mute hover:text-red-400"><Trash size={14}/></button>
                       </div>
                   ))}
                   {overviewTasks.length === 0 && <div className="text-center text-lumen-mute/50 py-10">No upcoming tasks scheduled.</div>}
               </div>
               <button 
                   onClick={() => {
                       const tmrw = new Date();
                       tmrw.setDate(tmrw.getDate() + 1);
                       setNewTaskDate(tmrw.toISOString().split('T')[0]);
                       setIsAddTaskOpen(true);
                   }}
                   className="w-full mt-4 py-3 rounded-xl border border-dashed border-white/20 text-lumen-mute hover:text-white flex justify-center gap-2 text-sm transition-colors"
               >
                   <Plus size={16} /> Schedule Future Mission
               </button>
           </div>
       )}
    </div>
  );
};