-- CreateTable
CREATE TABLE "bonus_points" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bonus_points_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bonus_points_memberId_idx" ON "bonus_points"("memberId");

-- CreateIndex
CREATE INDEX "bonus_points_memberId_createdAt_idx" ON "bonus_points"("memberId", "createdAt");

-- AddForeignKey
ALTER TABLE "bonus_points" ADD CONSTRAINT "bonus_points_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
