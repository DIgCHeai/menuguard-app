// Using esm.sh for Deno/Edge compatibility in Netlify Functions
import { GoogleGenAI, Type } from "https://esm.sh/@google/genai@^1.7.0";
import type { GenerateContentResponse } from "https://esm.sh/@google/genai@^1.7.0";

// --- Types (must be self-contained or imported from a shared location) ---
enum SafetyLevel {
    Safe = 'safe',
    Caution = 'caution',
    Unsafe = 'unsafe',
}

// --- AI Initialization (runs securely on the server) ---
const apiKey = process.env.API_KEY;
if (!apiKey) {
    throw new Error("API_KEY environment variable is not set.");
}
const ai = new GoogleGenAI({ apiKey });


// --- Schema Definitions ---
const analysisResultSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            itemName: { type: Type.STRING, description: "The name of the menu item." },
            safetyLevel: { type: Type.STRING, enum: [SafetyLevel.Safe, SafetyLevel.Caution, SafetyLevel.Unsafe] },
            reasoning: { type: Type.STRING, description: "A concise explanation for the safety level." },
            identifiedAllergens: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["itemName", "safetyLevel", "reasoning", "identifiedAllergens"]
    }
};

// --- API Logic ---

async function handleAnalyze(data: any) {
    const { allergies, preferences, menuText, imagePayload, menuUrl } = data;
    
    const parts: any[] = [];
    let menuContentPrompt = "";

    if (menuUrl?.trim()) {
        menuContentPrompt = `Analyze the menu from this URL: ${menuUrl}`;
    } else if (imagePayload) {
        menuContentPrompt = "Analyze the menu in this image.";
        parts.push({ inlineData: { data: imagePayload.data, mimeType: imagePayload.mimeType } });
    } else if (menuText?.trim()) {
        menuContentPrompt = `Analyze this menu text: \n\n\`\`\`\n${menuText}\n\`\`\``;
    } else {
        throw new Error("No menu content provided for analysis.");
    }
    
    parts.unshift({ text: menuContentPrompt });

    const systemInstruction = `You are "Menu Guard," an expert AI assistant specializing in food allergies and dietary restrictions. Your task is to analyze a restaurant menu for a user with specific needs.

User Profile:
- Allergies: ${allergies}
- Dietary Preferences: ${preferences || 'None'}

Your instructions are:
1.  Carefully examine every item on the provided menu.
2.  For each item, determine its safety level: 'safe', 'caution', or 'unsafe'.
3.  Provide a concise 'reasoning' for your classification.
4.  If unsafe or caution, list the specific 'identifiedAllergens'.
5.  Return the analysis as a JSON array that conforms to the provided schema. Do not include any extra text or explanations outside of the JSON structure. If the menu is empty or unreadable, return an empty array.`;

    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts },
        config: { systemInstruction, responseMimeType: "application/json", responseSchema: analysisResultSchema }
    });
    
    const jsonText = response.text.trim();
    return JSON.parse(jsonText || '[]');
}

async function handleSummarize(data: any) {
    const { results, allergies, preferences } = data;
    const prompt = `Based on this JSON analysis of a menu: ${JSON.stringify(results)}, write a short, friendly, and encouraging summary for a user whose allergies are "${allergies}" and preferences are "${preferences}". Start by highlighting the best-looking safe options. Keep it to 2-3 sentences.`;
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return { summary: response.text };
}

async function handleAlternative(data: any) {
    const { allergies, preferences, unsafeItemName, menuContext, safeItems } = data;
    const safeItemsContext = safeItems.length > 0 ? `Here is a list of items already known to be safe: ${safeItems.join(', ')}.` : '';
    const menuDataSource = menuContext.url ? `the menu at this URL: ${menuContext.url}` : `this menu text: \n\`\`\`\n${menuContext.text}\n\`\`\``;
    const prompt = `A user with allergies "${allergies}" and preferences "${preferences}" cannot eat "${unsafeItemName}". Based on ${menuDataSource}, suggest a single, specific, safer alternative item. Briefly explain why it's a better choice. ${safeItemsContext}`;
    const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
    return { alternative: response.text };
}

async function handleChat(data: any) {
    const { history, message } = data;
    const chat = ai.chats.create({ model: 'gemini-2.5-flash', history });
    const response = await chat.sendMessage({ message });
    return { reply: response.text };
}

// --- Main Handler ---
export default async (req: Request) => {
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
    }
    
    try {
        const { type, data } = await req.json();

        let result;
        switch (type) {
            case 'analyze':
                result = await handleAnalyze(data);
                break;
            case 'summarize':
                result = await handleSummarize(data);
                break;
            case 'alternative':
                result = await handleAlternative(data);
                break;
            case 'chat':
                result = await handleChat(data);
                break;
            default:
                throw new Error(`Unknown API request type: ${type}`);
        }

        return new Response(JSON.stringify(result), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (e) {
        console.error("API Function Error:", e);
        return new Response(JSON.stringify({ error: e.message || 'An internal server error occurred.' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};