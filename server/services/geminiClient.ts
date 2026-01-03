/**
 * Gemini Client v2.0
 *
 * Google Gemini AI integration for text generation, streaming, and chat.
 * Uses the @google/generative-ai SDK for API communication.
 *
 * @version 2.0.0
 * @adaptable true - Gracefully handles missing API key, returns empty results
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GOOGLE_API_KEY || process.env.AI_INTEGRATIONS_GEMINI_API_KEY || "";
const ai = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export async function generateText(prompt: string, model: string = "gemini-1.5-flash"): Promise<string> {
  if (!ai) {
    console.warn("Gemini not configured - returning empty response");
    return "";
  }

  const genModel = ai.getGenerativeModel({ model });
  const result = await genModel.generateContent(prompt);
  const response = await result.response;
  return response.text() || "";
}

export async function streamText(prompt: string, model: string = "gemini-1.5-flash"): Promise<AsyncGenerator<string>> {
  async function* emptyStream() {
    yield "";
  }

  if (!ai) {
    console.warn("Gemini not configured - returning empty stream");
    return emptyStream();
  }

  const genModel = ai.getGenerativeModel({ model });
  const result = await genModel.generateContentStream(prompt);

  async function* textStream() {
    for await (const chunk of result.stream) {
      yield chunk.text() || "";
    }
  }
  return textStream();
}

export async function generateImage(prompt: string): Promise<string> {
  // Note: Image generation requires different API access
  throw new Error("Image generation not supported with current Gemini SDK");
}

export async function chat(messages: Array<{ role: string; content: string }>, model: string = "gemini-1.5-flash"): Promise<string> {
  if (!ai) {
    console.warn("Gemini not configured - returning empty response");
    return "";
  }

  const genModel = ai.getGenerativeModel({ model });

  // Convert to Gemini format and start chat
  const history = messages.slice(0, -1).map(msg => ({
    role: msg.role === "assistant" ? "model" : "user",
    parts: [{ text: msg.content }]
  }));

  const chat = genModel.startChat({ history });
  const lastMessage = messages[messages.length - 1];

  if (!lastMessage) {
    return "";
  }

  const result = await chat.sendMessage(lastMessage.content);
  const response = await result.response;
  return response.text() || "";
}

export function isGeminiConfigured(): boolean {
  return !!apiKey;
}
