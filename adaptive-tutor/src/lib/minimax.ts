import { createAnthropic } from "@ai-sdk/anthropic";

// ---------------------------------------------------------------------------
// MiniMax client via Vercel AI SDK's Anthropic-compatible provider
//
// MiniMax coding plans expose an Anthropic-compatible API at https://api.minimax.io/anthropic
// Models: MiniMax-M2.5, MiniMax-M2.5-highspeed, MiniMax-M2.1, MiniMax-M2.1-highspeed, MiniMax-M2
// ---------------------------------------------------------------------------

// Use official MiniMax env variables per their documentation
const apiKey = process.env.ANTHROPIC_API_KEY || process.env.MINIMAX_API_KEY || "";
const baseURL = process.env.ANTHROPIC_BASE_URL || "https://api.minimax.io/anthropic";

if (!apiKey && typeof window === "undefined") {
  console.warn(
    "⚠️  ANTHROPIC_API_KEY (or MINIMAX_API_KEY) is not set in .env.local — LLM calls will fail."
  );
}

export const minimax = createAnthropic({
  apiKey,
  baseURL,
  // MiniMax coding plan uses Anthropic-compatible API
});

// Model names for MiniMax Anthropic API
// Use M2.5-highspeed for faster responses, M2.5 for higher quality
export const MINIMAX_MODEL_STRONG = "MiniMax-M2.5";
export const MINIMAX_MODEL_FAST = "MiniMax-M2.5-highspeed";

// Re-export for convenience
export { generateText, streamText } from "ai";
