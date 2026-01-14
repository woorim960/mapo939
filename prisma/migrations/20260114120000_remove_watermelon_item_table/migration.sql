-- WatermelonItem 테이블 제거 (하드코딩된 아이템 목록으로 전환)

-- 1. 외래키 제약조건 제거
ALTER TABLE "watermelon_player_items" DROP CONSTRAINT IF EXISTS "watermelon_player_items_itemId_fkey";
ALTER TABLE "watermelon_item_purchases" DROP CONSTRAINT IF EXISTS "watermelon_item_purchases_itemId_fkey";
ALTER TABLE "watermelon_payments" DROP CONSTRAINT IF EXISTS "watermelon_payments_itemId_fkey";
ALTER TABLE "attendance_points_usage" DROP CONSTRAINT IF EXISTS "attendance_points_usage_itemId_fkey";

-- 2. WatermelonItem 테이블 삭제
DROP TABLE IF EXISTS "watermelon_items";
