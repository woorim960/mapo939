-- DropForeignKey
ALTER TABLE "LiarPlayer" DROP CONSTRAINT "LiarPlayer_gameId_fkey";

-- AlterTable
ALTER TABLE "watermelon_players" ADD COLUMN     "passwordHash" TEXT;

-- AlterTable
ALTER TABLE "watermelon_scores" ADD COLUMN     "maxTier" INTEGER;

-- CreateTable
CREATE TABLE "watermelon_items" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" INTEGER NOT NULL,
    "effectType" TEXT NOT NULL,
    "effectValue" JSONB,
    "icon" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "watermelon_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watermelon_player_items" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "watermelon_player_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watermelon_payments" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "itemId" TEXT,
    "amount" INTEGER NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "paymentKey" TEXT,
    "orderId" TEXT,
    "status" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "watermelon_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watermelon_item_purchases" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "paymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "watermelon_item_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "watermelon_items_isActive_sortOrder_idx" ON "watermelon_items"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "watermelon_player_items_playerId_idx" ON "watermelon_player_items"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "watermelon_player_items_playerId_itemId_key" ON "watermelon_player_items"("playerId", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "watermelon_payments_orderId_key" ON "watermelon_payments"("orderId");

-- CreateIndex
CREATE INDEX "watermelon_payments_playerId_idx" ON "watermelon_payments"("playerId");

-- CreateIndex
CREATE INDEX "watermelon_payments_paymentKey_idx" ON "watermelon_payments"("paymentKey");

-- CreateIndex
CREATE INDEX "watermelon_payments_status_idx" ON "watermelon_payments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "watermelon_item_purchases_paymentId_key" ON "watermelon_item_purchases"("paymentId");

-- CreateIndex
CREATE INDEX "watermelon_item_purchases_playerId_idx" ON "watermelon_item_purchases"("playerId");

-- CreateIndex
CREATE INDEX "watermelon_item_purchases_itemId_idx" ON "watermelon_item_purchases"("itemId");

-- CreateIndex
CREATE INDEX "watermelon_item_purchases_paymentId_idx" ON "watermelon_item_purchases"("paymentId");

-- AddForeignKey
ALTER TABLE "LiarPlayer" ADD CONSTRAINT "LiarPlayer_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "LiarGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watermelon_player_items" ADD CONSTRAINT "watermelon_player_items_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "watermelon_players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watermelon_player_items" ADD CONSTRAINT "watermelon_player_items_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "watermelon_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watermelon_payments" ADD CONSTRAINT "watermelon_payments_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "watermelon_players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watermelon_payments" ADD CONSTRAINT "watermelon_payments_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "watermelon_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watermelon_item_purchases" ADD CONSTRAINT "watermelon_item_purchases_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "watermelon_players"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watermelon_item_purchases" ADD CONSTRAINT "watermelon_item_purchases_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "watermelon_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watermelon_item_purchases" ADD CONSTRAINT "watermelon_item_purchases_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "watermelon_payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
