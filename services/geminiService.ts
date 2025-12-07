import { GoogleGenAI } from "@google/genai";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Please set process.env.API_KEY.");
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Converts a base64 string (data:image/...) to a raw base64 string without the prefix
 */
const stripBase64Prefix = (base64Str: string): string => {
  return base64Str.split(',')[1] || base64Str;
};

export const generateChibiStyle = async (
  contentImage: string,
  styleImage: string | null,
  customPrompt: string
): Promise<string> => {
  const ai = getClient();
  const model = "gemini-2.5-flash-image"; // Optimized for general image tasks including editing/transformation

  try {
    const parts: any[] = [];

    // Order matters: Providing images first often helps the model understand context before instruction.
    
    // 1. Style Reference (if provided)
    if (styleImage) {
      parts.push({
        inlineData: {
          mimeType: "image/png",
          data: stripBase64Prefix(styleImage)
        }
      });
    }

    // 2. Content Image (Target)
    parts.push({
      inlineData: {
        mimeType: "image/png",
        data: stripBase64Prefix(contentImage)
      }
    });

    // 3. Add the text prompt last
    parts.push({ text: customPrompt });

    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: parts
      },
      // Note: responseMimeType is not supported for nano banana series (flash-image)
    });

    // Parse response for image
    if (response.candidates && response.candidates.length > 0) {
      const parts = response.candidates[0].content.parts;
      
      // First check for image
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
      
      // If no image found, check for text (refusal or explanation)
      const textPart = parts.find(p => p.text);
      if (textPart && textPart.text) {
         throw new Error(`模型未生成图片，返回信息: ${textPart.text}`);
      }
    }

    throw new Error("未在响应中找到图片数据 (No image data found)。");

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error(error.message || "图片生成失败。");
  }
};