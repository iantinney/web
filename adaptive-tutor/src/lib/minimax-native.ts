/**
 * MiniMax client via direct fetch to Anthropic-compatible API
 * Uses the official MiniMax Anthropic-compatible API at https://api.minimax.io/anthropic
 */

// Lazy evaluation of API key — evaluated at function call time, not module load time
function getApiKey(): string {
  return process.env.ANTHROPIC_API_KEY || process.env.MINIMAX_API_KEY || "";
}

function getBaseURL(): string {
  return process.env.ANTHROPIC_BASE_URL || "https://api.minimax.io/anthropic";
}

export interface MinimaxMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Generate text using MiniMax Anthropic-compatible API via direct fetch
 */
export async function generateText(
  messages: MinimaxMessage[],
  systemPrompt: string,
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }
): Promise<string> {
  const model = options?.model || process.env.MINIMAX_MODEL || "MiniMax-M2.5";
  const temperature = options?.temperature ?? 0.5;
  const maxTokens = options?.maxTokens ?? 4096;
  const apiKey = getApiKey();
  const baseURL = getBaseURL();

  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY/MINIMAX_API_KEY is not configured");
  }

  try {
    console.debug(`[MiniMax] Calling ${model} with temp=${temperature}, messages=${messages.length}`);

    const payload = {
      model,
      system: systemPrompt,
      messages: messages.map(m => ({
        role: m.role,
        // Anthropic-compatible format uses content blocks.
        content: [{ type: "text", text: m.content }],
      })),
      temperature,
      max_tokens: maxTokens,
    };

    console.debug(`[MiniMax] Request payload keys: ${Object.keys(payload).join(", ")}`);

    const endpoint = `${baseURL}/v1/messages`;
    console.debug(`[MiniMax] Endpoint: ${endpoint}`);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    console.debug(`[MiniMax] Response status: ${response.status}`);
    console.debug(`[MiniMax] Response body: ${responseText.substring(0, 300)}`);

    if (!response.ok) {
      console.error(`[MiniMax] API error [${response.status}]: ${responseText}`);
      throw new Error(`MiniMax API returned ${response.status}: ${responseText}`);
    }

    let data: unknown;
    try {
      data = JSON.parse(responseText);
    } catch {
      console.error("[MiniMax] Failed to parse response JSON:", responseText);
      throw new Error("Invalid JSON response from MiniMax");
    }

    // Extract text from response
    // MiniMax returns content[] with mixed types: thinking blocks + text blocks
    const parsed = data as {
      content?: Array<{ type?: string; text?: string; thinking?: string }>;
      choices?: Array<{ message?: { content?: string } }>;
      text?: string;
    };

    // Find the first text block (skip thinking blocks)
    const textBlock = parsed.content?.find((c) => c.type === "text");
    const text = textBlock?.text ||
                 parsed.choices?.[0]?.message?.content ||
                 parsed.text ||
                 "";

    if (!text) {
      console.warn("[MiniMax] Response has no text content:", JSON.stringify(data).substring(0, 200));
      throw new Error("MiniMax returned empty response");
    }

    console.debug(`[MiniMax] Response text length: ${text.length} chars`);
    return text;
  } catch (error) {
    console.error("[MiniMax] Generation failed:", error);
    throw error;
  }
}
