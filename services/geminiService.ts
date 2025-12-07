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
  // Using gemini-2.5-flash-image for image generation tasks
  const model = "gemini-2.5-flash-image"; 

  try {
    const parts: any[] = [];

    // Order: Images first, then text prompt.
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
      // Note: responseMimeType is not supported for nano banana series
    });

    const candidate = response.candidates?.[0];
    if (!candidate) {
         throw new Error("API 响应为空，未返回任何候选结果。");
    }

    // Check for safety finish reason if no content or just to be safe
    if (candidate.finishReason === 'SAFETY') {
        throw new Error("由于安全策略，模型拒绝生成该图片。请尝试更换图片。");
    }

    const contentParts = candidate.content?.parts;
    if (contentParts) {
      // Prioritize finding the image
      for (const part of contentParts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
      
      // If no image, check for text message
      const textPart = contentParts.find(p => p.text);
      if (textPart && textPart.text) {
         let msg = textPart.text.trim();
         // Clean up if it's just empty code blocks which can happen on soft refusals
         if (msg.replace(/`/g, '').trim().length === 0) {
             msg = "模型未生成图片。这通常是因为输入图片触发了安全过滤或过于复杂。";
         }
         throw new Error(`生成失败: ${msg}`);
      }
    }

    throw new Error("未在响应中找到图片数据，也未找到错误说明。");

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    // Preserve our custom error messages
    if (error.message && (error.message.includes("生成失败") || error.message.includes("安全策略"))) {
        throw error;
    }
    throw new Error(error.message || "图片生成服务暂时不可用，请稍后再试。");
  }
};