

import React, { useState, useRef } from 'react';
import { NavigationTab, UserStats, HunterRank, UserSettings, Badge, Goal } from '../types';
import { BookOpen, CheckSquare, Settings, Sparkles, BarChart2, Bot, X, Shield, Skull, Zap, TrendingUp, TrendingDown, User as UserIcon, Flame, Book, Heart, Footprints, Target, Feather, Lock, Activity, Goal as GoalIcon, CheckCircle } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentTab: NavigationTab;
  setTab: (tab: NavigationTab) => void;
  stats: UserStats;
  settings: UserSettings;
  badges: Badge[];
  goals: Goal[];
  setGoals: React.Dispatch<React.SetStateAction<Goal[]>>;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentTab, setTab, stats, settings, badges, goals, setGoals }) => {
  const [showProfile, setShowProfile] = useState(false);

  // Calculate Rank based on Level
  const getRank = (level: number): HunterRank => {
      if (level < 5) return 'E-Rank';
      if (level < 10) return 'D-Rank';
      if (level < 20) return 'C-Rank';
      if (level < 35) return 'B-Rank';
      if (level < 50) return 'A-Rank';
      if (level < 75) return 'S-Rank';
      return 'National Level';
  };

  const getSystemDifficulty = (level: number): string => {
      if (level < 10) return 'Normal Mode';
      if (level < 30) return 'Hard Mode';
      return 'Nightmare Mode';
  };

  const BadgeIcon = ({ name, className }: { name: string; className?: string }) => {
    switch(name) {
        case 'Zap': return <Zap size={24} className={className} />;
        case 'Flame': return <Flame size={24} className={className} />;
        case 'Book': return <Book size={24} className={className} />;
        case 'Heart': return <Heart size={24} className={className} />;
        case 'Footprints': return <Footprints size={24} className={className} />;
        case 'Target': return <Target size={24} className={className} />;
        case 'Feather': return <Feather size={24} className={className} />;
        case 'Shield': return <Shield size={24} className={className} />;
        default: return <Sparkles size={24} className={className} />;
    }
  };

  const NavItem = ({ tab, icon: Icon, label }: { tab: NavigationTab; icon: any; label: string }) => {
    const isActive = currentTab === tab;
    return (
      <button
        onClick={() => setTab(tab)}
        className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-300 w-16 md:w-20
        ${isActive 
          ? 'text-lumen-text bg-white/10 shadow-[0_0_15px_rgba(139,92,246,0.5)]' 
          : 'text-lumen-mute hover:text-lumen-primary hover:bg-white/5'}`}
      >
        <Icon size={24} className={isActive ? 'text-lumen-secondary drop-shadow-md' : ''} />
        <span className="text-[10px] mt-1 font-medium tracking-wide">{label}</span>
      </button>
    );
  };

  // Draggable FAB Logic
  const fabRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 20, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
      setIsDragging(false);
      dragStartPos.current = { x: e.clientX, y: e.clientY };
      const mouseMoveHandler = (moveEvent: MouseEvent) => {
          const dx = moveEvent.clientX - dragStartPos.current.x;
          const dy = moveEvent.clientY - dragStartPos.current.y;
          if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
              setIsDragging(true);
              setPosition(prev => ({ x: prev.x - dx, y: prev.y - dy }));
              dragStartPos.current = { x: moveEvent.clientX, y: moveEvent.clientY };
          }
      };
      const mouseUpHandler = () => {
          document.removeEventListener('mousemove', mouseMoveHandler);
          document.removeEventListener('mouseup', mouseUpHandler);
      };
      document.addEventListener('mousemove', mouseMoveHandler);
      document.addEventListener('mouseup', mouseUpHandler);
  };

  const xpForCurrentLevel = (stats.level - 1) * 100;
  const xpForNextLevel = stats.level * 100;
  const progress = ((stats.xp - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100;
  const rank = getRank(stats.level);
  const difficulty = getSystemDifficulty(stats.level);

  const getProgressForBadge = (badge: Badge) => {
      let current = 0;
      switch(badge.criteriaType) {
          case 'tasks': current = stats.tasksCompleted; break;
          case 'streak': current = stats.currentStreak; break;
          case 'journals': current = stats.journalsWritten; break;
          case 'moods': current = stats.moodsLogged; break;
      }
      return Math.min(100, (current / badge.criteriaThreshold) * 100);
  };
  
  const getBadgeProgressLabel = (badge: Badge) => {
      let current = 0;
      switch(badge.criteriaType) {
          case 'tasks': current = stats.tasksCompleted; break;
          case 'streak': current = stats.currentStreak; break;
          case 'journals': current = stats.journalsWritten; break;
          case 'moods': current = stats.moodsLogged; break;
      }
      return `${current}/${badge.criteriaThreshold}`;
  };

  const toggleGoalStatus = (goalId: string) => {
      setGoals(prev => prev.map(g => g.id === goalId ? { ...g, status: g.status === 'active' ? 'completed' : 'active' } : g));
  };
  
  const removeGoal = (goalId: string) => {
      setGoals(prev => prev.filter(g => g.id !== goalId));
  };

  return (
    <div className="relative min-h-screen overflow-hidden text-lumen-text selection:bg-lumen-primary selection:text-white">
      {/* Background Ambience */}
      <div className="fixed inset-0 z-[-1] pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-lumen-primary rounded-full mix-blend-screen filter blur-[100px] opacity-20 animate-blob"></div>
        <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-lumen-accent rounded-full mix-blend-screen filter blur-[100px] opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[-10%] left-[20%] w-96 h-96 bg-lumen-secondary rounded-full mix-blend-screen filter blur-[100px] opacity-20 animate-blob animation-delay-4000"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
      </div>

      {/* Profile / System Modal */}
      {showProfile && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
            <div className="w-full max-w-4xl bg-[#0a0a0a] border border-lumen-primary/50 rounded-lg shadow-[0_0_50px_rgba(139,92,246,0.3)] relative overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Decorative System Lines */}
                <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-lumen-primary to-transparent opacity-50"></div>
                <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-lumen-primary to-transparent opacity-50"></div>
                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(18,16,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none z-0"></div>

                {/* System Header */}
                <div className="bg-lumen-primary/10 p-4 border-b border-lumen-primary/30 flex justify-between items-center shrink-0 relative z-10">
                    <div className="flex items-center gap-3">
                        <Activity className="text-lumen-primary animate-pulse" size={18} />
                        <h2 className="text-lumen-primary font-mono font-bold tracking-[0.2em] text-lg uppercase">System Window</h2>
                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border ml-4
                            ${difficulty === 'Normal Mode' ? 'border-green-500/50 text-green-400 bg-green-500/10' : 
                              difficulty === 'Hard Mode' ? 'border-yellow-500/50 text-yellow-400 bg-yellow-500/10' : 
                              'border-red-500/50 text-red-500 bg-red-500/10 animate-pulse'}`}>
                            {difficulty}
                        </span>
                    </div>
                    <button onClick={() => setShowProfile(false)} className="text-lumen-primary hover:text-white transition-colors"><X /></button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 relative z-10">
                    <div className="flex flex-col md:flex-row gap-8 items-start mb-8">
                        {/* Avatar */}
                        <div className="w-32 h-32 bg-black border-2 border-lumen-secondary rounded-lg flex items-center justify-center relative shadow-[0_0_20px_rgba(217,70,239,0.5)] shrink-0 mx-auto md:mx-0 group overflow-hidden">
                            {settings.profileImage ? (
                                <img src={settings.profileImage} alt="Avatar" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                            ) : (
                                <UserIcon size={48} className="text-lumen-secondary" />
                            )}
                            <div className="absolute -bottom-3 bg-lumen-secondary text-black text-xs font-bold px-3 py-1 rounded shadow-lg">PLAYER</div>
                        </div>

                        {/* Basic Info */}
                        <div className="flex-1 space-y-2 w-full">
                             <div className="flex justify-between items-end border-b border-white/10 pb-2">
                                 <div>
                                     <div className="text-xs text-lumen-mute uppercase tracking-widest mb-1">Name</div>
                                     <div className="text-3xl font-bold text-white tracking-wide font-sans">{settings.name}</div>
                                 </div>
                                 <div className="text-right">
                                     <div className="text-xs text-lumen-mute uppercase tracking-widest mb-1">Title</div>
                                     <div className="text-lg text-lumen-accent font-medium font-mono tracking-tight">{settings.userTitle || "Novice Hunter"}</div>
                                 </div>
                             </div>
                             
                             <div className="grid grid-cols-2 gap-4 pt-2">
                                 <div className="bg-white/5 p-2 rounded border border-white/5">
                                     <div className="text-xs text-lumen-mute uppercase">Level</div>
                                     <div className="text-3xl font-bold text-white">{stats.level}</div>
                                 </div>
                                 <div className="bg-white/5 p-2 rounded border border-white/5">
                                     <div className="text-xs text-lumen-mute uppercase">Rank</div>
                                     <div className={`text-3xl font-bold ${rank === 'S-Rank' || rank === 'National Level' ? 'text-yellow-400 shadow-yellow-500/50 drop-shadow-md' : 'text-lumen-secondary'}`}>{rank}</div>
                                 </div>
                             </div>
                             
                             {/* XP Bar */}
                             <div className="mt-4">
                                 <div className="flex justify-between text-xs text-lumen-mute mb-1 font-mono">
                                     <span>EXP</span>
                                     <span>{Math.floor(stats.xp)} / {xpForNextLevel}</span>
                                 </div>
                                 <div className="h-3 bg-black rounded-full overflow-hidden border border-white/10">
                                     <div 
                                        className="h-full bg-gradient-to-r from-lumen-primary to-lumen-secondary shadow-[0_0_15px_rgba(139,92,246,0.6)] relative" 
                                        style={{ width: `${progress}%` }}
                                     >
                                         <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.1)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.1)_75%,transparent_75%,transparent)] bg-[length:10px_10px]"></div>
                                     </div>
                                 </div>
                             </div>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <div className="bg-black/40 border border-green-500/20 p-3 rounded-lg flex flex-col items-center justify-center text-center shadow-[inset_0_0_10px_rgba(34,197,94,0.1)]">
                            <TrendingUp size={16} className="text-green-500 mb-1" />
                            <div className="text-xl font-bold text-white">{stats.xpGained}</div>
                            <div className="text-[10px] text-green-400/70 uppercase">XP Gained</div>
                        </div>
                         <div className="bg-black/40 border border-red-500/20 p-3 rounded-lg flex flex-col items-center justify-center text-center shadow-[inset_0_0_10px_rgba(239,68,68,0.1)]">
                            <TrendingDown size={16} className="text-red-500 mb-1" />
                            <div className="text-xl font-bold text-white">{stats.xpLost}</div>
                            <div className="text-[10px] text-red-400/70 uppercase">XP Penalty</div>
                        </div>
                        <div className="bg-black/40 border border-yellow-500/20 p-3 rounded-lg flex flex-col items-center justify-center text-center shadow-[inset_0_0_10px_rgba(234,179,8,0.1)]">
                            <Zap size={16} className="text-yellow-400 mb-1" />
                            <div className="text-xl font-bold text-white">{stats.longestStreak}</div>
                            <div className="text-[10px] text-yellow-400/70 uppercase">Best Streak</div>
                        </div>
                        <div className="bg-black/40 border border-lumen-accent/20 p-3 rounded-lg flex flex-col items-center justify-center text-center shadow-[inset_0_0_10px_rgba(59,130,246,0.1)]">
                            <Target size={16} className="text-lumen-accent mb-1" />
                            <div className="text-xl font-bold text-white">{badges.filter(b=>b.unlocked).length} / {badges.length}</div>
                            <div className="text-[10px] text-lumen-accent/70 uppercase">Badges</div>
                        </div>
                    </div>

                    {/* Current Objectives Section */}
                    <div className="mb-8">
                        <h3 className="text-sm font-bold text-white mb-4 border-b border-lumen-primary/30 pb-2 flex items-center justify-between uppercase tracking-wider">
                            <span>Current Objectives</span>
                            <span className="text-xs font-normal text-lumen-mute normal-case">Track your high-level goals</span>
                        </h3>
                        {goals.length === 0 ? (
                            <div className="bg-white/5 border border-white/5 rounded-xl p-4 text-center text-lumen-mute text-sm italic">
                                No active objectives. Ask Sophus to "Breakdown Goal" to add one.
                            </div>
                        ) : (
                            <div className="grid gap-3">
                                {goals.map(goal => (
                                    <div key={goal.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between group">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${goal.status === 'completed' ? 'bg-green-500/20 text-green-400' : 'bg-lumen-primary/20 text-lumen-primary'}`}>
                                                <GoalIcon size={18} />
                                            </div>
                                            <div>
                                                <h4 className={`font-medium ${goal.status === 'completed' ? 'text-lumen-mute line-through' : 'text-white'}`}>{goal.title}</h4>
                                                <p className="text-[10px] text-lumen-mute">Added {new Date(goal.dateAdded).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button 
                                                onClick={() => toggleGoalStatus(goal.id)}
                                                className={`p-2 rounded hover:bg-white/10 transition-colors ${goal.status === 'completed' ? 'text-green-400' : 'text-lumen-mute'}`}
                                                title={goal.status === 'completed' ? "Mark Active" : "Mark Complete"}
                                            >
                                                <CheckCircle size={18} />
                                            </button>
                                            <button 
                                                onClick={() => removeGoal(goal.id)}
                                                className="p-2 rounded hover:bg-white/10 text-lumen-mute hover:text-red-400 transition-colors"
                                                title="Delete Objective"
                                            >
                                                <X size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Achievements Section */}
                    <div className="mb-8">
                        <h3 className="text-sm font-bold text-white mb-4 border-b border-lumen-primary/30 pb-2 flex items-center justify-between uppercase tracking-wider">
                            <span>Achievements</span>
                            <span className="text-xs font-normal text-lumen-mute normal-case">Unlock new titles and XP</span>
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {badges.map(badge => (
                                <div 
                                    key={badge.id} 
                                    className={`relative p-4 rounded-xl border flex items-center gap-3 overflow-hidden group transition-all duration-300
                                    ${badge.unlocked 
                                        ? 'bg-lumen-primary/10 border-lumen-primary/50 shadow-[0_0_15px_rgba(139,92,246,0.15)] hover:shadow-[0_0_20px_rgba(139,92,246,0.3)]' 
                                        : 'bg-white/5 border-white/5 grayscale opacity-60 hover:opacity-80'}`}
                                >
                                    <div className={`p-3 rounded-full shrink-0 ${badge.unlocked ? 'bg-lumen-primary/20 text-lumen-secondary' : 'bg-white/5 text-lumen-mute'}`}>
                                        <BadgeIcon name={badge.icon} />
                                    </div>
                                    <div className="flex-1 min-w-0 z-10">
                                        <h4 className={`font-bold text-sm truncate ${badge.unlocked ? 'text-white' : 'text-lumen-mute'}`}>{badge.name}</h4>
                                        <p className="text-xs text-lumen-mute truncate">{badge.description}</p>
                                        
                                        {!badge.unlocked && (
                                            <div className="mt-2">
                                                <div className="flex justify-between text-[10px] text-lumen-mute mb-1">
                                                    <span>Progress</span>
                                                    <span>{getBadgeProgressLabel(badge)}</span>
                                                </div>
                                                <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full bg-lumen-mute transition-all duration-500" 
                                                        style={{ width: `${getProgressForBadge(badge)}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        )}
                                        {badge.unlocked && (
                                            <div className="mt-1 text-[10px] text-lumen-primary font-mono tracking-wider animate-pulse">UNLOCKED</div>
                                        )}
                                    </div>
                                    {/* Locked Overlay Icon */}
                                    {!badge.unlocked && <Lock size={12} className="absolute top-2 right-2 text-lumen-mute/50" />}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* XP Log */}
                    <h3 className="text-sm font-bold text-white mb-4 border-b border-lumen-primary/30 pb-2 uppercase tracking-wider">Activity Log</h3>
                    <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                        {stats.xpHistory.slice().reverse().map(log => (
                            <div key={log.id} className="flex justify-between items-center bg-white/5 p-3 rounded border border-white/5 text-sm hover:bg-white/10 transition-colors">
                                <span className="text-lumen-text truncate max-w-[70%] text-xs font-mono">{log.source}</span>
                                <span className={`font-mono font-bold shrink-0 text-xs ${log.type === 'gain' ? 'text-green-400' : 'text-red-400'}`}>
                                    {log.type === 'gain' ? '+' : '-'}{log.amount} XP
                                </span>
                            </div>
                        ))}
                        {stats.xpHistory.length === 0 && <div className="text-lumen-mute text-center italic text-xs py-4">No system activity recorded yet.</div>}
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="relative z-10 h-[calc(100vh-80px)] md:h-screen md:pl-24 overflow-y-auto overflow-x-hidden">
        <div className="max-w-4xl mx-auto p-4 md:p-8 h-full">
            {children}
        </div>
      </main>

      {/* Draggable Chat FAB - Hidden when Chat is active */}
      {currentTab !== 'chat' && (
      <div 
        ref={fabRef}
        onMouseDown={handleMouseDown}
        onClick={() => !isDragging && setTab('chat')}
        style={{ right: `${position.x}px`, bottom: `${position.y}px` }}
        className="fixed z-[60] cursor-grab active:cursor-grabbing group touch-none animate-fadeIn"
      >
          <div className={`relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-[0_0_20px_rgba(139,92,246,0.5)]
          bg-gradient-to-tr from-lumen-primary to-lumen-secondary hover:scale-110`}>
               <div className="relative z-10 text-white">
                    <div className="relative">
                        <Bot size={28} className="drop-shadow-sm" />
                        <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-lumen-accent rounded-full border-2 border-lumen-base animate-blink-interval"></div>
                    </div>
               </div>
          </div>
      </div>
      )}

      {/* Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 h-20 glass-panel md:top-0 md:left-0 md:h-screen md:w-24 md:flex-col md:justify-center z-50">
        <div className="flex flex-row md:flex-col items-center justify-around md:justify-center h-full gap-2 md:gap-8 px-2 relative">
            
            {/* Stats / Level Indicator (Clickable) */}
            <div 
                className="hidden md:flex flex-col items-center absolute top-8 w-full px-2 cursor-pointer group"
                onClick={() => setShowProfile(true)}
            >
                <div className="relative w-12 h-12 mb-2 flex items-center justify-center">
                     <div className="w-full h-full rounded-full border-2 border-white/10 flex items-center justify-center relative overflow-hidden group-hover:border-lumen-primary transition-colors">
                         <div className="absolute bottom-0 left-0 right-0 bg-lumen-secondary/30 transition-all duration-500" style={{ height: `${progress}%` }}></div>
                         <span className="relative z-10 font-bold text-white text-xs">{rank.split('-')[0]}</span>
                    </div>
                </div>
                <span className="text-[10px] text-lumen-mute uppercase tracking-widest group-hover:text-white transition-colors">Lvl {stats.level}</span>
                <div className="flex items-center gap-1 mt-1 text-[10px] text-lumen-primary">
                    <Sparkles size={8} /> {Math.floor(stats.xp)}
                </div>
            </div>

            {/* Mobile Stats Mini */}
            <div 
                onClick={() => setShowProfile(true)}
                className="md:hidden absolute top-[-10px] left-1/2 -translate-x-1/2 -translate-y-full bg-slate-900/90 backdrop-blur px-3 py-1 rounded-full border border-white/10 text-xs font-medium text-lumen-secondary flex items-center gap-2 shadow-lg"
            >
                <span className="text-white">Lvl {stats.level}</span>
                <span className="w-px h-3 bg-white/20"></span>
                <Sparkles size={10} /> {Math.floor(stats.xp)} XP
            </div>

            <NavItem tab="tasks" icon={CheckSquare} label="Focus" />
            <NavItem tab="journal" icon={BookOpen} label="Journal" />
            <NavItem tab="insights" icon={BarChart2} label="Insights" />
            <NavItem tab="settings" icon={Settings} label="Settings" />
        </div>
      </nav>
    </div>
  );
};
