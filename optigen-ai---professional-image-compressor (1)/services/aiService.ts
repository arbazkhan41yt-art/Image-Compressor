
import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysis } from "../types";

export const analyzeImage = async (base64Image: string, mimeType: string): Promise<AIAnalysis> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    Analyze this image for professional compression optimization and smart cropping.
    1. Identify the primary subject and recommend a crop area (x, y, width, height as percentages 0-100) that keeps the most important visual information.
    2. Suggest the best format (AVIF, WebP, JPEG, PNG) and quality score.
    3. Evaluate visual complexity (1-10).
    Return only valid JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { data: base64Image, mimeType } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING },
            recommendedQuality: { type: Type.NUMBER },
            focusAreas: { type: Type.ARRAY, items: { type: Type.STRING } },
            suggestedFormat: { type: Type.STRING, enum: ['webp', 'jpeg', 'png', 'avif'] },
            complexityScore: { type: Type.NUMBER },
            savingsEstimate: { type: Type.STRING },
            smartCropSuggestion: {
              type: Type.OBJECT,
              properties: {
                x: { type: Type.NUMBER },
                y: { type: Type.NUMBER },
                width: { type: Type.NUMBER },
                height: { type: Type.NUMBER }
              },
              required: ["x", "y", "width", "height"]
            }
          },
          required: ["description", "recommendedQuality", "suggestedFormat", "complexityScore", "smartCropSuggestion"]
        }
      }
    });

    const text = response.text || "{}";
    return JSON.parse(text);
  } catch (error) {
    console.error("AI Analysis failed:", error);
    return {
      description: "Generic subject.",
      recommendedQuality: 75,
      focusAreas: ["Subject"],
      suggestedFormat: "webp",
      complexityScore: 5,
      savingsEstimate: "40%",
      smartCropSuggestion: { x: 0, y: 0, width: 100, height: 100 }
    };
  }
};
