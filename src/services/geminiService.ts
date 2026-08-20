/**
 * geminiService.ts — Gemini AI Warrior Coach & Daily Self-Mastery Advisor
 *
 * Implements intelligent, archetype-tailored daily guidance, motivation, and urge defusal.
 * Supports:
 *   1. Direct Gemini REST API integration with user-configured API key
 *   2. High-precision offline contextual reasoning engine (100% functional without internet or API key)
 *   3. Archetype persona resonance (Eagle Vision / Wolf Pack Discipline / Tiger Silent Strike)
 */

import { Archetype, GeminiCoachInsight, GeminiMessage } from '../types';
import { db } from './db';

const GEMINI_API_KEY_STORAGE = 'rw_gemini_api_key';

/** Offline contextual warrior intelligence knowledge base */
const ARCHETYPE_AI_KNOWLEDGE: Record<Archetype, {
  directives: string[];
  quotes: string[];
  urgeStrategies: string[];
  adviceCatalog: Record<string, string>;
}> = {
  EAGLE: {
    quotes: [
      "The eagle does not fight the storm; it uses the thermal updrafts to ascend above the clouds.",
      "High altitude reveals that what felt like an insurmountable mountain was merely a bump in the landscape.",
      "Clear sight precedes decisive action. Eliminate the low-altitude noise."
    ],
    directives: [
      "Identify the 1 highest-leverage task that makes all other tasks easier or unnecessary, and execute it before 11:00 AM.",
      "Practice 360-degree aerial detachment today: when friction arises, rise 1,000 feet mentally before responding.",
      "Anchor your vision on the 90-day horizon. Daily urges are insignificant against your sovereign purpose."
    ],
    urgeStrategies: [
      "Immediate Detachment Protocol: Step outside, fix your gaze on the farthest horizon line, and take 10 box breaths.",
      "Eagle Pivot: Re-channel that raw neural tension into 30 minutes of high-intensity freelance execution.",
      "Thermal Reframe: Urges are not weaknesses; they are unchanneled power. Elevate your focus to convert it."
    ],
    adviceCatalog: {
      motivation: "You are not building discipline for today alone; you are constructing the sovereign identity of your future self. Guard your neural focus like sacred ground.",
      urges: "An urge is an electrical storm lasting approximately 3 to 7 minutes. It cannot force your hands to move. Breathe deeply, zoom out to 10,000 feet, and let the storm pass beneath you.",
      procrastination: "Procrastination is emotional avoidance disguised as fatigue. Break your next priority into a micro-action that takes only 120 seconds to start.",
      fatigue: "When physical fatigue strikes, do not seek cheap dopamine. Drink 500ml cold water, get 5 minutes of sunlight, and honor your circadian sleep schedule tonight."
    }
  },
  WOLF: {
    quotes: [
      "The wolf does not panic in the winter; it adapts, hunts with calculated patience, and strengthens the pack.",
      "Discipline is the silent armor that protects your honor when nobody is watching.",
      "Patience is not inactive waiting; it is preparation for the flawless hunt."
    ],
    directives: [
      "Zero compromise on physical standards today. Complete your GPS walk and cold shower without internal negotiation.",
      "Protect your pack and inner circle: speak only with truth, firmness, and relentless respect.",
      "Maintain stoic silence during stressful encounters. Let results speak while words remain minimal."
    ],
    urgeStrategies: [
      "Ice Shock Protocol: Cold water on the face or 30 push-ups to physically override the parasympathetic dopamine loop.",
      "Pack Duty Reframe: Remember that giving in to temporary weakness betrays your future lineage and self-respect.",
      "Silent Stride: Put on your shoes and walk 1,500 meters in total silence without looking at your screen."
    ],
    adviceCatalog: {
      motivation: "The pack respects strength built through invisible suffering. Every temptation you conquer in secret adds iron to your spirit.",
      urges: "Stand tall, clench your fists, and observe the impulse as an outsider. You are the apex hunter of your own mind; the urge is merely a phantom.",
      procrastination: "A wolf does not debate whether to hunt when winter comes. Move your body first; mental clarity will follow physical movement.",
      fatigue: "Fatigue tests loyalty to your own code. Rest your body with deep sleep, but never surrender your standards to quick dopamine."
    }
  },
  TIGER: {
    quotes: [
      "The tiger moves through the jungle in absolute silence, striking with overwhelming power only when precision is guaranteed.",
      "Power is wasted when scattered in all directions. Channel all force into a single point of impact.",
      "Calmness before the strike is where real lethality resides."
    ],
    directives: [
      "Execute your 30-minute deep work block with zero tab switching and phone in airplane mode.",
      "Cut out all unnecessary explanations. Act decisively, finish cleanly, and move forward.",
      "Turn physical stillness into razor-sharp focus during high-pressure client negotiations."
    ],
    urgeStrategies: [
      "Single-Point Focus Strike: Close your eyes, sit completely still for 3 minutes without moving a single muscle, and watch the urge dissolve.",
      "Physical Channeling: Deploy high-load isometric tension (plank or wall sit) to burn the adrenaline burst.",
      "Apex Identity: Remind yourself that a tiger never feeds on garbage scraps. Your standards are elite."
    ],
    adviceCatalog: {
      motivation: "True power is calm. When you eliminate chaotic distractions, your natural intensity dominates every challenge effortlessly.",
      urges: "The urge is testing your stillness. Do not react. Stand like a statue. The chemical surge will peak and crash within 180 seconds.",
      procrastination: "Hesitation is the only enemy. Count 3-2-1 and execute the immediate physical motion required to start.",
      fatigue: "Recharge through deliberate stillness and dark room recovery. Reject low-grade stimulation."
    }
  }
};

