
import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, UserSettings, ProposedTask } from '../types';
import { streamSophusChat } from '../services/geminiService';
import { Send, User, Bot, Loader2, CheckCircle, Calendar, Clock, ArrowRight, ListPlus } from 'lucide-react';

interface ChatProps {
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  settings: UserSettings;
  onToolCall?: (toolName: string, args: any) => any;
  triggerResponse?: boolean;
  onResponseTriggered?: () => void;
  onPlanAccepted?: (tasks: ProposedTask[]) => void;
}

export const Chat: React.FC<ChatProps> = ({ messages, setMessages, settings, onToolCall, triggerResponse, onResponseTriggered, onPlanAccepted }) => {
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Handle auto-trigger (e.g., from Goal Breakdown)
  useEffect(() => {
    if (triggerResponse && !isTyping && onResponseTriggered) {
        onResponseTriggered();
        const lastMsg = messages[messages.length - 1];
        if (lastMsg?.role === 'user') {
            generateResponse(lastMsg.text);
        }
    }
  }, [triggerResponse, isTyping, messages]);

  const generateResponse = async (userText: string) => {
    setIsTyping(true);
    
    // Optimistic UI for Bot Message
    const botMsgId = (Date.now() + 1).toString();
    const botMsg: ChatMessage = { id: botMsgId, role: 'model', text: "", isStreaming: true };
    setMessages(prev => [...prev, botMsg]);

    let fullResponse = "";
    
    const stream = streamSophusChat(
      messages.slice(0, -1), 
      userText,
      settings.name,
      settings.sophusTone,
      settings.customTonePrompt
    );

    for await (const chunk of stream) {
      if (chunk.type === 'tool_call' && onToolCall) {
          // Execute Tool
          const { name, args } = chunk.call;
          const result = onToolCall(name, args);
          
          if (result.plan) {
             // Attach the plan to the message
             setMessages(prev => prev.map(msg => msg.id === botMsgId ? { ...msg, planProposal: result.plan } : msg));
          } else {
             // System message for other tools
             setMessages(prev => [...prev, {
                 id: Date.now().toString(),
                 role: 'model',
                 text: `[SYSTEM] Executing ${name}... ${name === 'add_goal' ? 'Goal added to profile.' : 'Action completed.'}`,
                 toolResponse: JSON.stringify(result)
             }]);
          }
      } else if (chunk.type === 'text') {
          fullResponse += chunk.content;
          setMessages(prev => prev.map(msg => msg.id === botMsgId ? { ...msg, text: fullResponse } : msg));
      }
    }

    setMessages(prev => prev.map(msg => msg.id === botMsgId ? { ...msg, isStreaming: false } : msg));
    setIsTyping(false);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    
    generateResponse(userMsg.text);
  };

  const acceptPlan = (msgId: string, tasks: ProposedTask[]) => {
      if (onPlanAccepted) {
          onPlanAccepted(tasks);
          setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isPlanAccepted: true } : m));
      }
  };

  return (
    <div className="h-full flex flex-col relative">
       <div className="absolute inset-0 z-0 bg-gradient-to-b from-lumen-primary/5 to-transparent pointer-events-none rounded-2xl" />
       
       <header className="flex items-center gap-4 mb-4 z-10">
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-lumen-primary to-lumen-secondary p-0.5 shadow-lg shadow-purple-500/20">
             <div className="w-full h-full bg-slate-900 rounded-full flex items-center justify-center">
                <Bot size={24} className="text-lumen-secondary" />
             </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Sophus</h1>
            <p className="text-xs text-lumen-primary font-medium tracking-wide flex items-center gap-1">
               <span className="w-2 h-2 rounded-full bg-lumen-secondary animate-pulse"></span>
               {settings.sophusTone} Mode
            </p>
          </div>
       </header>

       <div className="flex-1 glass-panel rounded-2xl overflow-hidden flex flex-col border border-white/5 relative z-10">
          <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
             {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-60">
                    <Bot size={48} className="mb-4 text-lumen-mute" />
                    <h3 className="text-xl font-semibold text-white mb-2">I am Sophus.</h3>
                    <p className="text-sm text-lumen-mute max-w-xs">System ready. How can I assist with your objectives today?</p>
                </div>
             )}

             {messages.map((msg) => (
                <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[85%] md:max-w-[75%] rounded-2xl p-4 shadow-sm backdrop-blur-sm
                        ${msg.role === 'user' ? 'bg-lumen-primary/20 border border-lumen-primary/30 text-white rounded-br-sm' : 'bg-white/5 border border-white/10 text-lumen-text rounded-bl-sm'}`}>
                        {msg.role === 'model' && !msg.toolResponse && !msg.planProposal && <div className="text-xs text-lumen-secondary mb-1 font-bold uppercase tracking-wider">Sophus</div>}
                        
                        {msg.text.includes('[SYSTEM]') ? (
                            <div className="flex items-center gap-2 text-green-400 font-mono text-xs border border-green-500/30 bg-green-500/10 p-2 rounded">
                                <CheckCircle size={12} /> {msg.text.replace('[SYSTEM]', '')}
                            </div>
                        ) : (
                            <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                        )}

                        {/* Plan Proposal Card */}
                        {msg.planProposal && (
                            <div className="mt-4 bg-black/20 rounded-xl border border-lumen-primary/30 overflow-hidden">
                                <div className="bg-lumen-primary/10 p-3 border-b border-lumen-primary/20 flex justify-between items-center">
                                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                        <ListPlus size={16} className="text-lumen-secondary" />
                                        {msg.planProposal.title || "Proposed Plan"}
                                    </h4>
                                    <span className="text-[10px] bg-lumen-primary/20 px-2 py-0.5 rounded text-lumen-primary border border-lumen-primary/30">
                                        {msg.planProposal.tasks.length} Missions
                                    </span>
                                </div>
                                <div className="p-3 space-y-2">
                                    {msg.planProposal.tasks.map((task, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-2 rounded bg-white/5 text-xs">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-1.5 h-1.5 rounded-full ${task.priority === 'high' ? 'bg-red-400' : task.priority === 'medium' ? 'bg-yellow-400' : 'bg-green-400'}`}></div>
                                                <span className="text-white font-medium">{task.text}</span>
                                            </div>
                                            <div className="text-lumen-mute flex items-center gap-2">
                                                {task.time && <span className="flex items-center gap-1"><Clock size={10} /> {task.time}</span>}
                                                <span className="text-lumen-secondary">{task.xp} XP</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="p-3 border-t border-white/10 flex gap-2">
                                    {msg.isPlanAccepted ? (
                                        <div className="w-full py-2 bg-green-500/10 text-green-400 border border-green-500/20 rounded-lg text-sm font-bold flex items-center justify-center gap-2">
                                            <CheckCircle size={16} /> Plan Added to Schedule
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={() => acceptPlan(msg.id, msg.planProposal!.tasks)}
                                            className="w-full liquid-button py-2 rounded-lg text-white text-sm font-bold flex items-center justify-center gap-2"
                                        >
                                            <CheckCircle size={16} /> Approve & Add Tasks
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                        
                        {msg.isStreaming && <span className="inline-block w-1.5 h-4 ml-1 bg-lumen-secondary align-middle animate-pulse"></span>}
                    </div>
                </div>
             ))}
             <div ref={messagesEndRef} />
          </div>

          <div className="p-4 bg-slate-950/50 border-t border-white/5">
             <form onSubmit={handleSend} className="relative flex items-center gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Message Sophus..."
                    disabled={isTyping}
                    className="flex-1 bg-white/5 border border-white/10 rounded-full px-6 py-3 text-white placeholder-lumen-mute/40 focus:outline-none focus:ring-1 focus:ring-lumen-primary/50 disabled:opacity-50 transition-all"
                />
                <button type="submit" disabled={!input.trim() || isTyping} className="p-3 rounded-full bg-lumen-primary text-white disabled:opacity-50 hover:bg-lumen-primary/80 transition-all shadow-[0_0_15px_rgba(139,92,246,0.4)]">
                    {isTyping ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                </button>
             </form>
          </div>
       </div>
    </div>
  );
};
