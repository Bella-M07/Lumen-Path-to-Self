
import React, { useState } from 'react';
import { UserSettings, SophusTone, AppTheme, QuoteCategory } from '../types';
import { User, Sliders, Shield, Palette, Info, PaintBucket, Lock, Key, Heart, BookOpen, Quote, Trash2, Link as LinkIcon, Edit3 } from 'lucide-react';

interface SettingsProps {
  settings: UserSettings;
  setSettings: React.Dispatch<React.SetStateAction<UserSettings>>;
  resetData: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ settings, setSettings, resetData }) => {
  
  const tones = Object.values(SophusTone);
  
  const [pinMode, setPinMode] = useState<'view' | 'edit'>('view');
  const [newPin, setNewPin] = useState('');
  
  const themes: { id: AppTheme; name: string; colors: string[] }[] = [
    { id: 'neon-city', name: 'Neon City', colors: ['#8b5cf6', '#d946ef', '#020617'] },
    { id: 'crimson-protocol', name: 'Crimson Protocol', colors: ['#ef4444', '#991b1b', '#0a0a0a'] },
    { id: 'noir', name: 'Noir', colors: ['#ffffff', '#525252', '#000000'] },
    { id: 'oceanic', name: 'Oceanic', colors: ['#3b82f6', '#6366f1', '#020410'] },
    { id: 'custom', name: 'Custom', colors: [settings.customThemeColors?.primary || '#fff', settings.customThemeColors?.secondary || '#888', settings.customThemeColors?.base || '#000'] }
  ];

  const handleToneChange = (tone: SophusTone) => {
    setSettings(prev => ({ ...prev, sophusTone: tone }));
  };

  const handleThemeChange = (theme: AppTheme) => {
    setSettings(prev => ({ ...prev, theme }));
  };
  
  const updateCustomColor = (key: string, value: string) => {
      setSettings(prev => ({
          ...prev,
          customThemeColors: {
              ...prev.customThemeColors!,
              [key]: value
          }
      }));
  };

  const savePin = () => {
      if (newPin.length === 6) {
          setSettings(prev => ({ ...prev, appLockPin: newPin, appLockEnabled: true }));
          setPinMode('view');
          setNewPin('');
      } else {
          alert('PIN must be 6 digits');
      }
  };

  const disableLock = () => {
      setSettings(prev => ({ ...prev, appLockEnabled: false, appLockPin: '' }));
  };

  const toggleQuoteCategory = (cat: QuoteCategory) => {
      setSettings(prev => {
          const current = prev.quoteCategories || [];
          if (current.includes(cat)) return { ...prev, quoteCategories: current.filter(c => c !== cat) };
          return { ...prev, quoteCategories: [...current, cat] };
      });
  };

  const removeLikedQuote = (quoteToRemove: string) => {
      setSettings(prev => ({ ...prev, likedQuotes: prev.likedQuotes.filter(q => q !== quoteToRemove) }));
  };

  return (
    <div className="h-full flex flex-col space-y-8 animate-fadeIn pb-24">
        <header>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-lumen-secondary to-lumen-primary">
            Settings
          </h1>
          <p className="text-lumen-mute text-sm mt-1">Customize your experience.</p>
        </header>

        <div className="space-y-6">
            
            {/* User Profile Section */}
            <section className="glass-panel p-6 rounded-2xl">
                <div className="flex items-center gap-3 mb-4 text-lumen-text/90">
                    <User size={20} className="text-lumen-primary" />
                    <h2 className="text-lg font-semibold">Hunter Profile</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-lumen-mute uppercase tracking-wider">Player Name</label>
                            <div className="relative">
                                <input 
                                    type="text" 
                                    value={settings.name}
                                    onChange={(e) => setSettings({...settings, name: e.target.value})}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-lumen-text focus:outline-none focus:border-lumen-primary transition-colors"
                                    placeholder="Enter your name..."
                                />
                                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-lumen-mute" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-lumen-mute uppercase tracking-wider">Hunter Title</label>
                            <div className="relative">
                                <input 
                                    type="text" 
                                    value={settings.userTitle || ''}
                                    onChange={(e) => setSettings({...settings, userTitle: e.target.value})}
                                    className="w-full bg-black/20 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-lumen-text focus:outline-none focus:border-lumen-primary transition-colors"
                                    placeholder="e.g. Shadow Monarch, E-Rank Healer..."
                                />
                                <Edit3 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-lumen-mute" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                         <label className="text-xs font-bold text-lumen-mute uppercase tracking-wider">Avatar URL</label>
                         <div className="flex gap-4 items-start">
                             <div className="w-16 h-16 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                                 {settings.profileImage ? (
                                     <img src={settings.profileImage} alt="Preview" className="w-full h-full object-cover" />
                                 ) : (
                                     <User size={24} className="text-lumen-mute/50" />
                                 )}
                             </div>
                             <div className="flex-1 space-y-2">
                                 <div className="relative">
                                    <input 
                                        type="text" 
                                        value={settings.profileImage || ''}
                                        onChange={(e) => setSettings({...settings, profileImage: e.target.value})}
                                        className="w-full bg-black/20 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-xs text-lumen-text focus:outline-none focus:border-lumen-primary transition-colors"
                                        placeholder="https://example.com/image.png"
                                    />
                                    <LinkIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-lumen-mute" />
                                 </div>
                                 <p className="text-[10px] text-lumen-mute">Paste a direct link to an image to update your system profile picture.</p>
                             </div>
                         </div>
                    </div>
                </div>
            </section>

             {/* Daily Inspiration / Quotes Section */}
             <section className="glass-panel p-6 rounded-2xl">
                 <div className="flex items-center gap-3 mb-4 text-lumen-text/90">
                     <Quote size={20} className="text-lumen-accent" />
                     <h2 className="text-lg font-semibold">Daily Inspiration</h2>
                 </div>
                 <p className="text-sm text-lumen-mute mb-4">Choose what kind of quotes appear in Focus Mode.</p>
                 
                 <div className="flex flex-wrap gap-2 mb-6">
                     {['affirmation', 'stoic', 'productivity', 'confidence', 'literature', 'custom'].map((cat) => (
                         <button
                             key={cat}
                             onClick={() => toggleQuoteCategory(cat as QuoteCategory)}
                             className={`px-3 py-1.5 rounded-lg border text-xs font-medium capitalize transition-all
                             ${(settings.quoteCategories || []).includes(cat as QuoteCategory)
                                 ? 'bg-lumen-primary text-white border-lumen-primary shadow-lg'
                                 : 'bg-transparent border-white/10 text-lumen-mute hover:border-white/30'}`}
                         >
                             {cat}
                         </button>
                     ))}
                 </div>
                 
                 {(settings.quoteCategories || []).includes('custom') && (
                     <div className="mb-6 animate-slideIn">
                         <label className="text-xs text-lumen-secondary mb-1 block">Custom Preference (Genre, Author, Topic)</label>
                         <input
                             type="text"
                             value={settings.customQuotePreference || ''}
                             onChange={(e) => setSettings({...settings, customQuotePreference: e.target.value})}
                             placeholder="E.g., Oscar Wilde, Cyberpunk philosophy..."
                             className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-lumen-secondary"
                         />
                     </div>
                 )}

                 {/* Liked Quotes Gallery */}
                 <div className="bg-white/5 rounded-xl border border-white/10 p-4">
                     <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                         <Heart size={14} className="text-pink-500" /> Liked Quotes
                     </h3>
                     <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                         {settings.likedQuotes && settings.likedQuotes.length > 0 ? (
                             settings.likedQuotes.map((quote, i) => (
                                 <div key={i} className="flex justify-between items-start gap-3 p-2 rounded hover:bg-white/5 group">
                                     <p className="text-xs text-lumen-mute italic">"{quote}"</p>
                                     <button 
                                         onClick={() => removeLikedQuote(quote)}
                                         className="text-white/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                     >
                                         <Trash2 size={12} />
                                     </button>
                                 </div>
                             ))
                         ) : (
                             <p className="text-xs text-lumen-mute/50 italic text-center py-4">No quotes liked yet.</p>
                         )}
                     </div>
                 </div>
             </section>

             {/* Visual Theme Section */}
             <section className="glass-panel p-6 rounded-2xl">
                <div className="flex items-center gap-3 mb-4 text-lumen-text/90">
                    <Palette size={20} className="text-lumen-accent" />
                    <h2 className="text-lg font-semibold">Visual Theme</h2>
                </div>
                <p className="text-sm text-lumen-mute mb-4">Select the atmosphere for your journey.</p>
                
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                    {themes.map((t) => (
                        <button
                            key={t.id}
                            onClick={() => handleThemeChange(t.id)}
                            className={`group relative p-3 rounded-xl border transition-all duration-300 flex flex-col items-center gap-2
                            ${settings.theme === t.id 
                                ? 'bg-white/10 border-lumen-primary shadow-[0_0_15px_rgba(255,255,255,0.1)]' 
                                : 'bg-transparent border-white/10 hover:bg-white/5'}`}
                        >
                            <div className="flex gap-1">
                                {t.colors.map((c, i) => (
                                    <div key={i} className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: c }}></div>
                                ))}
                            </div>
                            <span className={`text-xs font-medium ${settings.theme === t.id ? 'text-white' : 'text-lumen-mute group-hover:text-white'}`}>
                                {t.name}
                            </span>
                        </button>
                    ))}
                </div>

                {settings.theme === 'custom' && settings.customThemeColors && (
                    <div className="bg-white/5 p-4 rounded-xl border border-white/10 animate-slideIn">
                        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                            <PaintBucket size={14} /> Custom Palette
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {Object.entries(settings.customThemeColors).map(([key, val]) => (
                                <div key={key} className="flex items-center justify-between bg-black/20 p-2 rounded-lg">
                                    <span className="text-xs text-lumen-mute capitalize">{key}</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-mono text-white/50">{val}</span>
                                        <input 
                                            type="color" 
                                            value={val}
                                            onChange={(e) => updateCustomColor(key, e.target.value)}
                                            className="w-8 h-8 rounded cursor-pointer bg-transparent border-none"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </section>

             {/* App Security Section */}
             <section className="glass-panel p-6 rounded-2xl">
                <div className="flex items-center gap-3 mb-4 text-lumen-text/90">
                    <Lock size={20} className="text-lumen-secondary" />
                    <h2 className="text-lg font-semibold">Security</h2>
                </div>
                
                {!settings.appLockEnabled ? (
                    <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                         {pinMode === 'view' ? (
                             <div className="flex justify-between items-center">
                                 <div>
                                     <h3 className="text-sm font-bold text-white">App Lock Disabled</h3>
                                     <p className="text-xs text-lumen-mute">Secure your journal with a 6-digit PIN.</p>
                                 </div>
                                 <button 
                                    onClick={() => setPinMode('edit')}
                                    className="px-4 py-2 bg-lumen-primary text-white rounded-lg text-sm font-medium hover:bg-lumen-primary/80 transition-colors"
                                 >
                                     Enable Lock
                                 </button>
                             </div>
                         ) : (
                             <div className="space-y-3">
                                 <label className="text-sm text-lumen-mute">Set 6-digit PIN</label>
                                 <div className="flex gap-2">
                                     <input 
                                        type="number"
                                        value={newPin}
                                        onChange={(e) => {
                                            if(e.target.value.length <= 6) setNewPin(e.target.value);
                                        }}
                                        className="flex-1 bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white tracking-widest text-center text-lg focus:outline-none focus:border-lumen-primary"
                                        placeholder="******"
                                     />
                                     <button 
                                        onClick={savePin}
                                        disabled={newPin.length !== 6}
                                        className="px-4 bg-lumen-secondary text-white rounded-lg disabled:opacity-50"
                                     >
                                         Set
                                     </button>
                                     <button 
                                        onClick={() => { setPinMode('view'); setNewPin(''); }}
                                        className="px-4 bg-white/10 text-lumen-mute rounded-lg"
                                     >
                                         Cancel
                                     </button>
                                 </div>
                             </div>
                         )}
                    </div>
                ) : (
                    <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-xl flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <Key size={18} className="text-green-400" />
                            <div>
                                <h3 className="text-sm font-bold text-green-100">App Lock Active</h3>
                                <p className="text-xs text-green-200/50">PIN required on startup.</p>
                            </div>
                        </div>
                        <button 
                            onClick={disableLock}
                            className="px-3 py-1.5 bg-red-500/20 text-red-300 border border-red-500/30 rounded-lg text-xs hover:bg-red-500/30 transition-colors"
                        >
                            Disable
                        </button>
                    </div>
                )}
            </section>

            {/* Sophus Personality Section */}
            <section className="glass-panel p-6 rounded-2xl">
                <div className="flex items-center gap-3 mb-4 text-lumen-text/90">
                    <Sliders size={20} className="text-lumen-secondary" />
                    <h2 className="text-lg font-semibold">Sophus Personality</h2>
                </div>
                <p className="text-sm text-lumen-mute mb-4">Choose how Sophus interacts with you.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    {tones.map((tone) => (
                        <button
                            key={tone}
                            onClick={() => handleToneChange(tone)}
                            className={`p-4 rounded-xl border text-left transition-all duration-300
                            ${settings.sophusTone === tone 
                                ? 'bg-lumen-primary/20 border-lumen-primary text-white shadow-[0_0_10px_rgba(139,92,246,0.2)]' 
                                : 'bg-transparent border-white/10 text-lumen-mute hover:bg-white/5 hover:text-white'}`}
                        >
                            <span className="block font-medium text-sm">{tone}</span>
                        </button>
                    ))}
                </div>

                {settings.sophusTone === SophusTone.CUSTOM && (
                    <div className="space-y-2 animate-slideIn">
                        <label className="text-sm text-lumen-secondary font-medium">Define your custom guide:</label>
                        <textarea
                            value={settings.customTonePrompt || ''}
                            onChange={(e) => setSettings({...settings, customTonePrompt: e.target.value})}
                            placeholder="E.g., You are a witty, sarcastic robot from the year 3000..."
                            className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-sm text-lumen-text focus:outline-none focus:border-lumen-secondary h-24 resize-none"
                        />
                    </div>
                )}
            </section>

            {/* Data & Privacy Section */}
            <section className="glass-panel p-6 rounded-2xl border-red-500/10">
                <div className="flex items-center gap-3 mb-4 text-red-200">
                    <Shield size={20} />
                    <h2 className="text-lg font-semibold">Data & Privacy</h2>
                </div>
                
                {/* Privacy Toggle */}
                <div className="flex items-center justify-between mb-6 p-4 bg-white/5 rounded-xl border border-white/5">
                    <div className="flex-1 pr-4">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-white">Share Journal Text for Insights</span>
                            <div className="group relative">
                                <Info size={14} className="text-lumen-mute cursor-help" />
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-black/90 text-xs text-white rounded-lg border border-white/10 hidden group-hover:block z-50">
                                    When ENABLED, Sophus reads your journal entries to give deeper insights. 
                                    <br/><br/>
                                    When DISABLED, Sophus only sees numbers (mood ratings, dates) and slider values. Your written words remain private.
                                </div>
                            </div>
                        </div>
                        <p className="text-xs text-lumen-mute">
                            Allow Sophus to analyze your written entries to provide better patterns and advice.
                        </p>
                    </div>
                    <button 
                        onClick={() => setSettings({...settings, shareJournalContent: !settings.shareJournalContent})}
                        className={`w-12 h-6 rounded-full transition-colors relative ${settings.shareJournalContent ? 'bg-lumen-primary' : 'bg-white/10'}`}
                    >
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 shadow-md ${settings.shareJournalContent ? 'left-7' : 'left-1'}`}></div>
                    </button>
                </div>

                <div className="border-t border-white/10 pt-6">
                    <p className="text-sm text-lumen-mute mb-4">
                        All data is stored locally in your browser. Clearing data will remove all journals and tasks.
                    </p>
                    <button 
                        onClick={() => {
                            if(confirm("Are you sure? This cannot be undone.")) {
                                resetData();
                            }
                        }}
                        className="px-4 py-2 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/10 transition-colors text-sm"
                    >
                        Reset Application Data
                    </button>
                </div>
            </section>
        </div>
    </div>
  );
};
