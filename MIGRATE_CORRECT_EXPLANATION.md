# `db:migrate` vs `db:migrate:dev` 정확한 설명 (수정)

## ✅ 정확한 이해

### 둘 다 같은 DB를 사용합니다!

`.env.local`에 개발 DB URL이 설정되어 있다면:
- `npm run db:migrate` → 개발 DB에 적용
- `npm run db:migrate:dev` → 개발 DB에 적용

**둘 다 같은 개발 DB를 사용합니다!**

---

## 🔄 정확한 차이

### 차이는 "어떤 DB"가 아니라 "어떤 방식"입니다!

| 구분 | `db:migrate` | `db:migrate:dev` |
|------|-------------|------------------|
| **사용하는 DB** | `.env.local`의 `DATABASE_URL` (개발 DB) | `.env.local`의 `DATABASE_URL` (개발 DB) |
| **새 마이그레이션 생성** | ❌ 생성 안 함 | ✅ 자동 생성 |
| **스키마 변경 감지** | ❌ 감지 안 함 | ✅ 자동 감지 |

---

## 📊 실제 동작

### `.env.local` 설정:

```bash
# .env.local
DATABASE_URL="개발_DB_URL"
```

### `npm run db:migrate` 실행:

```bash
npm run db:migrate
# → npx prisma migrate deploy 실행
# → .env.local의 DATABASE_URL 읽기 (개발 DB)
# → prisma/migrations/ 폴더의 기존 파일들만 실행
# → 개발 DB에 적용
```

### `npm run db:migrate:dev` 실행:

```bash
npm run db:migrate:dev
# → npx prisma migrate dev 실행
# → .env.local의 DATABASE_URL 읽기 (개발 DB)
# → schema.prisma와 현재 DB 비교
# → 차이가 있으면 새 마이그레이션 파일 생성
# → 개발 DB에 적용
```

**둘 다 같은 개발 DB를 사용합니다!**

---

## 🎯 실제 차이

### `db:migrate` (기존 파일만 실행)

```
1. prisma/migrations/ 폴더 확인
2. 아직 적용 안 된 파일들 찾기
3. 순서대로 실행
4. 끝 (새 파일 생성 안 함)
```

**결과**: 기존 마이그레이션 파일들만 개발 DB에 적용

---

### `db:migrate:dev` (스키마 확인 + 새 파일 생성)

```
1. schema.prisma 파일 읽기
2. 현재 개발 DB 스키마와 비교
3. 차이가 있나?
4. 있으면 → 새 마이그레이션 파일 생성
5. 새 파일을 개발 DB에 적용
```

**결과**: 스키마 변경사항을 감지하여 새 마이그레이션 생성 + 개발 DB에 적용

---

## 💡 핵심 개념

### 둘 다 개발 DB를 사용합니다!

- `.env.local`에 개발 DB URL이 설정되어 있으면
- 둘 다 같은 개발 DB에 적용됩니다
- 차이는 "어떤 DB"가 아니라 "어떤 방식"입니다

### 차이점:

1. **`db:migrate`**: 기존 마이그레이션 파일들만 실행 (새 파일 생성 안 함)
2. **`db:migrate:dev`**: 스키마 변경 감지하여 새 마이그레이션 생성 + 적용

---

## 🚀 실제 사용 예시

### 시나리오 1: 새 개발 DB에 기존 마이그레이션만 적용

```bash
# .env.local에 개발 DB URL 설정
DATABASE_URL="개발_DB_URL"

# 기존 마이그레이션 파일들만 적용
npm run db:migrate
# → 개발 DB에 기존 마이그레이션 파일들 적용
```

---

### 시나리오 2: 스키마 변경 후 새 마이그레이션 생성

```bash
# .env.local에 개발 DB URL 설정
DATABASE_URL="개발_DB_URL"

# 1. schema.prisma 수정
# 예: Member 테이블에 phone 컬럼 추가

# 2. 새 마이그레이션 생성 및 적용
npm run db:migrate:dev
# → 스키마 변경 감지
# → 새 마이그레이션 파일 생성
# → 개발 DB에 적용
```

**둘 다 같은 개발 DB를 사용합니다!**

---

## 📝 요약

### 정확한 이해:

- ✅ 둘 다 `.env.local`의 `DATABASE_URL`을 사용
- ✅ 개발 DB URL이면 둘 다 개발 DB에 적용
- ✅ 차이는 "어떤 DB"가 아니라 "어떤 방식"

### 차이점:

1. **`db:migrate`**: 기존 마이그레이션 파일들만 실행 (새 파일 생성 안 함)
2. **`db:migrate:dev`**: 스키마 변경 감지하여 새 마이그레이션 생성 + 적용

### 사용 시나리오:

- **기존 마이그레이션만 적용**: `db:migrate`
- **스키마 변경 후 새 마이그레이션 생성**: `db:migrate:dev`

**둘 다 같은 개발 DB를 사용합니다!** 🎉

---

## ⚠️ 이전 설명의 오류

제가 이전에 "운영 DB", "개발 DB"라고 구분해서 설명한 부분이 혼란을 드렸습니다.

**정확히는**:
- `.env.local`에 개발 DB URL이 설정되어 있으면
- 둘 다 같은 개발 DB를 사용합니다
- 차이는 "어떤 DB"가 아니라 "어떤 방식"입니다

사용자의 지적이 정확합니다! 감사합니다. 🙏
