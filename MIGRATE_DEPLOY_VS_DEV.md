# `prisma migrate deploy` vs `prisma migrate dev` 정확한 차이

## 🎯 사용자의 이해 (거의 맞습니다!)

일반적인 사용 패턴:
- **`migrate dev`**: 개발 환경에서 사용
- **`migrate deploy`**: 운영 환경에서 사용

이것은 **거의 맞습니다!** 하지만 정확히는 조금 다릅니다.

---

## 📊 정확한 차이

### 둘 다 같은 DB를 사용할 수 있습니다

둘 다 `.env.local`의 `DATABASE_URL`을 읽습니다:
- 개발 DB URL이면 → 개발 DB에 적용
- 운영 DB URL이면 → 운영 DB에 적용

**차이는 "어떤 DB"가 아니라 "어떤 방식"입니다!**

---

## 🔄 `prisma migrate deploy` (운영 방식)

**특징**:
- ✅ 기존 마이그레이션 파일들만 실행
- ✅ 새 마이그레이션 파일 생성 안 함
- ✅ 스키마 파일(`schema.prisma`) 확인 안 함
- ✅ Shadow database 사용 안 함
- ✅ 안전하고 예측 가능

**언제 사용**:
- 운영 환경 배포 시
- CI/CD 파이프라인에서
- 이미 생성된 마이그레이션만 적용할 때

**예시**:
```bash
# 운영 DB에 마이그레이션 적용
DATABASE_URL="운영_DB_URL" npx prisma migrate deploy

# 또는 개발 DB에 기존 마이그레이션만 적용
DATABASE_URL="개발_DB_URL" npx prisma migrate deploy
```

---

## 🛠️ `prisma migrate dev` (개발 방식)

**특징**:
- ✅ 스키마 파일(`schema.prisma`) 확인
- ✅ 현재 DB 스키마와 비교
- ✅ 차이가 있으면 새 마이그레이션 파일 생성
- ✅ 생성된 파일을 DB에 적용
- ✅ Prisma Client 자동 재생성
- ✅ Shadow database 사용 (검증용)

**언제 사용**:
- 개발 중 스키마 변경할 때
- 새 마이그레이션 파일을 생성할 때
- 로컬 개발 환경에서

**예시**:
```bash
# 개발 DB에서 새 마이그레이션 생성 및 적용
DATABASE_URL="개발_DB_URL" npx prisma migrate dev

# 운영 DB에서도 사용 가능하지만 권장하지 않음
DATABASE_URL="운영_DB_URL" npx prisma migrate dev  # ⚠️ 위험!
```

---

## 📋 비교표

| 구분 | `migrate deploy` | `migrate dev` |
|------|-----------------|---------------|
| **용도** | 운영/프로덕션 | 개발 |
| **새 마이그레이션 생성** | ❌ 생성 안 함 | ✅ 자동 생성 |
| **스키마 변경 감지** | ❌ 감지 안 함 | ✅ 자동 감지 |
| **Shadow DB** | ❌ 사용 안 함 | ✅ 사용 |
| **안전성** | ✅ 매우 안전 | ⚠️ 개발용 |
| **예측 가능성** | ✅ 예측 가능 | ⚠️ 새 파일 생성 가능 |

---

## 🎯 실제 사용 패턴

### 개발 중:

```bash
# 1. 스키마 변경
# prisma/schema.prisma 수정

# 2. 새 마이그레이션 생성 및 적용 (개발 DB)
npm run db:migrate:dev
# → 새 마이그레이션 파일 생성
# → 개발 DB에 적용

# 3. Git에 커밋
git add prisma/migrations/
git commit -m "feat: 새 기능"
```

### 운영 배포:

```bash
# Vercel 배포 시 자동 실행
npm run build
# → npx prisma migrate deploy 실행
# → 운영 DB에 기존 마이그레이션만 적용
```

---

## ⚠️ 중요한 차이점

### 1. 스키마 변경 후

```bash
# ❌ 잘못된 방법
# schema.prisma 수정 후
npm run db:migrate  # (migrate deploy)
# → 아무것도 변경되지 않음!

# ✅ 올바른 방법
# schema.prisma 수정 후
npm run db:migrate:dev  # (migrate dev)
# → 새 마이그레이션 생성 및 적용
```

### 2. 운영 DB에 적용할 때

```bash
# ✅ 올바른 방법
# 운영 DB에 기존 마이그레이션만 적용
DATABASE_URL="운영_DB_URL" npm run db:migrate  # (migrate deploy)

# ❌ 위험한 방법
# 운영 DB에서 새 마이그레이션 생성 시도
DATABASE_URL="운영_DB_URL" npm run db:migrate:dev  # (migrate dev)
# → Shadow DB 문제 발생 가능
# → 예상치 못한 마이그레이션 생성 위험
```

---

## 💡 핵심 개념

### `migrate deploy` = "기존 파일만 실행"

```
prisma/migrations/ 폴더 확인
    ↓
아직 적용 안 된 파일들 찾기
    ↓
순서대로 실행
    ↓
끝 (새 파일 생성 안 함)
```

### `migrate dev` = "스키마 확인 + 새 파일 생성"

```
schema.prisma 파일 읽기
    ↓
현재 DB 스키마와 비교
    ↓
차이가 있나?
    ↓
있으면 → 새 마이그레이션 파일 생성
    ↓
새 파일을 DB에 적용
    ↓
Prisma Client 재생성
```

---

## 🚀 실제 워크플로우

### 개발 환경:

```bash
# 1. 스키마 변경
# prisma/schema.prisma 수정

# 2. 새 마이그레이션 생성 (개발 DB)
npm run db:migrate:dev
# → 새 파일 생성: prisma/migrations/20260113225748_xxx/migration.sql
# → 개발 DB에 적용

# 3. 테스트
npm run dev

# 4. Git 커밋
git add prisma/migrations/ prisma/schema.prisma
git commit -m "feat: 새 기능"
```

### 운영 환경:

```bash
# 1. Git에서 최신 코드 가져오기
git pull
# → 새 마이그레이션 파일도 함께 가져옴

# 2. 운영 DB에 마이그레이션 적용
npm run db:migrate  # (migrate deploy)
# → 새로 생성된 마이그레이션 파일 적용
# → 이제 "기존 마이그레이션"이 되었으므로 deploy로 적용 가능
```

---

## 📝 요약

### 사용자의 이해 (거의 맞음):

- **`migrate dev`**: 개발 환경에서 사용 ✅
- **`migrate deploy`**: 운영 환경에서 사용 ✅

### 정확한 차이:

- **`migrate deploy`**: 기존 마이그레이션 파일들만 실행 (새 파일 생성 안 함)
- **`migrate dev`**: 스키마 변경 감지하여 새 마이그레이션 생성 + 적용

### 핵심:

1. **스키마를 변경했다면** → `migrate dev` 사용 (새 마이그레이션 생성)
2. **기존 마이그레이션만 적용하려면** → `migrate deploy` 사용

**일반적으로**:
- 개발 중: `migrate dev` 사용
- 운영 배포: `migrate deploy` 사용

이것이 일반적인 사용 패턴이므로, 사용자의 이해가 거의 정확합니다! 🎉
