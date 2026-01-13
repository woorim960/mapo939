-- DropForeignKey (IF EXISTS로 안전하게 처리)
ALTER TABLE "LiarPlayer" DROP CONSTRAINT IF EXISTS "LiarPlayer_gameId_fkey";

-- AddForeignKey (gameId 컬럼이 존재할 때만 실행)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'LiarPlayer' AND column_name = 'gameId'
    ) THEN
        -- 외래 키가 이미 존재하지 않을 때만 추가
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE table_name = 'LiarPlayer' 
            AND constraint_name = 'LiarPlayer_gameId_fkey'
        ) THEN
            ALTER TABLE "LiarPlayer" 
            ADD CONSTRAINT "LiarPlayer_gameId_fkey" 
            FOREIGN KEY ("gameId") REFERENCES "LiarGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
    END IF;
END $$;
