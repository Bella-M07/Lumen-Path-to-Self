import React, { useEffect, useState } from 'react';
import { MoodLog, Task, Habit, MoodValue, UserStats, UserSettings, InsightRange, JournalEntry } from '../types';
import { generateInsights } from '../services/geminiService';
import { Sparkles, Activity, Zap, CheckCircle, BookOpen, Flame, Trophy } from 'lucide-react';

interface InsightsProps {
  moodLogs: MoodLog[];
  tasks: Task[];
  habits: Habit[];
  entries: JournalEntry[];
  stats: UserStats;
  userName: string;
  settings: UserSettings;
}

export const Insights: React.FC<InsightsProps> = ({ moodLogs, tasks, habits, entries, stats, userName, settings }) => {
  const [insightText, setInsightText] = useState<string>("");
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [timeRange, setTimeRange] = useState<InsightRange>('week');
  
  // Tooltip State for Mood Chart
  const [hoverData, setHoverData] = useState<{
      x: number; // percentage
      y: number; // percentage
      date: string;
      label: string;
  } | null>(null);

  const ranges: { id: InsightRange; label: string }[] = [
      { id: 'week', label: 'Last 7 Days' },
      { id: 'month', label: 'Last 30 Days' },
      { id: '90days', label: '90 Days' },
      { id: 'all', label: 'All Time' },
  ];

  // --- Data Preparation Logic ---
  
  const getDaysArray = (range: InsightRange): string[] => {
      const dates = [];
      const today = new Date();
      let daysToSubtract = 7;
      
      if (range === 'month') daysToSubtract = 30;
      if (range === '90days') daysToSubtract = 90;
      if (range === 'all') daysToSubtract = 180; // Cap visual graph at 180 for "all" to prevent SVG crash

      for (let i = daysToSubtract - 1; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          dates.push(d.toISOString().split('T')[0]);
      }
      return dates;
  };
  
  const dates = getDaysArray(timeRange);

  // Filter Data points based on range
  const moodPoints = dates.map(date => {
      // Find the last mood log of that day
      const logsForDay = moodLogs.filter(l => l.date.startsWith(date));
      const log = logsForDay[logsForDay.length - 1]; 
      return log ? MoodValue[log.mood] : 0;
  });

  const getMoodName = (val: number) => {
    return Object.keys(MoodValue).find(k => MoodValue[k as any] === val) || 'Unknown';
  };

  const productivityPoints = dates.map(date => {
      const tasksCount = tasks.filter(t => t.completed && t.completedAt?.startsWith(date)).length;
      const habitsCount = habits.filter(h => h.completedDates.includes(date)).length;
      return tasksCount + habitsCount;
  });

  const maxProductivity = Math.max(...productivityPoints, 5); // Scale max

  // --- Insight Generation ---
  useEffect(() => {
      const fetchInsight = async () => {
          setLoadingInsight(true);
          const text = await generateInsights(moodLogs, tasks, habits, entries, userName, settings.sophusTone, settings.shareJournalContent);
          setInsightText(text);
          setLoadingInsight(false);
      };
      if(moodLogs.length > 0 || tasks.length > 0 || entries.length > 0) {
        fetchInsight();
      }
  }, [moodLogs.length, tasks.length, habits.length, entries.length]); 

  // --- SVG Helper Functions ---
  const shouldShowLabel = (index: number, total: number) => {
      if (total <= 10) return true;
      if (total <= 30) return index % 5 === 0;
      return index % 14 === 0;
  };

  return (
      <div className="h-full flex flex-col space-y-6 animate-fadeIn pb-20">
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-lumen-secondary to-lumen-accent">
                    Insights
                </h1>
                <p className="text-lumen-mute text-sm mt-1">Visualize your growth journey.</p>
            </div>
            
            {/* Range Selector */}
            <div className="bg-white/5 p-1 rounded-lg flex gap-1 overflow-x-auto">
                {ranges.map(range => (
                    <button
                        key={range.id}
                        onClick={() => setTimeRange(range.id)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors
                        ${timeRange === range.id 
                            ? 'bg-lumen-primary text-white shadow-sm' 
                            : 'text-lumen-mute hover:text-white hover:bg-white/5'}`}
                    >
                        {range.label}
                    </button>
                ))}
            </div>
          </header>

          {/* Sophus Insight Box */}
          <div className="glass-panel p-6 rounded-2xl border-l-4 border-lumen-primary relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Sparkles size={80} />
              </div>
              <div className="relative z-10">
                  <h3 className="text-lumen-primary font-bold flex items-center gap-2 mb-2 text-sm uppercase tracking-wider">
                      <Sparkles size={16} /> Sophus Analysis
                  </h3>
                  {loadingInsight ? (
                      <div className="space-y-2 animate-pulse">
                          <div className="h-3 bg-white/10 rounded w-3/4"></div>
                          <div className="h-3 bg-white/10 rounded w-1/2"></div>
                      </div>
                  ) : (
                      <p className="text-lg text-lumen-text/90 font-medium leading-relaxed">
                          "{insightText || "Keep tracking your journey to unlock insights."}"
                      </p>
                  )}
                  {!settings.shareJournalContent && entries.length > 0 && (
                      <div className="mt-2 text-[10px] text-lumen-mute flex items-center gap-1">
                          (Note: Journal content analysis is disabled in settings. Enable for deeper insights.)
                      </div>
                  )}
              </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
              {/* Mood Flow Chart */}
              <div className="glass-panel p-5 rounded-2xl" onMouseLeave={() => setHoverData(null)}>
                  <h3 className="text-lumen-text font-semibold flex items-center gap-2 mb-4">
                      <Activity size={18} className="text-lumen-secondary" /> Mood Flow
                  </h3>
                  <div className="h-48 relative flex items-end w-full group/chart">
                        {/* Interactive Tooltip Overlay */}
                        {hoverData && (
                             <div 
                                className="absolute z-30 bg-black/90 border border-lumen-secondary/50 text-xs rounded-lg p-2 shadow-[0_0_15px_rgba(217,70,239,0.3)] backdrop-blur-md pointer-events-none transform -translate-x-1/2 -translate-y-full transition-all duration-75"
                                style={{ 
                                    left: `${hoverData.x}%`, 
                                    top: `${hoverData.y}%`,
                                    marginTop: '-12px'
                                }}
                             >
                                 <div className="font-bold text-white whitespace-nowrap mb-0.5">{hoverData.date}</div>
                                 <div className="text-lumen-secondary font-medium">Mood: {hoverData.label}</div>
                                 <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-lumen-secondary/50"></div>
                             </div>
                        )}

                        {/* SVG Chart */}
                        <svg className="w-full h-full overflow-visible" preserveAspectRatio="none">
                            {/* Grid lines */}
                            {[1, 2, 3, 4, 5].map(i => (
                                <line key={i} x1="0" y1={`${100 - (i*20)}%`} x2="100%" y2={`${100 - (i*20)}%`} stroke="currentColor" className="text-white/5" strokeDasharray="4" />
                            ))}
                            
                             <svg viewBox={`0 0 ${dates.length * 20} 100`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
                                <polyline
                                    points={moodPoints.map((v, i) => v > 0 ? `${i * 20},${100 - (v * 20)}` : '').filter(Boolean).join(' ')}
                                    fill="none"
                                    stroke="var(--color-secondary)"
                                    strokeWidth="2"
                                    vectorEffect="non-scaling-stroke"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="animate-reveal-path"
                                />
                                {dates.map((date, i) => {
                                    const v = moodPoints[i];
                                    if (v <= 0) return null;
                                    
                                    const xPerc = (i / dates.length) * 100;
                                    const yPerc = 100 - (v * 20);

                                    return (
                                        <g key={i} className="group/node">
                                            {/* Visible Dot */}
                                            <circle 
                                                cx={i * 20}
                                                cy={100 - (v * 20)}
                                                r="3"
                                                className="fill-lumen-base stroke-lumen-secondary stroke-[1px] transition-all duration-300 group-hover/node:r-5 group-hover/node:fill-lumen-secondary group-hover/node:stroke-white opacity-0 animate-[grow-bar_0.5s_ease-out_forwards]"
                                                vectorEffect="non-scaling-stroke"
                                                style={{ animationDelay: `${i * 50}ms` }}
                                            />
                                            {/* Invisible Hit Area */}
                                            <circle
                                                cx={i * 20}
                                                cy={100 - (v * 20)}
                                                r="12"
                                                className="fill-transparent stroke-none cursor-pointer"
                                                vectorEffect="non-scaling-stroke"
                                                onMouseEnter={() => setHoverData({
                                                    x: xPerc,
                                                    y: yPerc,
                                                    date: new Date(date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
                                                    label: getMoodName(v)
                                                })}
                                            />
                                        </g>
                                    );
                                })}
                             </svg>
                        </svg>

                        {/* X-Axis Labels */}
                        <div className="absolute -bottom-6 left-0 right-0 flex justify-between text-[10px] text-lumen-mute px-1">
                             {dates.map((d, i) => shouldShowLabel(i, dates.length) && (
                                 <span key={d}>{new Date(d).getDate()}</span>
                             ))}
                        </div>
                  </div>
              </div>

              {/* Productivity Pulse Chart */}
              <div className="glass-panel p-5 rounded-2xl">
                  <h3 className="text-lumen-text font-semibold flex items-center gap-2 mb-4">
                      <Zap size={18} className="text-lumen-accent" /> Productivity Pulse
                  </h3>
                  <div className="h-40 relative flex items-end justify-between gap-[2px] px-2">
                        {productivityPoints.map((val, i) => {
                            const heightPerc = (val / maxProductivity) * 100;
                            const showLabel = shouldShowLabel(i, dates.length);
                            
                            return (
                                <div key={i} className="flex-1 flex flex-col justify-end group relative h-full">
                                    <div 
                                        className="w-full bg-gradient-to-t from-lumen-accent/20 to-lumen-accent rounded-t-sm transition-all duration-500 group-hover:opacity-80 min-w-[2px] opacity-0 animate-grow-bar"
                                        style={{ 
                                            height: `${Math.max(heightPerc, 2)}%`,
                                            animationDelay: `${i * 50}ms` 
                                        }}
                                    ></div>
                                    
                                    {/* Styled Tooltip */}
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-black/90 border border-lumen-accent/50 text-white text-xs p-2 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-20 backdrop-blur-md shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-opacity duration-200">
                                        <div className="font-bold mb-0.5">{new Date(dates[i]).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                                        <div className="text-lumen-accent font-medium">Score: {val}</div>
                                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-lumen-accent/50"></div>
                                    </div>

                                    {showLabel && (
                                        <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-lumen-mute text-center">
                                            {new Date(dates[i]).getDate()}
                                        </span>
                                    )}
                                </div>
                            )
                        })}
                  </div>
              </div>
          </div>

          {/* Stats Overview Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/5 border border-white/5 p-4 rounded-xl flex flex-col items-center justify-center text-center">
                  <CheckCircle size={24} className="text-lumen-primary mb-2" />
                  <div className="text-2xl font-bold text-white">{stats.tasksCompleted}</div>
                  <div className="text-xs text-lumen-mute uppercase tracking-wider">Missions</div>
              </div>
              <div className="bg-white/5 border border-white/5 p-4 rounded-xl flex flex-col items-center justify-center text-center">
                  <BookOpen size={24} className="text-lumen-secondary mb-2" />
                  <div className="text-2xl font-bold text-white">{stats.journalsWritten}</div>
                  <div className="text-xs text-lumen-mute uppercase tracking-wider">Journals</div>
              </div>
               <div className="bg-white/5 border border-white/5 p-4 rounded-xl flex flex-col items-center justify-center text-center">
                  <Flame size={24} className="text-orange-500 mb-2" />
                  <div className="text-2xl font-bold text-white">{stats.currentStreak}</div>
                  <div className="text-xs text-lumen-mute uppercase tracking-wider">Day Streak</div>
              </div>
              <div className="bg-white/5 border border-white/5 p-4 rounded-xl flex flex-col items-center justify-center text-center">
                  <Trophy size={24} className="text-yellow-400 mb-2" />
                  <div className="text-2xl font-bold text-white">{stats.xpGained}</div>
                  <div className="text-xs text-lumen-mute uppercase tracking-wider">Total XP</div>
              </div>
          </div>
      </div>
  );
};