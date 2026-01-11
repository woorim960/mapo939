-- CreateTable
CREATE TABLE "watermelon_players" (
    "id" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "watermelon_players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watermelon_scores" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "watermelon_scores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "watermelon_players_nickname_key" ON "watermelon_players"("nickname");

-- CreateIndex
CREATE INDEX "watermelon_scores_playerId_idx" ON "watermelon_scores"("playerId");

-- CreateIndex
CREATE INDEX "watermelon_scores_playerId_score_idx" ON "watermelon_scores"("playerId", "score");

-- CreateIndex
CREATE INDEX "watermelon_scores_score_idx" ON "watermelon_scores"("score");

-- CreateIndex
CREATE INDEX "watermelon_scores_createdAt_idx" ON "watermelon_scores"("createdAt");

-- AddForeignKey
ALTER TABLE "watermelon_scores" ADD CONSTRAINT "watermelon_scores_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "watermelon_players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
