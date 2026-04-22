import { GoogleGenAI } from "@google/genai";
import { Profile } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function getCycleInsights(profile: Profile) {
  // Take last few logs and cycles for context
  const recentCycles = profile.cycles.slice(-3);
  const recentLogs = profile.logs.slice(-10);

  const prompt = `
    You are an empathetic wellness assistant for a cycle tracking app called Cycle Harmony.
    You are providing insights for a profile named "${profile.name}".
    
    Context:
    - Average Cycle Length: ${profile.averageCycleLength} days
    - Average Period Length: ${profile.averagePeriodLength} days
    - Recent Cycles: ${JSON.stringify(recentCycles)}
    - Recent Moods/Symptoms: ${JSON.stringify(recentLogs)}
    
    Based on this data, provide:
    1. A summary of their current phase (if predictable).
    2. 3 actionable tips for the tracker (the person using the app) to support ${profile.name} or for ${profile.name} themselves. 
       - For example: if PMS is near, suggest buying chocolate or being extra patient.
       - If they logged "Cramps", suggest heat pads.
    
    Format the response as a JSON object:
    {
      "summary": "string",
      "tips": ["string", "string", "string"],
      "phase": "string"
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Gemini Error:", error);
    return null;
  }
}
