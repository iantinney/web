#!/usr/bin/env node

/**
 * Debug: Check actual response format from MiniMax API
 */

const apiKey = process.env.ANTHROPIC_API_KEY || process.env.MINIMAX_API_KEY || "";
const baseURL = process.env.ANTHROPIC_BASE_URL || "https://api.minimax.io/anthropic";

async function testResponse() {
  const endpoint = `${baseURL}/v1/messages`;
  const payload = {
    model: "MiniMax-M2.5",
    system: "You are a helpful assistant.",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Respond with exactly: Hello",
          },
        ],
      },
    ],
    temperature: 0.1,
    max_tokens: 50,
  };

  console.log("📤 Request payload:");
  console.log(JSON.stringify(payload, null, 2));

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(payload),
    });

    console.log(`\n📥 Response Status: ${response.status}`);
    const responseText = await response.text();

    console.log("\n📥 Raw Response:");
    console.log(responseText);

    if (response.ok) {
      const data = JSON.parse(responseText);
      console.log("\n📋 Parsed Response (pretty-printed):");
      console.log(JSON.stringify(data, null, 2));

      console.log("\n🔍 Structure Analysis:");
      console.log(`- Has 'content' field: ${!!data.content}`);
      console.log(`- Has 'choices' field: ${!!data.choices}`);
      console.log(`- Has 'message' field: ${!!data.message}`);
      console.log(`- Keys at root: ${Object.keys(data).join(", ")}`);

      if (data.content) {
        console.log(`\n- content is array: ${Array.isArray(data.content)}`);
        if (Array.isArray(data.content)) {
          console.log(`- content[0]: ${JSON.stringify(data.content[0])}`);
        }
      }
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

testResponse();
