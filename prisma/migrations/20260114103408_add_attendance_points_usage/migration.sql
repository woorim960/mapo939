-- AlterTable: WatermelonItemPurchase에 pointType, pointsUsed 추가
ALTER TABLE "watermelon_item_purchases" ADD COLUMN IF NOT EXISTS "pointType" TEXT;
ALTER TABLE "watermelon_item_purchases" ADD COLUMN IF NOT EXISTS "pointsUsed" INTEGER;

-- CreateTable: AttendancePointsUsage
CREATE TABLE IF NOT EXISTS "attendance_points_usage" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "pointsUsed" INTEGER NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_points_usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "attendance_points_usage_purchaseId_key" ON "attendance_points_usage"("purchaseId");
CREATE INDEX IF NOT EXISTS "attendance_points_usage_memberId_idx" ON "attendance_points_usage"("memberId");
CREATE INDEX IF NOT EXISTS "attendance_points_usage_playerId_idx" ON "attendance_points_usage"("playerId");
CREATE INDEX IF NOT EXISTS "attendance_points_usage_purchaseId_idx" ON "attendance_points_usage"("purchaseId");

-- AddForeignKey
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'attendance_points_usage_memberId_fkey'
  ) THEN
    ALTER TABLE "attendance_points_usage" ADD CONSTRAINT "attendance_points_usage_memberId_fkey" 
    FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'attendance_points_usage_playerId_fkey'
  ) THEN
    ALTER TABLE "attendance_points_usage" ADD CONSTRAINT "attendance_points_usage_playerId_fkey" 
    FOREIGN KEY ("playerId") REFERENCES "watermelon_players"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'attendance_points_usage_itemId_fkey'
  ) THEN
    ALTER TABLE "attendance_points_usage" ADD CONSTRAINT "attendance_points_usage_itemId_fkey" 
    FOREIGN KEY ("itemId") REFERENCES "watermelon_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'attendance_points_usage_purchaseId_fkey'
  ) THEN
    ALTER TABLE "attendance_points_usage" ADD CONSTRAINT "attendance_points_usage_purchaseId_fkey" 
    FOREIGN KEY ("purchaseId") REFERENCES "watermelon_item_purchases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
