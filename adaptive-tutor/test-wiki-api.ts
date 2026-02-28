/**
 * Direct test of Wikipedia API
 */

async function testWikiAPI() {
  const testQueries = [
    "Limits and Continuity",
    "Calculus",
    "Limits",
    "Applications of Derivatives"
  ];

  for (const query of testQueries) {
    console.log(`\n🔍 Testing: "${query}"`);
    try {
      const url = `https://en.wikipedia.org/w/rest.php/v1/search/page?q=${encodeURIComponent(query)}&limit=2`;
      console.log(`   URL: ${url}`);
      
      const res = await fetch(url, {
        headers: { "Api-User-Agent": "AdaptiveLearningTutor/1.0 (hackathon)" },
        signal: AbortSignal.timeout(5000),
      });
      
      console.log(`   Status: ${res.status}`);
      
      if (!res.ok) {
        console.log(`   ❌ NOT OK`);
        const text = await res.text();
        console.log(`   Response: ${text.substring(0, 100)}`);
        continue;
      }
      
      const data = await res.json();
      console.log(`   ✅ Results found: ${(data.pages || []).length}`);
      (data.pages || []).slice(0, 2).forEach((p: any, i: number) => {
        console.log(`      [${i + 1}] ${p.title}`);
      });
    } catch (err) {
      console.log(`   ❌ Error: ${err}`);
    }
  }
}

testWikiAPI().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
