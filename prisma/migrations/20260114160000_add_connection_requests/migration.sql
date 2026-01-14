-- CreateTable
CREATE TABLE "watermelon_connection_requests" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "adminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "watermelon_connection_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "watermelon_connection_requests_playerId_memberId_status_key" ON "watermelon_connection_requests"("playerId", "memberId", "status");

-- CreateIndex
CREATE INDEX "watermelon_connection_requests_status_idx" ON "watermelon_connection_requests"("status");

-- CreateIndex
CREATE INDEX "watermelon_connection_requests_playerId_idx" ON "watermelon_connection_requests"("playerId");

-- CreateIndex
CREATE INDEX "watermelon_connection_requests_memberId_idx" ON "watermelon_connection_requests"("memberId");

-- CreateIndex
CREATE INDEX "watermelon_connection_requests_createdAt_idx" ON "watermelon_connection_requests"("createdAt");

-- AddForeignKey
ALTER TABLE "watermelon_connection_requests" ADD CONSTRAINT "watermelon_connection_requests_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "watermelon_players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watermelon_connection_requests" ADD CONSTRAINT "watermelon_connection_requests_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watermelon_connection_requests" ADD CONSTRAINT "watermelon_connection_requests_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
