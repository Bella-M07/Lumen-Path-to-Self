

import { GoogleGenAI, Type, Tool, FunctionDeclaration } from "@google/genai";
import { SophusTone, ChatMessage, MoodLog, JournalType, Task, Habit, JournalEntry, PriorityType, QuoteCategory } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const MODEL_NAME = "gemini-2.5-flash";

// --- Tool Definitions for Chat ---
const proposePlanTool: FunctionDeclaration = {
  name: "propose_plan",
  description: "Propose a list of tasks/missions for the user to review and approve. Use this for goal breakdown or scheduling.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: "Title of this plan (e.g. 'Morning Routine', 'Goal Roadmap')" },
      tasks: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
             text: { type: Type.STRING, description: "Task title" },
             priority: { type: Type.STRING, enum: ["low", "medium", "high"] },
             duration: { type: Type.INTEGER, description: "Duration in minutes" },
             date: { type: Type.STRING, description: "YYYY-MM-DD" },
             time: { type: Type.STRING, description: "HH:MM (Optional)" },
             xp: { type: Type.INTEGER, description: "Suggested XP (10-100)" }
          }
        }
      }
    },
    required: ["tasks"]
  }
};

const addGoalTool: FunctionDeclaration = {
    name: "add_goal",
    description: "Add a high-level goal or objective to the user's profile.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING, description: "The high-level goal title (e.g., 'Learn React', 'Run a Marathon')" }
        },
        required: ["title"]
    }
};

export const chatTools: Tool[] = [{
  functionDeclarations: [proposePlanTool, addGoalTool]
}];

const getSystemInstruction = (userName: string, tone: SophusTone, customPrompt?: string): string => {
  let toneInstruction = "";
  
  if (tone === SophusTone.CUSTOM && customPrompt) {
    toneInstruction = `USER DEFINED PERSONA: ${customPrompt}`;
  } else {
    switch (tone) {
      case SophusTone.STOIC:
        toneInstruction = "You are stoic, logical, and direct. Focus on what is within control.";
        break;
      case SophusTone.MOTIVATIONAL:
        toneInstruction = "You are a high-energy coach. Focus on action and momentum!";
        break;
      case SophusTone.ANALYTICAL:
        toneInstruction = "You are analytical. Break problems down. Be objective.";
        break;
      case SophusTone.EMPATHETIC:
      default:
        toneInstruction = "You are a warm, kind, and empathetic friend. Validate feelings first.";
        break;
    }
  }

  return `You are Sophus, a 'System' guide (like in a lit-rpg) and companion for ${userName || 'the Player'}.
  
  Tone: ${toneInstruction}
  
  CAPABILITIES:
  1. **Goal Breakdown**: When the user mentions a goal:
     - FIRST, ask clarifying questions to understand constraints and current status.
     - THEN, provide a structured plan using 'propose_plan'.
  2. **Task Suggestions**: When helping the user plan their day or schedule, use 'propose_plan' to present a list of tasks.
     - IMPORTANT: The user must SEE and APPROVE the plan. Do not assume tasks are added instantly.
     - If the user asks for changes, call 'propose_plan' again with the updated list.
  3. **Goal Tracking**: Use 'add_goal' to register new major objectives.
  4. **Gamification**: Treat self-improvement like leveling up.
  
  CORE RULES:
  - NEVER say "I have added the tasks". Say "Here is a proposed plan. Shall I add these to your schedule?"
  - Use the 'propose_plan' tool to show the tasks visually.
  - Keep responses concise.
  - No green colors in descriptions (Cyberpunk aesthetic: Blue, Pink, Purple, Black).
  `;
};

// ... (Existing generateJournalPrompt, analyzeMoodTrends - Unchanged) ...
export const generateJournalPrompt = async (recentEntries: string, shareData: boolean): Promise<string> => {
  try {
    const context = shareData ? `Based on these recent journal entry summaries: "${recentEntries.slice(0, 500)}".` : "Based on general self-improvement themes.";
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `${context} Generate ONE thought-provoking journal prompt. Keep it under 20 words.`,
    });
    return response.text || "What is one small thing you can control today?";
  } catch (error) {
    return "What is on your mind right now?";
  }
};

export const analyzeMoodTrends = async (moodLogs: MoodLog[], userName: string): Promise<string> => {
  if (moodLogs.length < 3) return "I need a few more mood entries to spot the patterns.";
  try {
    const logsText = moodLogs.slice(-10).map(l => `${l.date}: ${l.mood} (${l.note || ''})`).join('\n');
    const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: `Analyze trends for ${userName}: ${logsText}. Provide gentle insight under 40 words.`
    });
    return response.text || "Keep tracking your journey.";
  } catch (error) {
    return "I am analyzing the currents of your emotions.";
  }
};

