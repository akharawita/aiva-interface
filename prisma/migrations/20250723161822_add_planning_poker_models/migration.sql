-- CreateTable
CREATE TABLE "PlanningPokerSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ownerName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "completedAt" DATETIME
);

-- CreateTable
CREATE TABLE "PlanningPokerStory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "finalEstimate" TEXT,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "sessionId" TEXT NOT NULL,
    CONSTRAINT "PlanningPokerStory_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PlanningPokerSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlanningPokerParticipant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "joinedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sessionId" TEXT NOT NULL,
    CONSTRAINT "PlanningPokerParticipant_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PlanningPokerSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlanningPokerVote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "storyId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    CONSTRAINT "PlanningPokerVote_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "PlanningPokerStory" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlanningPokerVote_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "PlanningPokerParticipant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "PlanningPokerSession_sessionCode_key" ON "PlanningPokerSession"("sessionCode");

-- CreateIndex
CREATE INDEX "PlanningPokerSession_sessionCode_idx" ON "PlanningPokerSession"("sessionCode");

-- CreateIndex
CREATE INDEX "PlanningPokerSession_createdAt_idx" ON "PlanningPokerSession"("createdAt");

-- CreateIndex
CREATE INDEX "PlanningPokerStory_sessionId_idx" ON "PlanningPokerStory"("sessionId");

-- CreateIndex
CREATE INDEX "PlanningPokerParticipant_sessionId_idx" ON "PlanningPokerParticipant"("sessionId");

-- CreateIndex
CREATE INDEX "PlanningPokerVote_storyId_idx" ON "PlanningPokerVote"("storyId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanningPokerVote_storyId_participantId_key" ON "PlanningPokerVote"("storyId", "participantId");
