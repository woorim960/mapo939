# `db:migrate` vs `db:migrate:dev` 차이 설명

## 📋 핵심 차이

### 둘 다 같은 DB를 사용합니다
- ✅ 둘 다 `.env.local`의 `DATABASE_URL`을 읽습니다
- ✅ 같은 개발 DB에 마이그레이션을 적용합니다

### 하지만 동작 방식이 다릅니다

---

## 🔄 `npm run db:migrate`

**실행 명령어**:
```bash
npx prisma migrate deploy
```

**하는 일**:
1. `prisma/migrations/` 폴더의 **기존 마이그레이션 파일들**만 확인
2. 아직 적용되지 않은 마이그레이션 파일들을 순서대로 실행
3. **새 마이그레이션 파일을 생성하지 않음**
4. 스키마 파일(`schema.prisma`) 변경사항을 감지하지 않음

**특징**:
- ✅ 안전하고 예측 가능
- ✅ 운영 환경에 적합
- ❌ 스키마 변경사항이 있어도 새 마이그레이션을 생성하지 않음

**사용 시나리오**:
- 운영 DB에 마이그레이션 적용
- 개발 DB에 기존 마이그레이션만 적용하고 싶을 때
- Vercel 배포 시 (자동 실행)

---

## 🛠️ `npm run db:migrate:dev`

**실행 명령어**:
```bash
npx prisma migrate dev
```

**하는 일**:
1. `prisma/schema.prisma` 파일과 현재 DB 스키마를 비교
2. **차이점이 있으면 새 마이그레이션 파일을 자동 생성**
3. 생성된 마이그레이션 파일을 DB에 적용
4. Prisma Client를 자동으로 재생성

**특징**:
- ✅ 스키마 변경사항을 자동 감지
- ✅ 새 마이그레이션 파일 자동 생성
- ✅ 개발 환경에 적합
- ⚠️ Shadow database 사용 (임시 DB 생성)

**사용 시나리오**:
- 스키마를 변경한 후 새 마이그레이션을 생성하고 싶을 때
- 개발 중 스키마 변경사항을 테스트할 때
- 로컬 개발 환경에서 작업할 때

---

## 📊 비교표

| 구분 | `db:migrate` | `db:migrate:dev` |
|------|-------------|------------------|
| **명령어** | `prisma migrate deploy` | `prisma migrate dev` |
| **DB 사용** | `.env.local`의 `DATABASE_URL` | `.env.local`의 `DATABASE_URL` |
| **새 마이그레이션 생성** | ❌ 생성하지 않음 | ✅ 자동 생성 |
| **스키마 변경 감지** | ❌ 감지하지 않음 | ✅ 자동 감지 |
| **Shadow DB** | ❌ 사용하지 않음 | ✅ 사용 (임시 DB) |
| **Prisma Client 재생성** | ❌ 수동 실행 필요 | ✅ 자동 재생성 |
| **용도** | 운영/프로덕션 | 개발 |

---

## 🎯 실제 사용 예시

### 시나리오 1: 새 개발 DB에 기존 마이그레이션만 적용

```bash
# .env.local에 개발 DB URL 설정
DATABASE_URL="개발_DB_URL"

# 기존 마이그레이션 파일들만 적용
npm run db:migrate
```

**결과**:
- ✅ 기존 마이그레이션 파일들이 적용됨
- ❌ 새 마이그레이션 파일은 생성되지 않음
- ❌ 스키마 변경사항이 있어도 무시됨

---

### 시나리오 2: 스키마를 변경한 후 새 마이그레이션 생성

```bash
# 1. prisma/schema.prisma 파일 수정
# 예: 새 컬럼 추가, 새 테이블 추가 등

# 2. 새 마이그레이션 생성 및 적용
npm run db:migrate:dev
```

**결과**:
- ✅ 스키마 변경사항 감지
- ✅ 새 마이그레이션 파일 생성 (`prisma/migrations/YYYYMMDDHHMMSS_xxx/migration.sql`)
- ✅ 새 마이그레이션 파일이 DB에 적용됨
- ✅ Prisma Client 자동 재생성

**예시 출력**:
```
Applying migration `20260113225748`

The following migration(s) have been created and applied from new schema changes:

prisma/migrations/
  └─ 20260113225748/
    └─ migration.sql

Your database is now in sync with your schema.
```

---

## 🔍 Shadow Database란?

`db:migrate:dev`는 **Shadow Database**라는 임시 DB를 사용합니다.

**목적**:
- 마이그레이션 파일들이 순서대로 정확히 적용되는지 검증
- 스키마 변경사항을 안전하게 테스트

**동작 방식**:
1. Shadow DB 생성 (임시 DB)
2. 모든 마이그레이션 파일을 Shadow DB에 적용
3. 현재 스키마와 비교
4. 차이점이 있으면 새 마이그레이션 생성
5. Shadow DB 삭제

**주의사항**:
- Shadow DB 생성 실패 시 오류 발생 가능
- Neon 등 일부 DB 제공자에서는 Shadow DB 생성이 제한될 수 있음

---

## ⚠️ 주의사항

### 1. 스키마 변경 후

```bash
# ❌ 잘못된 방법
# schema.prisma 수정 후
npm run db:migrate  # 새 마이그레이션이 생성되지 않음!

# ✅ 올바른 방법
# schema.prisma 수정 후
npm run db:migrate:dev  # 새 마이그레이션 생성 및 적용
```

### 2. 운영 DB에 적용할 때

```bash
# ❌ 잘못된 방법
# 운영 DB에 직접
npm run db:migrate:dev  # Shadow DB 문제 발생 가능

# ✅ 올바른 방법
# 개발 DB에서 먼저 테스트
npm run db:migrate:dev  # 개발 DB에서 새 마이그레이션 생성

# 운영 DB에는 기존 마이그레이션만 적용
npm run db:migrate  # 운영 DB에 적용
```

### 3. 마이그레이션 파일 관리

- `db:migrate:dev`로 생성된 마이그레이션 파일은 Git에 커밋해야 함
- 다른 개발자도 같은 마이그레이션을 적용할 수 있도록

---

## 📚 요약

### `db:migrate` (운영용)
- 기존 마이그레이션 파일들만 적용
- 새 마이그레이션 생성 안 함
- 안전하고 예측 가능
- 운영/프로덕션 환경에 적합

### `db:migrate:dev` (개발용)
- 스키마 변경사항 감지
- 새 마이그레이션 파일 자동 생성
- 개발 환경에 적합
- 스키마 변경 후 사용

**간단히 말하면**:
- **스키마를 변경했다면** → `db:migrate:dev` 사용
- **기존 마이그레이션만 적용하려면** → `db:migrate` 사용

---

## 🎯 실제 워크플로우

### 개발 중:

```bash
# 1. 스키마 변경
# prisma/schema.prisma 수정

# 2. 새 마이그레이션 생성 및 적용
npm run db:migrate:dev

# 3. Git에 커밋
git add prisma/migrations/
git commit -m "feat: 새 마이그레이션 추가"
```

### 운영 배포:

```bash
# Vercel 배포 시 자동으로 실행됨
npm run build
# → npx prisma migrate deploy 실행
# → 기존 마이그레이션 파일들만 적용
```

이제 두 명령어의 차이를 이해하셨나요? 🎉