// ... (Existing generateInsights - Unchanged) ...
export const generateInsights = async (moodLogs: MoodLog[], tasks: Task[], habits: Habit[], entries: JournalEntry[], userName: string, tone: SophusTone, shareJournalContent: boolean): Promise<string> => {
  try {
    const activeHabits = habits.filter(h => h.streak > 0).map(h => h.title).join(", ");
    const recentTasks = tasks.filter(t => t.completed).length;
    const dataSummary = `Tasks Completed: ${recentTasks}, Active Habits: ${activeHabits}`;
    
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Analyze data for ${userName}: ${dataSummary}. Provide one sophisticated insight connecting habits and productivity. Max 50 words. Tone: ${tone}.`
    });
    return response.text || "Consistency is key.";
  } catch (error) {
    return "Gathering more data...";
  }
};

// --- NEW: XP Estimation ---
export const estimateTaskXP = async (taskText: string, priority: string, duration: number): Promise<number> => {
  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Task: "${taskText}", Priority: ${priority}, Duration: ${duration}min. 
      Rate the difficulty and assign XP (Experience Points) for a gamified productivity app.
      Return ONLY the number (integer between 10 and 100).`,
    });
    const xp = parseInt(response.text?.trim() || "20");
    return isNaN(xp) ? 20 : xp;
  } catch (error) {
    return 20;
  }
};

// --- NEW: Task Recommendations ---
export const recommendTasks = async (
  currentTasks: Task[], 
  habits: Habit[], 
  goalsContext: string
): Promise<Array<{ text: string, priority: PriorityType, xp: number }>> => {
  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `User Context: ${goalsContext}. Current Tasks: ${currentTasks.length}. Habits: ${habits.map(h=>h.title).join(',')}.
      Suggest 3 specific, actionable tasks to add to their Inbox for today.
      Return JSON format: [{"text": "Task Name", "priority": "medium", "xp": 30}]`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              priority: { type: Type.STRING, enum: ["low", "medium", "high"] },
              xp: { type: Type.INTEGER }
            }
          }
        }
      }
    });
    
    const json = JSON.parse(response.text || "[]");
    return Array.isArray(json) ? json : [];
  } catch (error) {
    console.error(error);
    return [{ text: "Review your goals", priority: "medium", xp: 15 }];
  }
};

// --- Updated Chat Stream to include Tools ---
export const streamSophusChat = async function* (
  history: ChatMessage[],
  newMessage: string,
  userName: string,
  tone: SophusTone,
  customPrompt?: string
) {
  try {
    const chat = ai.chats.create({
      model: MODEL_NAME,
      config: {
        systemInstruction: getSystemInstruction(userName, tone, customPrompt),
        tools: chatTools, 
      },
      history: history.map(h => ({
        role: h.role,
        parts: h.toolCallId 
          ? [{ functionResponse: { name: h.toolResponse ? JSON.parse(h.toolResponse).name : 'unknown', response: { result: 'success' } } }] 
          : [{ text: h.text }]
      }))
    });

    const result = await chat.sendMessageStream({ message: newMessage });

    for await (const chunk of result) {
        // Check for function calls
        const functionCalls = chunk.functionCalls;
        if (functionCalls && functionCalls.length > 0) {
            yield { type: 'tool_call', call: functionCalls[0] };
        }
        if (chunk.text) {
            yield { type: 'text', content: chunk.text };
        }
    }
  } catch (error) {
    console.error("Chat stream error", error);
    yield { type: 'text', content: "System Error: Connection unstable." };
  }
};

export const generateAffirmation = async (
    tone: SophusTone, 
    likedQuotes: string[] = [], 
    categories: QuoteCategory[] = ['affirmation'],
    customPreference: string = ''
): Promise<string> => {
   try {
    let context = "";
    
    // 1. Incorporate User Categories
    const catMap: Record<string, string> = {
        'affirmation': "Positive daily affirmations",
        'stoic': "Stoic philosophy (Marcus Aurelius, Seneca)",
        'productivity': "Quotes about hard work, focus, and discipline",
        'confidence': "Quotes boosting self-worth and bravery",
        'literature': "Beautiful prose from classic literature"
    };
    
    const selectedDesc = categories.map(c => c === 'custom' ? customPreference : catMap[c]).filter(Boolean).join(", ");
    
    if (selectedDesc) {
        context += `User prefers these types of quotes: ${selectedDesc}. `;
    }

    // 2. Incorporate Liked Quotes History
    if (likedQuotes.length > 0) {
      // Pass a few examples of what the user likes to help Sophus "learn"
      const examples = likedQuotes.slice(-3).join(" | ");
      context += `User previously LIKED these specific quotes: "${examples}". `;
    }

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Generate a short quote/affirmation. ${context} 
      Constraint: Max 20 words. Unique and impactful. 
      Sophus Tone: ${tone}.
      If categories are mixed, choose one that fits the 'Guide' persona best right now.`,
    });
    return response.text || "I am the architect of my reality.";
  } catch (error) {
    return "I am enough.";
  }
};

export const generateCheckInQuestions = async (type: JournalType, tone: SophusTone): Promise<string[]> => {
    if (type === 'free') return [];
    try {
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: `Generate 3 short introspection questions for ${type}. Tone: ${tone}. JSON Array.`,
            config: { responseMimeType: 'application/json', responseSchema: { type: Type.ARRAY, items: { type: Type.STRING } } }
        });
        const parsed = JSON.parse(response.text || "[]");
        return parsed.length ? parsed : ["How are you?", "What went well?", "What to improve?"];
    } catch (error) {
        return ["How are you?", "What went well?", "What to improve?"];
    }
};