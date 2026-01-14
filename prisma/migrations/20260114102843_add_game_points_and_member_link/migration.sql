-- AlterTable
ALTER TABLE "watermelon_players" ADD COLUMN IF NOT EXISTS "gamePoints" INTEGER NOT NULL DEFAULT 1000;

-- AlterTable
ALTER TABLE "watermelon_players" ADD COLUMN IF NOT EXISTS "memberId" TEXT;

-- 기존 플레이어들에게 기본 포인트 지급
UPDATE "watermelon_players" SET "gamePoints" = 1000 WHERE "gamePoints" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "watermelon_players_memberId_key" ON "watermelon_players"("memberId");

-- AddForeignKey
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'watermelon_players_memberId_fkey'
  ) THEN
    ALTER TABLE "watermelon_players" ADD CONSTRAINT "watermelon_players_memberId_fkey" 
    FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
