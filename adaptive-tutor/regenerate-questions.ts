/**
 * Regenerate questions for a study plan
 */

const STUDY_PLAN_ID = "cmm5pu7yz0000nmwhyj40np7a";
const USER_ID = "demo-user";

async function regenerate() {
  try {
    console.log(`🔄 Regenerating questions for study plan: ${STUDY_PLAN_ID}`);
    
    const res = await fetch(`http://localhost:3000/api/study-plans/${STUDY_PLAN_ID}/generate-questions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": USER_ID,
      },
      body: JSON.stringify({ userId: USER_ID }),
    });

    if (!res.ok) {
      console.log(`❌ Error: ${res.status}`);
      console.log(await res.text());
      process.exit(1);
    }

    const result = await res.json();
    console.log(`\n✅ Result:`);
    console.log(`   Questions generated: ${result.questionCount}`);
    console.log(`   Concepts covered: ${result.conceptsCovered.length}`);
    if (result.conceptsThatFailed?.length > 0) {
      console.log(`   Failed concepts: ${result.conceptsThatFailed.length}`);
    }
    console.log(`   Message: ${result.message}`);
  } catch (err) {
    console.error(`❌ Error:`, err);
    process.exit(1);
  }

  process.exit(0);
}

regenerate();
