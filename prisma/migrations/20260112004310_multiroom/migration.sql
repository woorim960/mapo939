-- 멀티룸 시스템 마이그레이션

-- 1. LiarPlayer에 gameId 컬럼 추가 (임시로 nullable)
ALTER TABLE "LiarPlayer" ADD COLUMN IF NOT EXISTS "gameId" TEXT;

-- 2. 기존 데이터 마이그레이션
-- 기존 LiarGame의 id: 1이 있으면 UUID로 변환하고 플레이어들에게 할당
DO $$
DECLARE
    old_game_id INTEGER := 1;
    new_game_id TEXT;
    game_exists BOOLEAN;
BEGIN
    -- 기존 게임 존재 확인
    SELECT EXISTS(SELECT 1 FROM "LiarGame" WHERE "id" = old_game_id) INTO game_exists;
    
    IF game_exists THEN
        -- UUID 생성
        new_game_id := gen_random_uuid()::TEXT;
        
        -- 기존 플레이어들에게 gameId 할당
        UPDATE "LiarPlayer" SET "gameId" = new_game_id WHERE "gameId" IS NULL;
        
        -- LiarGame의 id를 TEXT로 변경하기 전에 임시 컬럼 사용
        -- 1) 임시 컬럼 생성
        ALTER TABLE "LiarGame" ADD COLUMN IF NOT EXISTS "id_new" TEXT;
        
        -- 2) 기존 id를 새 UUID로 변환하여 임시 컬럼에 저장
        UPDATE "LiarGame" SET "id_new" = new_game_id WHERE "id" = old_game_id;
        
        -- 3) 기존 id 컬럼 삭제
        ALTER TABLE "LiarGame" DROP CONSTRAINT IF EXISTS "LiarGame_pkey";
        ALTER TABLE "LiarGame" DROP COLUMN IF EXISTS "id";
        
        -- 4) 임시 컬럼을 id로 변경
        ALTER TABLE "LiarGame" RENAME COLUMN "id_new" TO "id";
        ALTER TABLE "LiarGame" ADD PRIMARY KEY ("id");
    END IF;
END $$;

-- 3. LiarGame 테이블 수정 (기존 게임이 없는 경우)
-- id가 INTEGER인 경우 TEXT로 변경
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'LiarGame' AND column_name = 'id' AND data_type = 'integer'
    ) THEN
        -- 임시 컬럼 생성
        ALTER TABLE "LiarGame" ADD COLUMN IF NOT EXISTS "id_new" TEXT;
        
        -- 기존 id를 TEXT로 변환
        UPDATE "LiarGame" SET "id_new" = gen_random_uuid()::TEXT;
        
        -- 기존 id 컬럼 삭제
        ALTER TABLE "LiarGame" DROP CONSTRAINT IF EXISTS "LiarGame_pkey";
        ALTER TABLE "LiarGame" DROP COLUMN IF EXISTS "id";
        
        -- 임시 컬럼을 id로 변경
        ALTER TABLE "LiarGame" RENAME COLUMN "id_new" TO "id";
        ALTER TABLE "LiarGame" ADD PRIMARY KEY ("id");
    END IF;
END $$;

-- name 컬럼 추가
ALTER TABLE "LiarGame" ADD COLUMN IF NOT EXISTS "name" TEXT;

-- createdAt 컬럼 추가
ALTER TABLE "LiarGame" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- 기존 데이터에 createdAt 설정
UPDATE "LiarGame" SET "createdAt" = COALESCE("createdAt", "updatedAt", CURRENT_TIMESTAMP);

-- 4. LiarPlayer 테이블 수정
-- 기존 unique 제약 조건 제거
DROP INDEX IF EXISTS "LiarPlayer_nickname_key";

-- gameId를 NOT NULL로 설정 (기존 데이터는 위에서 이미 설정됨)
ALTER TABLE "LiarPlayer" ALTER COLUMN "gameId" SET NOT NULL;

-- 외래 키 추가
ALTER TABLE "LiarPlayer" 
    ADD CONSTRAINT "LiarPlayer_gameId_fkey" 
    FOREIGN KEY ("gameId") REFERENCES "LiarGame"("id") ON DELETE CASCADE;

-- 복합 unique 제약 조건 추가 (방별 닉네임 중복 방지)
CREATE UNIQUE INDEX IF NOT EXISTS "LiarPlayer_gameId_nickname_key" 
    ON "LiarPlayer"("gameId", "nickname");

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS "LiarPlayer_gameId_idx" ON "LiarPlayer"("gameId");
CREATE INDEX IF NOT EXISTS "LiarPlayer_gameId_score_idx" ON "LiarPlayer"("gameId", "score");

-- 5. LiarGame 인덱스 추가
CREATE INDEX IF NOT EXISTS "LiarGame_createdAt_idx" ON "LiarGame"("createdAt");
CREATE INDEX IF NOT EXISTS "LiarGame_updatedAt_idx" ON "LiarGame"("updatedAt");