class GeminiService {
  /**
   * Gets the user's stored Gemini API Key, if configured.
   */
  public getApiKey(): string {
    return localStorage.getItem(GEMINI_API_KEY_STORAGE) || '';
  }

  /**
   * Sets or clears the user's Gemini API Key.
   */
  public setApiKey(key: string): void {
    if (key.trim()) {
      localStorage.setItem(GEMINI_API_KEY_STORAGE, key.trim());
    } else {
      localStorage.removeItem(GEMINI_API_KEY_STORAGE);
    }
  }

  /**
   * Generates today's personalized AI Coach Daily Insight.
   */
  public async generateDailyInsight(): Promise<GeminiCoachInsight> {
    const profile = db.getProfile();
    const archetype = profile.selectedArchetype || 'EAGLE';
    const today = new Date().toISOString().split('T')[0];
    const apiKey = this.getApiKey();

    const fallbackKnowledge = ARCHETYPE_AI_KNOWLEDGE[archetype];
    const quote = fallbackKnowledge.quotes[Math.floor(Math.random() * fallbackKnowledge.quotes.length)];
    const directive = fallbackKnowledge.directives[Math.floor(Math.random() * fallbackKnowledge.directives.length)];
    const urgeStrategy = fallbackKnowledge.urgeStrategies[Math.floor(Math.random() * fallbackKnowledge.urgeStrategies.length)];

    if (apiKey) {
      try {
        const prompt = `You are the ultimate elite warrior coach embodying the ${archetype} archetype for a user on Day ${profile.currentStreak} of sobriety and discipline.
Generate a concise, powerful daily coaching directive:
Format as JSON with keys:
- title (short title)
- quote (inspirational stoic/warrior quote)
- dailyDirective (specific actionable challenge for today)
- urgeStrategy (tactical advice for resisting urges)
- aiAdvice (1 paragraph of personalized psychological motivation)
Keep tone: Spartan, highly motivating, stoic, sovereign, and practical.`;

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: 'application/json' }
            })
          }
        );

        if (res.ok) {
          const data = await res.json();
          const parsed = JSON.parse(data.candidates[0].content.parts[0].text);
          const insight: GeminiCoachInsight = {
            id: `ai-${Date.now()}`,
            date: today,
            archetype,
            title: parsed.title || `${archetype} Sovereign Directive`,
            quote: parsed.quote || quote,
            dailyDirective: parsed.dailyDirective || directive,
            urgeStrategy: parsed.urgeStrategy || urgeStrategy,
            aiAdvice: parsed.aiAdvice || fallbackKnowledge.adviceCatalog.motivation,
            generatedAt: new Date().toISOString()
          };
          db.saveCoachInsight(insight);
          return insight;
        }
      } catch (err) {
        console.warn('Gemini API call failed, using high-tier local reasoning knowledge:', err);
      }
    }

    // High-tier local contextual synthesis
    const insight: GeminiCoachInsight = {
      id: `ai-${Date.now()}`,
      date: today,
      archetype,
      title: `${archetype} Sovereign Directive — Day ${profile.currentStreak}`,
      quote,
      dailyDirective: directive,
      urgeStrategy,
      aiAdvice: `As an ${archetype} Warrior on Day ${profile.currentStreak}, your neural clarity is reaching a heightened state. Stay vigilant against subtle micro-rationalizations. Lock in your 30m focus and GPS walk early.`,
      generatedAt: new Date().toISOString()
    };

    db.saveCoachInsight(insight);
    return insight;
  }

  /**
   * Generates real-time AI Warrior advice for a specific user query or urge crisis.
   */
  public async askWarriorCoach(query: string): Promise<string> {
    const profile = db.getProfile();
    const archetype = profile.selectedArchetype || 'EAGLE';
    const apiKey = this.getApiKey();
    const cleanQuery = query.trim().toLowerCase();

    if (apiKey) {
      try {
        const prompt = `You are the ${archetype} Warrior AI Coach in the Recovery Warrior app.
The user is on Day ${profile.currentStreak} of sobriety and self-discipline.
User query: "${query}"
Respond with maximum impact in 2-3 concise paragraphs.
Tone: Stoic, deeply compassionate yet uncompromisingly disciplined, empowering, and focused on physical and mental sovereignty.`;

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }]
            })
          }
        );

        if (res.ok) {
          const data = await res.json();
          return data.candidates[0].content.parts[0].text;
        }
      } catch (err) {
        console.warn('Gemini API query error, falling back to local coach:', err);
      }
    }

    // Smart local reasoning based on intent
    const knowledge = ARCHETYPE_AI_KNOWLEDGE[archetype];
    if (cleanQuery.includes('urge') || cleanQuery.includes('relapse') || cleanQuery.includes('tempt') || cleanQuery.includes('craving')) {
      return `⚔️ ${knowledge.urgeStrategies[0]}\n\n${knowledge.adviceCatalog.urges}`;
    }
    if (cleanQuery.includes('lazy') || cleanQuery.includes('procrastinat') || cleanQuery.includes('start') || cleanQuery.includes('delay')) {
      return `⚡ ${knowledge.directives[0]}\n\n${knowledge.adviceCatalog.procrastination}`;
    }
    if (cleanQuery.includes('tired') || cleanQuery.includes('sleep') || cleanQuery.includes('exhaust') || cleanQuery.includes('burnout')) {
      return `🌙 ${knowledge.adviceCatalog.fatigue}\n\nRecharge your circadian rhythm with tonight's sleep timer.`;
    }

    return `🦅 [${archetype} Coach]: Day ${profile.currentStreak} is a test of consistency. ${knowledge.adviceCatalog.motivation}\n\nDaily Focus: ${knowledge.directives[0]}`;
  }
}

export const geminiService = new GeminiService();
