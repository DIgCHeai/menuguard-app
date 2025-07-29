import { AnalysisResult, ChatMessage } from '../types';

/**
 * Resizes an image file to a max dimension while maintaining aspect ratio,
 * and then converts it to a base64 string.
 * This is crucial to prevent oversized payloads for the Gemini API.
 * @param {File} file The image file to process.
 * @param {number} maxDimension The maximum width or height for the image.
 * @returns {Promise<{base64: string, mimeType: string}>}
 */
const processImageForUpload = (file: File, maxDimension: number = 800): Promise<{ base64: string, mimeType: string }> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onerror = () => reject(new Error("Failed to read file."));
        reader.onload = (readerEvent) => {
            if (!readerEvent.target?.result) {
                return reject(new Error("Failed to read file."));
            }
            const img = new Image();
            img.onerror = () => reject(new Error("Failed to process image."));
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let { width, height } = img;

                if (width > height) {
                    if (width > maxDimension) {
                        height = Math.round(height * (maxDimension / width));
                        width = maxDimension;
                    }
                } else {
                    if (height > maxDimension) {
                        width = Math.round(width * (maxDimension / height));
                        height = maxDimension;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    return reject(new Error('Could not get canvas context'));
                }
                ctx.drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                const base64 = dataUrl.split(',')[1];
                resolve({ base64, mimeType: 'image/jpeg' });
            };
            img.src = readerEvent.target.result as string;
        };
    });
};

// Generic fetch handler for all our backend API calls
async function fetchFromApi(endpoint: string, body: object) {
    const response = await fetch(`/.netlify/functions/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        try {
            const errorBody = await response.json();
            throw new Error(errorBody.error || `Request failed with status ${response.status}`);
        } catch {
            throw new Error(`Request failed with status ${response.status}`);
        }
    }
    return response.json();
}

/**
 * Analyzes a menu by sending the data to our secure backend function.
 */
export async function analyzeMenu(
    allergies: string,
    preferences: string,
    menuText: string,
    menuImage: File | null,
    menuUrl: string
): Promise<AnalysisResult[]> {
    let imagePayload: { data: string, mimeType: string } | null = null;
    if (menuImage) {
        try {
            const processedImage = await processImageForUpload(menuImage);
            imagePayload = { data: processedImage.base64, mimeType: processedImage.mimeType };
        } catch (err) {
            console.error("Client-side image processing failed:", err);
            throw new Error("The selected image could not be processed. It may be corrupted or in an unsupported format. Please try a different image.");
        }
    }

    const payload = {
        type: 'analyze',
        data: { allergies, preferences, menuText, imagePayload, menuUrl },
    };

    return fetchFromApi('api', payload);
}

/**
 * Generates a summary by calling the backend function.
 */
export async function summarizeSafeOptions(
    results: AnalysisResult[],
    allergies: string,
    preferences: string
): Promise<string> {
    const payload = {
        type: 'summarize',
        data: { results, allergies, preferences },
    };
    const response = await fetchFromApi('api', payload);
    return response.summary;
}

/**
 * Finds an alternative by calling the backend function.
 */
export async function findSafeAlternative(
    allergies: string,
    preferences: string,
    unsafeItemName: string,
    menuContext: { text?: string; url?: string },
    safeItems: string[]
): Promise<string> {
    const payload = {
        type: 'alternative',
        data: { allergies, preferences, unsafeItemName, menuContext, safeItems },
    };
    const response = await fetchFromApi('api', payload);
    return response.alternative;
}

/**
 * Continues a chat conversation by calling the backend function.
 */
export async function continueChat(history: ChatMessage[], message: string): Promise<string> {
    const payload = {
        type: 'chat',
        data: { history, message },
    };
    const response = await fetchFromApi('api', payload);
    return response.reply;
}

// This function remains on the client as it's just setting up initial state.
export function startMenuChat(
    allergies: string,
    preferences: string,
    menuAnalysis: AnalysisResult[],
): ChatMessage[] {
    const initialAssistantMessageContent = `Of course! I've reviewed the menu based on your allergies and preferences. The analysis is displayed above. What questions do you have? For example, you could ask "Why is the House Burger marked as caution?" or "What are the best vegan options?".`;
    
    const initialMessage: ChatMessage = {
        role: 'model',
        content: initialAssistantMessageContent,
    };
    
    const primingContext: ChatMessage[] = [
      { role: 'user', content: `Here is the initial analysis of a menu I provided. My allergies are (${allergies}) and my preferences are (${preferences}). The menu analysis is: ${JSON.stringify(menuAnalysis)}`},
      initialMessage
    ];

    return primingContext;
}
