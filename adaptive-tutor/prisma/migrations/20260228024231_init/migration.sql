-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'demo-user',
    "displayName" TEXT NOT NULL DEFAULT 'Learner',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "learnerProfile" TEXT NOT NULL DEFAULT '{}'
);

-- CreateTable
CREATE TABLE "StudyPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "sourceText" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'active',
    "targetDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StudyPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Concept" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameNormalized" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "keyTermsJson" TEXT NOT NULL DEFAULT '[]',
    "proficiency" REAL NOT NULL DEFAULT 0.0,
    "confidence" REAL NOT NULL DEFAULT 0.0,
    "easeFactor" REAL NOT NULL DEFAULT 2.5,
    "interval" INTEGER NOT NULL DEFAULT 1,
    "repetitionCount" INTEGER NOT NULL DEFAULT 0,
    "lastPracticed" DATETIME,
    "nextDue" DATETIME,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "isDeprecated" BOOLEAN NOT NULL DEFAULT false,
    "isManuallyAdjusted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Concept_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "UnitGraph" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studyPlanId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UnitGraph_studyPlanId_fkey" FOREIGN KEY ("studyPlanId") REFERENCES "StudyPlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GraphMembership" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conceptId" TEXT NOT NULL,
    "unitGraphId" TEXT NOT NULL,
    "positionX" REAL NOT NULL DEFAULT 0,
    "positionY" REAL NOT NULL DEFAULT 0,
    "depthTier" INTEGER NOT NULL DEFAULT 0,
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "addedBy" TEXT NOT NULL DEFAULT 'system',
    CONSTRAINT "GraphMembership_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "Concept" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GraphMembership_unitGraphId_fkey" FOREIGN KEY ("unitGraphId") REFERENCES "UnitGraph" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GraphLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fromGraphId" TEXT NOT NULL,
    "toGraphId" TEXT NOT NULL,
    "linkType" TEXT NOT NULL DEFAULT 'expansion',
    "sharedContext" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'proposed',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GraphLink_fromGraphId_fkey" FOREIGN KEY ("fromGraphId") REFERENCES "UnitGraph" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GraphLink_toGraphId_fkey" FOREIGN KEY ("toGraphId") REFERENCES "UnitGraph" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ConceptNode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studyPlanId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "keyTermsJson" TEXT NOT NULL DEFAULT '[]',
    "difficultyTier" INTEGER NOT NULL DEFAULT 1,
    "proficiency" REAL NOT NULL DEFAULT 0.0,
    "confidence" REAL NOT NULL DEFAULT 0.0,
    "easeFactor" REAL NOT NULL DEFAULT 2.5,
    "interval" INTEGER NOT NULL DEFAULT 1,
    "repetitionCount" INTEGER NOT NULL DEFAULT 0,
    "lastPracticed" DATETIME,
    "nextDue" DATETIME,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "isDeprecated" BOOLEAN NOT NULL DEFAULT false,
    "isManuallyAdjusted" BOOLEAN NOT NULL DEFAULT false,
    "positionX" REAL NOT NULL DEFAULT 0,
    "positionY" REAL NOT NULL DEFAULT 0,
    CONSTRAINT "ConceptNode_studyPlanId_fkey" FOREIGN KEY ("studyPlanId") REFERENCES "StudyPlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ConceptEdge" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fromNodeId" TEXT NOT NULL,
    "toNodeId" TEXT NOT NULL,
    "unitGraphId" TEXT,
    "studyPlanId" TEXT,
    "edgeType" TEXT NOT NULL DEFAULT 'prerequisite',
    CONSTRAINT "ConceptEdge_fromNodeId_fkey" FOREIGN KEY ("fromNodeId") REFERENCES "Concept" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ConceptEdge_toNodeId_fkey" FOREIGN KEY ("toNodeId") REFERENCES "Concept" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ConceptEdge_unitGraphId_fkey" FOREIGN KEY ("unitGraphId") REFERENCES "UnitGraph" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ConceptEdge_studyPlanId_fkey" FOREIGN KEY ("studyPlanId") REFERENCES "StudyPlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GapDetection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "conceptId" TEXT NOT NULL,
    "missingConcept" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'detected',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conceptId" TEXT,
    "conceptNodeId" TEXT,
    "studyPlanId" TEXT,
    "questionType" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "correctAnswer" TEXT NOT NULL,
    "distractorsJson" TEXT NOT NULL DEFAULT '[]',
    "explanation" TEXT NOT NULL DEFAULT '',
    "difficulty" REAL NOT NULL DEFAULT 0.5,
    "sourcesJson" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Question_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "Concept" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Question_conceptNodeId_fkey" FOREIGN KEY ("conceptNodeId") REFERENCES "ConceptNode" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Question_studyPlanId_fkey" FOREIGN KEY ("studyPlanId") REFERENCES "StudyPlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AttemptRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "questionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userAnswer" TEXT NOT NULL DEFAULT '',
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "score" REAL NOT NULL DEFAULT 0.0,
    "feedback" TEXT NOT NULL DEFAULT '',
    "misconceptionsJson" TEXT NOT NULL DEFAULT '[]',
    "timeTaken" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionId" TEXT,
    CONSTRAINT "AttemptRecord_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AttemptRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AttemptRecord_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SessionRecord" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SessionRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "unitGraphId" TEXT,
    "studyPlanId" TEXT,
    "sessionType" TEXT NOT NULL DEFAULT 'practice',
    "startTime" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" DATETIME,
    "questionsAttempted" INTEGER NOT NULL DEFAULT 0,
    "questionsCorrect" INTEGER NOT NULL DEFAULT 0,
    "conceptsCoveredJson" TEXT NOT NULL DEFAULT '[]',
    CONSTRAINT "SessionRecord_unitGraphId_fkey" FOREIGN KEY ("unitGraphId") REFERENCES "UnitGraph" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SessionRecord_studyPlanId_fkey" FOREIGN KEY ("studyPlanId") REFERENCES "StudyPlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChatThread" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "studyPlanId" TEXT,
    "title" TEXT NOT NULL DEFAULT 'New Chat',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ChatThread_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ChatThread_studyPlanId_fkey" FOREIGN KEY ("studyPlanId") REFERENCES "StudyPlan" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "threadId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "toolCallsJson" TEXT NOT NULL DEFAULT '[]',
    "toolResultsJson" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChatMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "ChatThread" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SourceChunk" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conceptId" TEXT NOT NULL,
    "studyPlanId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "pageTitle" TEXT NOT NULL,
    "pageUrl" TEXT NOT NULL,
    "sectionHeading" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Concept_userId_nameNormalized_key" ON "Concept"("userId", "nameNormalized");

