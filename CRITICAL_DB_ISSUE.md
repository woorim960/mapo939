# ⚠️ 심각한 문제: 운영 DB 데이터 삭제

## 🚨 문제 상황

`prisma migrate reset` 명령어를 실행했을 때, `.env.local`에 개발 DB URL이 설정되어 있었음에도 불구하고 운영 DB 데이터가 삭제되었습니다.

---

## 🔍 원인 분석

### 확인된 사항:

1. **`.env.local` 파일 확인**:
   ```
   DATABASE_URL="postgresql://...@ep-divine-bird-a11dtdsm-pooler.../neondb..."
   # 주석: ep-long-dew-a10hipaa-pooler (운영 DB로 추정)
   SOURCE_DATABASE_URL="postgresql://...@ep-long-dew-a10hipaa-pooler.../neondb..."
   TARGET_DATABASE_URL="postgresql://...@ep-divine-bird-a11dtdsm-pooler.../neondb..."
   ```

2. **환경 변수 우선순위 문제 가능성**:
   - `.env` 파일에 운영 DB URL이 설정되어 있을 수 있음
   - 시스템 환경 변수에 운영 DB URL이 설정되어 있을 수 있음
   - `prisma.config.ts`가 다른 환경 변수를 읽었을 수 있음

3. **Prisma의 환경 변수 읽기 순서**:
   - `prisma migrate reset`은 `prisma.config.ts`를 통해 환경 변수를 읽음
   - `prisma.config.ts`는 `dotenv/config`를 사용하여 `.env` 파일을 먼저 읽을 수 있음
   - `.env.local`보다 `.env`가 먼저 로드될 수 있음

---

## 💔 데이터 복구 방법

### 1. Neon DB 백업 확인

Neon은 자동 백업을 제공합니다:
1. Neon 대시보드 접속: https://console.neon.tech
2. 프로젝트 선택
3. **"Backups"** 또는 **"History"** 탭 확인
4. 삭제 전 시점의 백업이 있는지 확인
5. 백업이 있으면 복구 가능

### 2. 데이터 복사 스크립트 사용

만약 개발 DB에 데이터가 복사되어 있다면:
```bash
# 개발 DB에서 운영 DB로 데이터 복사
SOURCE_DATABASE_URL="개발_DB_URL"
TARGET_DATABASE_URL="운영_DB_URL"
npm run db:copy
```

---

## 🔧 원인 해결 방법

### 1. 환경 변수 파일 정리

`.env` 파일 확인 및 수정:
```bash
# .env 파일에 운영 DB URL이 있으면 제거
# 또는 개발 DB URL로 변경
```

### 2. `.env.local` 우선순위 보장

`prisma.config.ts` 수정:
```typescript
import "dotenv/config";
import { defineConfig } from "prisma/config";

// .env.local을 명시적으로 먼저 로드
import { config } from "dotenv";
config({ path: ".env.local" });
config(); // .env 로드

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
```

### 3. 안전장치 추가

위험한 명령어 실행 전 확인:
```bash
# 실행 전 DB URL 확인
echo $DATABASE_URL

# 또는 스크립트로 확인
npm run check:env
```

---

## ⚠️ 앞으로의 주의사항

### 1. `prisma migrate reset` 사용 전 확인

```bash
# 1. 현재 DATABASE_URL 확인
node -e "require('dotenv/config'); console.log('DB:', process.env.DATABASE_URL?.substring(0, 50))"

# 2. 정말 개발 DB인지 확인
# 3. 데이터 백업 확인
# 4. 그 후에 실행
```

### 2. 환경 변수 파일 관리

- `.env`: 공통 설정 (Git에 커밋 가능한 것만)
- `.env.local`: 로컬 개발용 (개발 DB URL)
- `.env.production.local`: 로컬에서 운영 테스트용 (운영 DB URL)

### 3. 위험한 명령어 실행 전 확인

다음 명령어들은 **반드시** DB URL을 확인한 후 실행:
- `prisma migrate reset`
- `prisma db push --force-reset`
- `prisma db seed` (데이터 덮어쓰기 가능)

---

## 🙏 사과

제가 `prisma migrate reset` 명령어를 실행하기 전에:
1. 현재 `DATABASE_URL`이 정확히 무엇인지 확인하지 않았습니다
2. `.env` 파일의 존재와 내용을 확인하지 않았습니다
3. 환경 변수 우선순위를 고려하지 않았습니다

이로 인해 운영 DB 데이터가 삭제된 점 깊이 사과드립니다.

---

## 📝 다음 단계

1. **즉시**: Neon 대시보드에서 백업 확인 및 복구 시도
2. **환경 변수 파일 정리**: `.env`와 `.env.local` 확인
3. **안전장치 추가**: 위험한 명령어 실행 전 확인 스크립트 추가

죄송합니다. 데이터 복구를 최우선으로 진행해주세요. 🙏
