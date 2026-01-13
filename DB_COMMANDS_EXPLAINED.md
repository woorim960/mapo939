# 데이터베이스 명령어 차이 설명

## 📋 핵심 차이

### `npm run db:migrate` - 테이블 **구조** 생성
- **목적**: DB 스키마(테이블 구조) 생성/변경
- **대상**: 테이블, 컬럼, 인덱스, 제약조건 등
- **데이터**: ❌ 데이터를 복사하지 않음 (빈 테이블만 생성)

### `npm run db:copy` - 테이블 **데이터** 복사
- **목적**: 기존 DB의 실제 데이터(행)를 새 DB로 복사
- **대상**: 테이블 안의 실제 데이터
- **구조**: ❌ 테이블 구조를 생성하지 않음 (이미 있어야 함)

---

## 🔄 실행 순서

새 개발 DB를 만들 때는 **반드시 다음 순서로 실행**해야 합니다:

```bash
# 1단계: 테이블 구조 생성 (스키마)
npm run db:migrate
# → 빈 테이블들이 생성됨 (데이터 없음)

# 2단계: 기존 DB 데이터 복사 (데이터)
npm run db:copy
# → 기존 DB의 데이터가 새 DB로 복사됨
```

---

## 📊 상세 비교

### `npm run db:migrate`

**실행 명령어**:
```bash
npx prisma migrate deploy
```

**하는 일**:
1. `prisma/migrations/` 폴더의 마이그레이션 파일들을 읽음
2. 각 마이그레이션 파일을 순서대로 실행
3. DB에 테이블 구조를 생성/변경
   - 테이블 생성
   - 컬럼 추가/삭제
   - 인덱스 생성
   - 외래 키 설정
   - 제약조건 추가

**예시**:
```sql
-- 마이그레이션 파일이 실행되면:
CREATE TABLE "members" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "birthDate" TIMESTAMP NOT NULL,
  ...
);
-- 테이블은 생성되지만 데이터는 없음
```

**결과**:
- ✅ 테이블 구조는 있음
- ❌ 데이터는 없음 (빈 테이블)

**언제 사용**:
- 새 DB를 만들었을 때
- 스키마 변경사항을 운영 DB에 적용할 때
- Vercel 배포 시 (자동 실행)

---

### `npm run db:copy`

**실행 명령어**:
```bash
tsx scripts/copy-db-data.ts
```

**하는 일**:
1. `.env.local`에서 DB URL 읽기
   - `SOURCE_DATABASE_URL`: 기존 DB (데이터를 가져올 DB)
   - `TARGET_DATABASE_URL`: 새 DB (데이터를 복사할 DB)
2. 각 테이블의 데이터를 읽어서 새 DB에 복사
   - Admin, AdminSession
   - Member, Attendance, BonusPoints
   - LiarGame, LiarPlayer
   - WatermelonPlayer, WatermelonScore
   - WatermelonItem, WatermelonPlayerItem
   - WatermelonPayment, WatermelonItemPurchase
   - 등 모든 테이블의 데이터

**예시**:
```typescript
// 기존 DB에서 데이터 읽기
const members = await sourcePrisma.member.findMany();
// [ { id: "1", name: "홍길동", ... }, { id: "2", name: "김철수", ... } ]

// 새 DB에 데이터 복사
await targetPrisma.member.createMany({
  data: members,
  skipDuplicates: true,
});
// 새 DB의 members 테이블에 데이터가 복사됨
```

**결과**:
- ✅ 데이터가 복사됨
- ❌ 테이블 구조를 생성하지 않음 (이미 있어야 함)

**언제 사용**:
- 개발 DB에 실제 운영 데이터를 복사하고 싶을 때
- 테스트 데이터를 준비하고 싶을 때
- DB를 복제하고 싶을 때

**필수 조건**:
- **먼저 `npm run db:migrate`를 실행**해서 테이블 구조가 있어야 함

---

## 🎯 실제 사용 예시

### 시나리오: 새 개발 DB 만들기

#### 1단계: 개발 DB 생성
Neon에서 새 프로젝트 생성 → 연결 문자열 복사

