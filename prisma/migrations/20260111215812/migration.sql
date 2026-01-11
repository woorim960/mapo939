-- DropForeignKey
ALTER TABLE "LiarPlayer" DROP CONSTRAINT "LiarPlayer_gameId_fkey";

-- AddForeignKey
ALTER TABLE "LiarPlayer" ADD CONSTRAINT "LiarPlayer_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "LiarGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;