-- CreateIndex
CREATE INDEX "UnitGraph_studyPlanId_idx" ON "UnitGraph"("studyPlanId");

-- CreateIndex
CREATE INDEX "GraphMembership_unitGraphId_idx" ON "GraphMembership"("unitGraphId");

-- CreateIndex
CREATE UNIQUE INDEX "GraphMembership_conceptId_unitGraphId_key" ON "GraphMembership"("conceptId", "unitGraphId");

-- CreateIndex
CREATE UNIQUE INDEX "GraphLink_fromGraphId_toGraphId_key" ON "GraphLink"("fromGraphId", "toGraphId");

-- CreateIndex
CREATE INDEX "ConceptEdge_unitGraphId_idx" ON "ConceptEdge"("unitGraphId");

-- CreateIndex
CREATE UNIQUE INDEX "ConceptEdge_fromNodeId_toNodeId_unitGraphId_key" ON "ConceptEdge"("fromNodeId", "toNodeId", "unitGraphId");

-- CreateIndex
CREATE INDEX "GapDetection_userId_idx" ON "GapDetection"("userId");

-- CreateIndex
CREATE INDEX "GapDetection_userId_conceptId_idx" ON "GapDetection"("userId", "conceptId");

-- CreateIndex
CREATE INDEX "GapDetection_userId_missingConcept_idx" ON "GapDetection"("userId", "missingConcept");

-- CreateIndex
CREATE INDEX "Question_conceptId_idx" ON "Question"("conceptId");

-- CreateIndex
CREATE INDEX "Question_conceptNodeId_idx" ON "Question"("conceptNodeId");

-- CreateIndex
CREATE INDEX "Question_studyPlanId_idx" ON "Question"("studyPlanId");

-- CreateIndex
CREATE INDEX "SessionRecord_unitGraphId_idx" ON "SessionRecord"("unitGraphId");

-- CreateIndex
CREATE INDEX "SessionRecord_studyPlanId_idx" ON "SessionRecord"("studyPlanId");

-- CreateIndex
CREATE INDEX "SourceChunk_conceptId_idx" ON "SourceChunk"("conceptId");

-- CreateIndex
CREATE INDEX "SourceChunk_studyPlanId_idx" ON "SourceChunk"("studyPlanId");
