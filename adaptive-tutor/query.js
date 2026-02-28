const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== ALL USERS ===");
  const users = await prisma.user.findMany();
  console.log(JSON.stringify(users, null, 2));
  
  console.log("\n=== QUESTIONS WITH WIKIPEDIA LINKS ===");
  const questions = await prisma.question.findMany({
    include: {
      concept: true,
      attempts: {
        include: { user: true }
      }
    }
  });
  
  const wikiQuestions = questions.filter(q => {
    try {
      const sources = JSON.parse(q.sourcesJson || '[]');
      return sources.some(s => s && (s.includes('wikipedia') || s.includes('wiki')));
    } catch (e) {
      return false;
    }
  });
  
  console.log(`Found ${wikiQuestions.length} questions with Wikipedia links\n`);
  
  const userSet = new Set();
  wikiQuestions.forEach(q => {
    q.attempts?.forEach(attempt => {
      userSet.add(attempt.userId);
    });
  });
  
  console.log("Users with Wikipedia-linked questions:");
  Array.from(userSet).forEach(userId => {
    const userAttempts = wikiQuestions.filter(q => q.attempts?.some(a => a.userId === userId));
    console.log(`\n  User ID: ${userId}`);
    console.log(`  Questions attempted: ${userAttempts.length}`);
    userAttempts.slice(0, 3).forEach(q => {
      const sources = JSON.parse(q.sourcesJson || '[]');
      const wikiSources = sources.filter(s => s && (s.includes('wikipedia') || s.includes('wiki')));
      console.log(`    - "${q.questionText.substring(0, 60)}..." [${wikiSources[0]}]`);
    });
  });
  
  await prisma.$disconnect();
}

main().catch(console.error);