#### 2단계: 테이블 구조 생성
```bash
# .env.local에 개발 DB URL 설정
DATABASE_URL="개발_DB_URL"

# 마이그레이션 실행 (테이블 구조 생성)
npm run db:migrate
```

**결과**:
```
✅ members 테이블 생성 (빈 테이블)
✅ attendance 테이블 생성 (빈 테이블)
✅ watermelon_players 테이블 생성 (빈 테이블)
... (모든 테이블 생성, 데이터 없음)
```

#### 3단계: 데이터 복사 (선택사항)
```bash
# .env.local에 추가
SOURCE_DATABASE_URL="기존_운영_DB_URL"
TARGET_DATABASE_URL="새_개발_DB_URL"

# 데이터 복사
npm run db:copy
```

**결과**:
```
✅ Admin: 2개 복사 완료
✅ Member: 50개 복사 완료
✅ Attendance: 500개 복사 완료
... (모든 데이터 복사 완료)
```

---

## 📊 비교표

| 구분 | `db:migrate` | `db:copy` |
|------|-------------|-----------|
| **목적** | 테이블 구조 생성 | 데이터 복사 |
| **대상** | 스키마 (테이블, 컬럼) | 데이터 (행) |
| **필요한 파일** | `prisma/migrations/*.sql` | `.env.local` (SOURCE/TARGET) |
| **실행 시간** | 빠름 (몇 초) | 느림 (데이터 양에 따라) |
| **필수 선행 작업** | 없음 | `db:migrate` 먼저 실행 |
| **결과** | 빈 테이블 | 데이터가 채워진 테이블 |

---

## ⚠️ 주의사항

### 1. 실행 순서
```bash
# ❌ 잘못된 순서
npm run db:copy  # 테이블이 없으면 에러 발생!

# ✅ 올바른 순서
npm run db:migrate  # 1. 테이블 구조 생성
npm run db:copy     # 2. 데이터 복사
```

### 2. 데이터 복사 시 주의
- **중복 데이터 방지**: 스크립트는 `skipDuplicates: true` 옵션 사용
- **외래 키 관계**: 테이블 간 관계를 고려하여 순서대로 복사
- **대용량 데이터**: 데이터가 많으면 시간이 오래 걸릴 수 있음

### 3. 운영 DB 보호
- **`db:copy` 실행 전 확인**: SOURCE_DATABASE_URL이 올바른지 확인
- **운영 DB에 실수로 복사하지 않도록 주의**

---

## 🔍 명령어 상세

### `npm run db:migrate`

**실제 실행**:
```bash
npx prisma migrate deploy
```

**작업 내용**:
1. Prisma 설정 파일(`prisma.config.ts`) 읽기
2. 마이그레이션 파일들(`prisma/migrations/`) 확인
3. DB에 적용되지 않은 마이그레이션만 실행
4. 마이그레이션 이력 기록

**결과**:
- DB 스키마가 최신 상태로 업데이트됨
- 데이터는 변경되지 않음

---

### `npm run db:copy`

**실제 실행**:
```bash
tsx scripts/copy-db-data.ts
```

**작업 내용**:
1. 환경 변수에서 DB URL 읽기
2. 소스 DB에서 모든 테이블 데이터 읽기
3. 타겟 DB에 데이터 복사 (중복 건너뜀)
4. 진행 상황 출력

**결과**:
- 타겟 DB에 데이터가 복사됨
- 테이블 구조는 변경되지 않음 (이미 있어야 함)

---

## 📚 요약

1. **`db:migrate`**: 테이블 구조 생성 (빈 테이블)
2. **`db:copy`**: 데이터 복사 (테이블 안의 내용)

**새 DB를 만들 때**:
```bash
npm run db:migrate  # 1. 구조 만들기
npm run db:copy     # 2. 데이터 복사 (선택사항)
```

**데이터 없이 새 DB만 필요한 경우**:
```bash
npm run db:migrate  # 이것만 실행
```

**기존 데이터를 복사하고 싶은 경우**:
```bash
npm run db:migrate  # 먼저 실행 필수
npm run db:copy     # 그 다음 실행
```

이제 두 명령어의 차이를 이해하셨나요? 🎉
