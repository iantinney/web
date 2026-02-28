#!/usr/bin/env node

/**
 * Test script to enumerate which model names work with MiniMax API
 * Tests: M2.5, M2.5-highspeed, M2.1, M2.1-highspeed, M2, lowercase variants, short form
 */

const apiKey = process.env.ANTHROPIC_API_KEY || process.env.MINIMAX_API_KEY || "";
const baseURL = process.env.ANTHROPIC_BASE_URL || "https://api.minimax.io/anthropic";

const MODELS_TO_TEST = [
  "MiniMax-M2.5",
  "MiniMax-M2.5-highspeed",
  "MiniMax-M2.1",
  "MiniMax-M2.1-highspeed",
  "MiniMax-M2",
  "minimax-m2.5",      // lowercase
  "m2.5",              // short form
];

if (!apiKey) {
  console.error("❌ Error: ANTHROPIC_API_KEY or MINIMAX_API_KEY is not set");
  process.exit(1);
}

async function testModel(modelName) {
  const endpoint = `${baseURL}/v1/messages`;
  const payload = {
    model: modelName,
    system: "You are a helpful assistant. Respond briefly.",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Say 'Model works!' if you receive this.",
          },
        ],
      },
    ],
    temperature: 0.5,
    max_tokens: 100,
  };

  console.log(`\n▶ Testing: ${modelName}`);
  console.log(`  Endpoint: ${endpoint}`);

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

    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    console.log(`  Status: ${response.status}`);

    if (!response.ok) {
      console.log(`  ❌ FAILED`);
      if (responseData.error) {
        console.log(`     Error: ${responseData.error.message || responseData.error}`);
        if (responseData.error.code) {
          console.log(`     Code: ${responseData.error.code}`);
        }
      } else if (responseData.raw) {
        console.log(`     Response: ${responseData.raw.substring(0, 150)}`);
      }
      return { model: modelName, success: false, status: response.status, error: responseData.error };
    }

    // Try to extract text from response
    // MiniMax returns content[] with mixed types: thinking blocks + text blocks
    const textBlock = responseData.content?.find((c) => c.type === "text");
    const text = textBlock?.text ||
                 responseData.choices?.[0]?.message?.content ||
                 responseData.text ||
                 "(no text in response)";

    console.log(`  ✅ SUCCESS`);
    console.log(`     Response: "${text.substring(0, 100)}${text.length > 100 ? "..." : ""}"`);
    return { model: modelName, success: true, status: response.status, text };
  } catch (error) {
    console.log(`  ❌ ERROR: ${error.message}`);
    return { model: modelName, success: false, error: error.message };
  }
}

async function main() {
  console.log(`🧪 MiniMax Model Enumeration Test`);
  console.log(`==================================`);
  console.log(`API Key: ${apiKey.substring(0, 10)}...`);
  console.log(`Base URL: ${baseURL}`);
  console.log(`Testing ${MODELS_TO_TEST.length} models...\n`);

  const results = [];
  for (const modelName of MODELS_TO_TEST) {
    const result = await testModel(modelName);
    results.push(result);
    // Small delay between requests
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log(`\n\n📊 Summary`);
  console.log(`==================================`);
  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  console.log(`✅ Working models (${successful.length}):`);
  if (successful.length === 0) {
    console.log(`   None`);
  } else {
    successful.forEach((r) => {
      console.log(`   • ${r.model}`);
    });
  }

  console.log(`\n❌ Failed models (${failed.length}):`);
  if (failed.length === 0) {
    console.log(`   None`);
  } else {
    failed.forEach((r) => {
      console.log(`   • ${r.model}`);
      if (r.error && typeof r.error === "object" && r.error.message) {
        console.log(`     └─ ${r.error.message}`);
      } else if (r.error && typeof r.error === "string") {
        console.log(`     └─ ${r.error}`);
      } else if (r.status) {
        console.log(`     └─ HTTP ${r.status}`);
      }
    });
  }

  console.log(`\n📋 Recommendation:`);
  if (successful.length > 0) {
    const firstWorking = successful[0].model;
    console.log(`   Use: "${firstWorking}"`);
    console.log(`   Update MINIMAX_MODEL env var to this value`);
  } else {
    console.log(`   ⚠️  No models work. Check:`);
    console.log(`       1. API key validity`);
    console.log(`       2. Code plan subscription status`);
    console.log(`       3. MiniMax platform settings`);
  }
}

main().catch(console.error);
