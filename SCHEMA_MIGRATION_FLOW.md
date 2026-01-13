# 스키마 변경과 마이그레이션 적용 과정

## ❌ `db:migrate`만으로는 새 스키마가 적용되지 않습니다!

### 시나리오: 스키마를 변경하고 `db:migrate` 실행

```bash
# 1. prisma/schema.prisma 파일 수정
# 예: Member 테이블에 phone 컬럼 추가

model Member {
  id        String   @id @default(uuid())
  name      String
  birthDate DateTime
  phone     String   // ← 새로 추가한 컬럼
  ...
}

# 2. db:migrate 실행
npm run db:migrate
```

**결과**: ❌ **아무것도 변경되지 않음!**

**이유**:
- `db:migrate`는 `prisma/migrations/` 폴더의 **기존 파일들**만 실행
- `prisma/schema.prisma` 파일은 **보지 않음**
- 새 마이그레이션 파일을 **생성하지 않음**
- 따라서 DB에는 **변경사항이 적용되지 않음**

---

## ✅ 올바른 방법

### 1단계: 스키마 변경 후 새 마이그레이션 생성

```bash
# 1. prisma/schema.prisma 파일 수정
# 예: Member 테이블에 phone 컬럼 추가

# 2. 새 마이그레이션 생성 및 적용
npm run db:migrate:dev
```

**무슨 일이 일어나는가?**:
1. `schema.prisma` 파일 읽기
2. 현재 DB 스키마와 비교
3. "phone 컬럼이 없네?" → 차이점 감지
4. **새 마이그레이션 파일 생성**: `prisma/migrations/20260113225748_add_phone/migration.sql`
5. 새 파일을 DB에 적용

**결과**:
- ✅ 새 마이그레이션 파일 생성됨
- ✅ DB에 변경사항 적용됨

---

### 2단계: 이제 `db:migrate`로도 적용 가능

```bash
# 이제 새로 생성된 파일이 "기존 마이그레이션"이 되었으므로
npm run db:migrate
```

**무슨 일이 일어나는가?**:
1. `prisma/migrations/` 폴더 확인
2. "20260113225748_add_phone 파일이 있네?"
3. 이 파일을 DB에 실행

**결과**:
- ✅ 새로 생성된 마이그레이션도 적용됨
- 하지만 이미 `db:migrate:dev`에서 적용했으므로 "이미 적용됨"이라고 나올 수 있음

---

## 📊 전체 흐름

### 올바른 워크플로우:

```bash
# 1. 스키마 변경
# prisma/schema.prisma 파일 수정

# 2. 새 마이그레이션 생성 및 적용 (개발 환경)
npm run db:migrate:dev
# → 새 마이그레이션 파일 생성
# → 개발 DB에 적용

# 3. Git에 커밋
git add prisma/migrations/
git commit -m "feat: phone 컬럼 추가"

# 4. 다른 개발자나 운영 환경에서는
npm run db:migrate
# → 새로 생성된 마이그레이션 파일 적용
```

---

## 🔍 실제 예시

### 예시 1: 잘못된 방법

```bash
# 1. schema.prisma 수정
# Member 테이블에 phone 컬럼 추가

# 2. db:migrate 실행
npm run db:migrate

# 출력:
# No pending migrations to apply.
# → 아무것도 변경되지 않음!
```

**왜 안 되는가?**:
- `db:migrate`는 `prisma/migrations/` 폴더만 확인
- `schema.prisma`는 보지 않음
- 새 마이그레이션 파일이 없으므로 아무것도 실행할 게 없음

---

### 예시 2: 올바른 방법

```bash
# 1. schema.prisma 수정
# Member 테이블에 phone 컬럼 추가

# 2. db:migrate:dev 실행
npm run db:migrate:dev

# 출력:
# Applying migration `20260113225748`
#
# The following migration(s) have been created and applied from new schema changes:
#
# prisma/migrations/
#   └─ 20260113225748/
#     └─ migration.sql
#
# Your database is now in sync with your schema.
# → 새 마이그레이션 파일 생성 및 적용됨!
```

**무슨 일이 일어났는가?**:
1. `schema.prisma` 변경사항 감지
2. 새 마이그레이션 파일 생성
3. DB에 적용

---

## 💡 왜 이렇게 동작하는가?

### `db:migrate`의 목적

- ✅ **안전성**: 예측 가능한 마이그레이션만 실행
- ✅ **일관성**: 모든 환경에서 같은 마이그레이션 파일 사용
- ✅ **검증**: 이미 테스트된 마이그레이션만 적용

### `db:migrate:dev`의 목적

- ✅ **편의성**: 스키마만 수정하면 자동으로 마이그레이션 생성
- ✅ **개발 효율**: 수동으로 SQL 작성할 필요 없음

---

## 📝 요약

### ❌ 스키마 변경 후 `db:migrate`만 실행:

```
스키마 변경 → db:migrate
→ 결과: 아무것도 변경되지 않음
→ 이유: 새 마이그레이션 파일이 없음
```

### ✅ 스키마 변경 후 올바른 방법:

```
스키마 변경 → db:migrate:dev
→ 결과: 새 마이그레이션 파일 생성 + 적용
→ 이후: db:migrate로도 적용 가능 (이제 "기존 마이그레이션"이 되었으므로)
```

### 정리:

1. **스키마를 변경했다면** → `db:migrate:dev` 사용 (새 마이그레이션 생성)
2. **기존 마이그레이션만 적용하려면** → `db:migrate` 사용

---

## 🎯 핵심 개념

### 마이그레이션 파일이 있어야 DB가 변경됨

```
스키마 변경 (schema.prisma)
    ↓
새 마이그레이션 파일 생성 (db:migrate:dev)
    ↓
마이그레이션 파일이 DB에 적용됨 (db:migrate 또는 db:migrate:dev)
    ↓
DB가 변경됨
```

**중요**: 스키마만 변경하고 마이그레이션 파일을 생성하지 않으면, DB는 변경되지 않습니다!

---

## 🚀 실제 개발 워크플로우

### 개발 중:

```bash
# 1. 스키마 변경
# prisma/schema.prisma 수정

# 2. 새 마이그레이션 생성 및 적용
npm run db:migrate:dev

# 3. 테스트
npm run dev

# 4. Git에 커밋
git add prisma/migrations/ prisma/schema.prisma
git commit -m "feat: phone 컬럼 추가"
```

### 운영 배포:

```bash
# Git에서 최신 코드 가져오기 (새 마이그레이션 파일 포함)
git pull

# 운영 DB에 마이그레이션 적용
npm run db:migrate
# → 새로 생성된 마이그레이션 파일이 적용됨
```

이제 이해되셨나요? 🎉
