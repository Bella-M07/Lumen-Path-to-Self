
import React, { useState, useEffect } from 'react';
import { JournalEntry, MoodLog, MoodType, JournalType, UserSettings } from '../types';
import { generateJournalPrompt, analyzeMoodTrends, generateCheckInQuestions } from '../services/geminiService';
import { PenLine, Plus, Sparkles, Trash2, Calendar, Frown, Meh, Smile, Zap, AlertCircle, Sun, CloudSun, Moon, Stars, ArrowRight, Flame, Heart, Wind, BatteryLow, CloudLightning, Activity, AlertTriangle, Layers, Coffee } from 'lucide-react';

interface JournalProps {
  entries: JournalEntry[];
  setEntries: React.Dispatch<React.SetStateAction<JournalEntry[]>>;
  moodLogs: MoodLog[];
  setMoodLogs: React.Dispatch<React.SetStateAction<MoodLog[]>>;
  onAction: (action: 'journal_add' | 'mood_log') => void;
  userName: string;
  settings: UserSettings;
}

export const Journal: React.FC<JournalProps> = ({ 
  entries, 
  setEntries, 
  moodLogs, 
  setMoodLogs, 
  onAction, 
  userName,
  settings
}) => {
  const [activeType, setActiveType] = useState<JournalType>('free');
  const [isWriting, setIsWriting] = useState(false);
  
  // Data State
  const [currentPrompt, setCurrentPrompt] = useState<string>("");
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(false);
  
  // Writing State
  const [content, setContent] = useState("");
  
  // Structured Check-in State
  const [checkInQuestions, setCheckInQuestions] = useState<string[]>([]);
  const [checkInRatings, setCheckInRatings] = useState<number[]>([5, 5, 5]);
  const [checkInComments, setCheckInComments] = useState<string[]>(["", "", ""]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);

  // Mood State
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null);
  const [moodNote, setMoodNote] = useState("");
  const [showMoodInput, setShowMoodInput] = useState(false);
  const [moodAnalysis, setMoodAnalysis] = useState<string | null>(null);
  const [analyzingMood, setAnalyzingMood] = useState(false);

  // Quick Write State for Landing
  const [quickWriteText, setQuickWriteText] = useState("");

  const moods: { type: MoodType; icon: any; color: string }[] = [
    { type: 'Excited', icon: Zap, color: 'text-yellow-400' },
    { type: 'Happy', icon: Smile, color: 'text-pink-400' },
    { type: 'Motivated', icon: Flame, color: 'text-orange-400' },
    { type: 'Content', icon: Coffee, color: 'text-emerald-400' },
    { type: 'Grateful', icon: Heart, color: 'text-red-400' },
    { type: 'Calm', icon: Wind, color: 'text-cyan-400' },
    { type: 'Tired', icon: BatteryLow, color: 'text-slate-400' },
    { type: 'Sad', icon: Frown, color: 'text-indigo-400' },
    { type: 'Anxious', icon: CloudLightning, color: 'text-violet-400' },
    { type: 'Stressed', icon: Activity, color: 'text-rose-500' },
    { type: 'Frustrated', icon: AlertTriangle, color: 'text-orange-500' },
    { type: 'Overwhelmed', icon: Layers, color: 'text-red-500' },
  ];

  const checkInTabs: { id: JournalType; icon: any; label: string }[] = [
    { id: 'free', icon: PenLine, label: 'Free Write' },
    { id: 'morning', icon: Sun, label: 'Morning' },
    { id: 'afternoon', icon: CloudSun, label: 'Afternoon' },
    { id: 'evening', icon: Moon, label: 'Evening' },
    { id: 'night', icon: Stars, label: 'Night' },
  ];

  // Calculate time of day for landing page card
  const hour = new Date().getHours();
  let timeContext: { type: JournalType; label: string; icon: any } = { type: 'morning', label: 'Morning Affirmation', icon: Sun };
  if (hour >= 12 && hour < 17) timeContext = { type: 'afternoon', label: 'Afternoon Check-in', icon: CloudSun };
  else if (hour >= 17 && hour < 21) timeContext = { type: 'evening', label: 'Evening Reflection', icon: Moon };
  else if (hour >= 21 || hour < 5) timeContext = { type: 'night', label: 'Night Rewind', icon: Stars };

  const fetchPrompt = async () => {
    setIsLoadingPrompt(true);
    const recentText = entries.slice(0, 3).map(e => e.content).join(" ");
    const prompt = await generateJournalPrompt(recentText, settings.shareJournalContent);
    setCurrentPrompt(prompt);
    setIsLoadingPrompt(false);
  };

  // Fetch prompt on mount if empty
  useEffect(() => {
    if (!currentPrompt) fetchPrompt();
  }, []);

  const fetchCheckInQuestions = async (type: JournalType) => {
    if (type === 'free') return;
    setIsLoadingQuestions(true);
    const questions = await generateCheckInQuestions(type, settings.sophusTone);
    setCheckInQuestions(questions);
    setCheckInRatings(new Array(questions.length).fill(5));
    setCheckInComments(new Array(questions.length).fill(""));
    setIsLoadingQuestions(false);
  };

  const handleMoodAnalysis = async () => {
      setAnalyzingMood(true);
      const analysis = await analyzeMoodTrends(moodLogs, userName);
      setMoodAnalysis(analysis);
      setAnalyzingMood(false);
  };

  // Trigger question fetch when switching structured tabs inside writer
  useEffect(() => {
    if (activeType !== 'free' && isWriting) {
        fetchCheckInQuestions(activeType);
    }
  }, [activeType, isWriting]);

  const startWriting = (type: JournalType) => {
      setActiveType(type);
      setIsWriting(true);
      if (type === 'free' && quickWriteText) {
          setContent(quickWriteText);
          setQuickWriteText("");
      }
  };

  const handleSaveEntry = () => {
    if (activeType === 'free' && !content.trim()) return;
    if (activeType !== 'free' && checkInComments.every(c => !c.trim())) return; 

    const newEntry: JournalEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      content: activeType === 'free' ? content : `Completed ${activeType} check-in`,
      prompt: activeType === 'free' ? currentPrompt : undefined,
      type: activeType,
      checkInData: activeType !== 'free' ? checkInQuestions.map((q, i) => ({
          question: q,
          rating: checkInRatings[i],
          comment: checkInComments[i]
      })) : undefined
    };
    
    setEntries([newEntry, ...entries]);
    onAction('journal_add');
    setIsWriting(false);
    setContent("");
    setCheckInQuestions([]);
  };

  const handleQuickWriteSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if(!quickWriteText.trim()) return;
      
      const newEntry: JournalEntry = {
          id: Date.now().toString(),
          date: new Date().toISOString(),
          content: quickWriteText,
          type: 'free'
      };
      setEntries([newEntry, ...entries]);
      onAction('journal_add');
      setQuickWriteText("");
  };

  const handleSaveMood = () => {
      if (!selectedMood) return;
      const newLog: MoodLog = {
          id: Date.now().toString(),
          date: new Date().toISOString(),
          mood: selectedMood,
          note: moodNote
      };
      setMoodLogs([...moodLogs, newLog]);
      onAction('mood_log');
      setSelectedMood(null);
      setMoodNote("");
      setShowMoodInput(false);
  };

  const deleteEntry = (id: string) => {
    setEntries(entries.filter(e => e.id !== id));
  };

  return (
    <div className="h-full flex flex-col space-y-6 animate-fadeIn">
      <header className="flex flex-wrap justify-between items-center gap-4 mb-2">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-lumen-primary to-lumen-accent">
            Journal
          </h1>
          <p className="text-lumen-mute text-sm mt-1">Reflect on your journey.</p>
        </div>
        <div className="flex gap-2">
             {!showMoodInput && (
                <button
                    onClick={() => setShowMoodInput(true)}
                    className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-lumen-secondary text-sm font-medium hover:bg-white/10 transition-all"
                >
                    Log Mood
                </button>
            )}
            {!isWriting && (
            <button
                onClick={() => startWriting('free')}
                className="liquid-button px-4 py-2 rounded-full flex items-center gap-2 text-white font-medium text-sm"
            >
                <Plus size={18} /> New Entry
            </button>
            )}
        </div>
      </header>

      {/* Mood Tracker Section */}
      {showMoodInput && (
          <div className="glass-panel p-6 rounded-2xl border-l-4 border-lumen-accent animate-slideIn mb-4">
              <h3 className="text-lumen-text font-semibold mb-4">How are you feeling right now?</h3>
              <div className="grid grid-cols-4 md:grid-cols-6 gap-3 mb-6">
                  {moods.map((m) => (
                      <button
                        key={m.type}
                        onClick={() => setSelectedMood(m.type)}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all duration-300 aspect-square group relative overflow-hidden
                        ${m.color}
                        ${selectedMood === m.type 
                            ? 'bg-white/5 border-current shadow-[0_0_20px_currentColor] scale-105' 
                            : 'bg-transparent border-white/5 opacity-60 hover:opacity-100 hover:scale-105 hover:bg-white/5 hover:border-white/20'}`}
                      >
                          {selectedMood === m.type && (
                              <div className="absolute inset-0 bg-current opacity-20 blur-md animate-pulse-slow"></div>
                          )}
                          <m.icon 
                            size={24} 
                            className={`mb-2 transition-all duration-300 relative z-10 ${selectedMood === m.type ? 'scale-110 drop-shadow-[0_0_8px_currentColor]' : 'group-hover:scale-110'}`} 
                          />
                          <span className="text-[10px] md:text-xs font-bold tracking-wide relative z-10">{m.type}</span>
                      </button>
                  ))}
              </div>
              {selectedMood && (
                  <div className="animate-fadeIn">
                      <input 
                        type="text"
                        value={moodNote}
                        onChange={(e) => setMoodNote(e.target.value)}
                        placeholder="What triggered this feeling? (Optional)"
                        className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 text-white text-sm mb-3 focus:border-lumen-accent focus:outline-none placeholder-lumen-mute/50"
                        autoFocus
                      />
                      <div className="flex justify-end gap-2">
                          <button onClick={() => setShowMoodInput(false)} className="text-lumen-mute text-sm px-3 py-1 hover:text-white">Cancel</button>
                          <button onClick={handleSaveMood} className="bg-lumen-accent text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-blue-600 shadow-lg transition-all">
                            Save Mood
                          </button>
                      </div>
                  </div>
              )}
               {!selectedMood && (
                  <div className="flex justify-end">
                       <button onClick={() => setShowMoodInput(false)} className="text-lumen-mute text-sm px-3 py-1 hover:text-white">Close</button>
                  </div>
              )}
          </div>
      )}

      {isWriting ? (
        <div className="glass-panel rounded-2xl flex-1 flex flex-col border border-white/5 animate-slideIn overflow-hidden">
            
            {/* Writing Tabs */}
            <div className="flex items-center bg-black/20 border-b border-white/5 overflow-x-auto custom-scrollbar">
                {checkInTabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveType(tab.id)}
                        className={`flex items-center gap-2 px-5 py-4 text-sm font-medium transition-colors whitespace-nowrap
                        ${activeType === tab.id ? 'text-lumen-secondary bg-white/5' : 'text-lumen-mute hover:text-white hover:bg-white/5'}`}
                    >
                        <tab.icon size={16} className={activeType === tab.id ? 'text-lumen-secondary' : 'text-lumen-mute'} />
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="p-6 flex-1 flex flex-col overflow-y-auto">
                {activeType === 'free' ? (
                    <>
                        <div className="mb-4">
                            <div className="flex justify-between items-start">
                            <span className="text-xs font-bold uppercase tracking-wider text-lumen-secondary mb-2 block">Daily Prompt</span>
                            <button onClick={fetchPrompt} className="text-lumen-mute hover:text-white transition-colors">
                                <Sparkles size={16} className={isLoadingPrompt ? "animate-spin" : ""} />
                            </button>
                            </div>
                            {isLoadingPrompt ? (
                                <div className="h-6 w-3/4 bg-white/5 rounded animate-pulse"></div>
                            ) : (
                                <p className="text-lg font-serif italic text-lumen-text/90">"{currentPrompt}"</p>
                            )}
                        </div>
                        <textarea
                            className="flex-1 bg-transparent border-none resize-none focus:ring-0 text-lumen-text placeholder-lumen-mute/50 text-base leading-relaxed h-64"
                            placeholder="Start writing here..."
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            autoFocus
                        />
                    </>
                ) : (
                    <div className="space-y-8">
                        {isLoadingQuestions ? (
                            <div className="flex flex-col gap-6">
                                {[1,2,3].map(i => (
                                    <div key={i} className="animate-pulse">
                                        <div className="h-4 bg-white/10 rounded w-2/3 mb-3"></div>
                                        <div className="h-10 bg-white/5 rounded w-full"></div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            checkInQuestions.map((question, idx) => (
                                <div key={idx} className="space-y-3 animate-fadeIn" style={{ animationDelay: `${idx * 100}ms` }}>
                                    <label className="block text-lumen-text font-medium text-lg">{question}</label>
                                    
                                    {/* Slider */}
                                    <div className="flex items-center gap-4 bg-white/5 p-3 rounded-xl">
                                        <span className="text-xs text-lumen-mute w-8 text-center">{checkInRatings[idx]}</span>
                                        <input 
                                            type="range" 
                                            min="0" 
                                            max="10" 
                                            value={checkInRatings[idx]}
                                            onChange={(e) => {
                                                const newRatings = [...checkInRatings];
                                                newRatings[idx] = parseInt(e.target.value);
                                                setCheckInRatings(newRatings);
                                            }}
                                            className="flex-1 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-lumen-secondary"
                                        />
                                        <span className="text-xs text-lumen-mute">10</span>
                                    </div>

                                    {/* Comment */}
                                    <input
                                        type="text"
                                        placeholder="Add a note..."
                                        value={checkInComments[idx]}
                                        onChange={(e) => {
                                            const newComments = [...checkInComments];
                                            newComments[idx] = e.target.value;
                                            setCheckInComments(newComments);
                                        }}
                                        className="w-full bg-transparent border-b border-white/10 px-2 py-2 text-sm text-lumen-text focus:border-lumen-secondary focus:outline-none placeholder-lumen-mute/50 transition-colors"
                                    />
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
          
            <div className="p-4 border-t border-white/10 flex justify-end gap-3 bg-black/20">
                <button 
                    onClick={() => setIsWriting(false)}
                    className="px-4 py-2 rounded-lg hover:bg-white/5 text-lumen-mute transition-colors"
                >
                    Cancel
                </button>
                <button 
                    onClick={handleSaveEntry}
                    className="liquid-button px-6 py-2 rounded-lg text-white font-semibold shadow-lg"
                >
                    Save Entry
                </button>
            </div>
        </div>
      ) : (
        <>
            {/* Quick Actions / Landing Cards */}
            {!showMoodInput && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-slideIn">
                    {/* Prompt Card */}
                    <div 
                        onClick={() => startWriting('free')}
                        className="glass-panel p-6 rounded-2xl cursor-pointer hover:bg-white/5 transition-all group border border-lumen-secondary/20 hover:border-lumen-secondary/50"
                    >
                        <div className="flex justify-between items-start mb-3">
                            <span className="text-xs font-bold uppercase tracking-wider text-lumen-secondary flex items-center gap-1">
                                <Sparkles size={12} /> Daily Prompt
                            </span>
                            <ArrowRight size={16} className="text-lumen-mute group-hover:text-white transform group-hover:translate-x-1 transition-all" />
                        </div>
                        {isLoadingPrompt ? (
                            <div className="h-12 bg-white/5 rounded animate-pulse"></div>
                        ) : (
                             <p className="text-lg font-serif italic text-lumen-text/90 group-hover:text-white transition-colors">
                                "{currentPrompt}"
                             </p>
                        )}
                    </div>

                    {/* Contextual Check-in Card */}
                    <div 
                        onClick={() => startWriting(timeContext.type)}
                        className="glass-panel p-6 rounded-2xl cursor-pointer hover:bg-white/5 transition-all group border border-lumen-primary/20 hover:border-lumen-primary/50"
                    >
                        <div className="flex justify-between items-start mb-3">
                            <span className="text-xs font-bold uppercase tracking-wider text-lumen-primary flex items-center gap-1">
                                <timeContext.icon size={12} /> {timeContext.label}
                            </span>
                             <ArrowRight size={16} className="text-lumen-mute group-hover:text-white transform group-hover:translate-x-1 transition-all" />
                        </div>
                        <p className="text-sm text-lumen-mute group-hover:text-lumen-text transition-colors">
                            Take a moment to align your thoughts with a guided check-in generated by Sophus.
                        </p>
                        <div className="mt-4 flex gap-1">
                            {[1,2,3].map(i => <div key={i} className="w-8 h-1 bg-lumen-primary/30 rounded-full"></div>)}
                        </div>
                    </div>
                </div>
            )}
            
            {/* Quick Free Write Input */}
            {!showMoodInput && (
                 <div className="glass-panel p-4 rounded-xl flex gap-3 items-center animate-fadeIn border-t-2 border-lumen-accent/20">
                    <PenLine className="text-lumen-mute shrink-0" size={20} />
                    <form onSubmit={handleQuickWriteSubmit} className="flex-1 flex gap-2">
                         <input 
                            type="text" 
                            value={quickWriteText}
                            onChange={(e) => setQuickWriteText(e.target.value)}
                            placeholder="What's on your mind?"
                            className="flex-1 bg-transparent border-none text-lumen-text placeholder-lumen-mute/50 focus:ring-0"
                         />
                         {quickWriteText && (
                             <button type="submit" className="text-lumen-accent hover:text-white transition-colors">
                                 <ArrowRight size={20} />
                             </button>
                         )}
                    </form>
                 </div>
            )}

            {/* Mood Insights Widget */}
            {moodLogs.length > 0 && !showMoodInput && (
                <div className="glass-panel p-4 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 text-sm font-semibold text-lumen-secondary">
                            <Sparkles size={14} /> Sophus Insights
                        </div>
                        {moodAnalysis ? (
                            <p className="text-lumen-text/90 text-sm mt-1 italic">"{moodAnalysis}"</p>
                        ) : (
                            <p className="text-lumen-mute text-xs mt-1">Analyze your recent mood patterns.</p>
                        )}
                    </div>
                    <button 
                        onClick={handleMoodAnalysis}
                        disabled={analyzingMood}
                        className="text-xs bg-lumen-primary/20 hover:bg-lumen-primary/40 text-lumen-primary px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                    >
                        {analyzingMood ? "Analyzing..." : "Analyze Trends"}
                    </button>
                </div>
            )}

            <div className="grid gap-4 pb-24">
                {entries.map(entry => (
                    <div key={entry.id} className="glass-panel p-5 rounded-xl hover:bg-white/5 transition-colors group">
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                                <span className="flex items-center text-xs text-lumen-accent font-mono">
                                    <Calendar size={12} className="mr-1" />
                                    {new Date(entry.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                </span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-lumen-mute uppercase tracking-wider border border-white/5">
                                    {entry.type === 'free' ? 'Journal' : entry.type}
                                </span>
                            </div>
                            <button onClick={() => deleteEntry(entry.id)} className="text-lumen-mute hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Trash2 size={14} />
                            </button>
                        </div>
                        
                        {entry.type === 'free' ? (
                            <>
                                {entry.prompt && (
                                    <p className="text-sm text-lumen-secondary/80 mb-3 font-serif italic border-l-2 border-lumen-secondary/30 pl-2">
                                        {entry.prompt}
                                    </p>
                                )}
                                <p className="text-lumen-text/90 whitespace-pre-wrap leading-relaxed">
                                    {entry.content}
                                </p>
                            </>
                        ) : (
                            <div className="space-y-3 mt-2">
                                {entry.checkInData?.map((item, i) => (
                                    <div key={i} className="text-sm">
                                        <p className="text-lumen-mute mb-1">{item.question}</p>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                                                <div className="h-full bg-lumen-secondary" style={{ width: `${item.rating * 10}%`}}></div>
                                            </div>
                                            <span className="text-xs font-bold text-white">{item.rating}/10</span>
                                        </div>
                                        {item.comment && <p className="text-lumen-text/90 mt-1 pl-2 border-l border-white/20">{item.comment}</p>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </>
      )}
    </div>
  );
};
