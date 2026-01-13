# npm 스크립트 명령어 설명

## 📋 모든 스크립트 개요

### DB 관련 명령어

#### `npm run db:generate`
**실제 명령어**: `npx prisma generate`

**용도**: Prisma Client를 생성합니다.

**하는 일**:
1. `prisma/schema.prisma` 파일을 읽습니다
2. 타입 안전한 Prisma Client 코드를 생성합니다
3. `node_modules/.prisma/client` 폴더에 생성됩니다

**언제 사용**:
- 스키마를 변경한 후
- Prisma Client가 없을 때
- 타입 에러가 발생할 때

**예시**:
```bash
# 스키마 변경 후
npm run db:generate
# → Prisma Client가 새로 생성됨
# → TypeScript 타입이 업데이트됨
```

**참고**:
- `postinstall` 스크립트에서 자동으로 실행됨 (`npm install` 후)
- `db:migrate:dev` 실행 시 자동으로 실행됨

---

#### `npm run db:studio`
**실제 명령어**: `npx prisma studio`

**용도**: 데이터베이스를 시각적으로 관리하는 웹 UI를 엽니다.

**하는 일**:
1. 로컬 웹 서버를 시작합니다 (기본 포트: 5555)
2. 브라우저에서 데이터베이스를 시각적으로 볼 수 있습니다
3. 데이터를 추가/수정/삭제할 수 있습니다
4. 테이블 간 관계를 확인할 수 있습니다

**언제 사용**:
- 데이터베이스 내용을 빠르게 확인하고 싶을 때
- 테스트 데이터를 수동으로 추가하고 싶을 때
- 데이터를 확인하고 디버깅할 때

**예시**:
```bash
# Prisma Studio 실행
npm run db:studio

# 출력:
# Environment variables loaded from .env.local
# Prisma Studio is up on http://localhost:5555
# → 브라우저에서 http://localhost:5555 접속
```

**특징**:
- 로컬 개발용 도구
- 운영 환경에서는 사용하지 않음
- GUI로 데이터베이스를 관리

---

#### `npm run db:migrate`
**실제 명령어**: `npx prisma migrate deploy`

**용도**: 기존 마이그레이션 파일들을 데이터베이스에 적용합니다.

**자세한 내용**: `DB_MIGRATE_VS_DEV.md` 참고

---

#### `npm run db:migrate:new`
**실제 명령어**: `npx prisma migrate dev`

**용도**: 스키마 변경사항을 감지하여 새 마이그레이션 파일을 생성하고 적용합니다.

**자세한 내용**: `DB_MIGRATE_VS_DEV.md` 참고

---

#### `npm run db:copy`
**실제 명령어**: `tsx scripts/copy-db-data.ts`

**용도**: 기존 DB의 데이터를 새 DB로 복사합니다.

**자세한 내용**: `DB_COMMANDS_EXPLAINED.md` 참고

---

### 환경 변수 확인

#### `npm run check:env`
**실제 명령어**: `tsx scripts/check-env.ts`

**용도**: 필수 환경 변수가 모두 설정되어 있는지 확인합니다.

**하는 일**:
1. 다음 환경 변수들을 확인:
   - `DATABASE_URL`
   - `NEXT_PUBLIC_TOSS_PAYMENTS_WIDGET_CLIENT_KEY`
   - `TOSS_PAYMENTS_WIDGET_SECRET_KEY`
2. 모두 설정되어 있으면 성공 메시지 출력
3. 누락된 변수가 있으면 에러 메시지 출력

**언제 사용**:
- 환경 변수가 제대로 설정되었는지 확인하고 싶을 때
- 배포 전에 확인하고 싶을 때
- 설정 문제를 디버깅할 때

**예시**:
```bash
# 환경 변수 확인
npm run check:env

# 출력 (성공):
# ✅ All required environment variables are set
# 📋 Environment variables:
#   - DATABASE_URL: postgresql://***@host...
#   - NEXT_PUBLIC_TOSS_PAYMENTS_WIDGET_CLIENT_KEY: test_gck_docs_...
#   - TOSS_PAYMENTS_WIDGET_SECRET_KEY: test_gsk_docs_...

# 출력 (실패):
# ❌ Missing required environment variables:
#   - DATABASE_URL
# 💡 Please check your .env.local file or Vercel environment variables.
```

---

### 시드 데이터 (Seed)

#### `npm run seed:members`
**실제 명령어**: `tsx prisma/seed-members.ts`

**용도**: 멤버 테스트 데이터를 데이터베이스에 추가합니다.

**하는 일**:
1. `prisma/seed-members.ts` 스크립트 실행
2. 샘플 멤버 데이터를 데이터베이스에 삽입
3. 개발/테스트용 데이터 생성

**언제 사용**:
- 개발 환경에서 테스트 데이터가 필요할 때
- 새로운 기능을 테스트하기 전에 샘플 데이터가 필요할 때
- 데이터베이스를 초기화한 후 데이터를 채우고 싶을 때

**주의사항**:
- 기존 데이터를 덮어쓸 수 있음
- 운영 환경에서는 사용하지 않음

---

#### `npm run seed:watermelon-items`
**실제 명령어**: `tsx prisma/seed-watermelon-items.ts`

**용도**: 수박게임 아이템 데이터를 데이터베이스에 추가합니다.

**하는 일**:
1. `prisma/seed-watermelon-items.ts` 스크립트 실행
2. 수박게임 아이템 데이터를 데이터베이스에 삽입
3. 아이템 목록 생성 (가격, 효과 등)

**언제 사용**:
- 수박게임 아이템을 초기화하고 싶을 때
- 새 아이템을 추가하고 싶을 때
- 데이터베이스에 아이템이 없을 때

**주의사항**:
- 기존 아이템 데이터를 덮어쓸 수 있음
- 운영 환경에서는 신중하게 사용

---

## 📊 명령어 분류

### 자주 사용하는 명령어:

| 명령어 | 용도 | 사용 빈도 |
|--------|------|----------|
| `db:migrate:new` | 새 마이그레이션 생성 | 자주 |
| `db:migrate` | 마이그레이션 적용 | 자주 |
| `db:studio` | 데이터베이스 확인 | 자주 |
| `check:env` | 환경 변수 확인 | 가끔 |
| `db:generate` | Prisma Client 생성 | 자동 (필요시) |
| `db:copy` | 데이터 복사 | 가끔 |
| `seed:*` | 테스트 데이터 생성 | 필요시 |

---

## 🎯 실제 사용 예시

### 개발 중 워크플로우:

```bash
# 1. 스키마 변경
# prisma/schema.prisma 수정

# 2. 새 마이그레이션 생성
npm run db:migrate:new
# → 새 마이그레이션 파일 생성
# → Prisma Client 자동 생성

# 3. 데이터베이스 확인
npm run db:studio
# → 브라우저에서 http://localhost:5555 접속
# → 데이터 확인

# 4. 테스트 데이터 추가 (필요시)
npm run seed:members
npm run seed:watermelon-items
```

### 배포 전 확인:

```bash
# 1. 환경 변수 확인
npm run check:env

# 2. 마이그레이션 적용
npm run db:migrate

# 3. 빌드 테스트
npm run build
```

---

## ⚠️ 주의사항

### 1. 시드 데이터 명령어

- **기존 데이터를 덮어쓸 수 있음**
- **운영 환경에서는 사용하지 않음**
- 실행 전에 데이터베이스 상태 확인 권장

### 2. `db:studio`

- **로컬 개발용 도구**
- **운영 환경에서는 사용하지 않음**
- 데이터를 직접 수정할 수 있으므로 주의

### 3. `db:generate`

- **자동으로 실행됨** (`postinstall`, `db:migrate:dev`)
- 수동으로 실행할 필요는 거의 없음
- 타입 에러가 발생하면 실행

---

## 📚 요약

### DB 관련:

- **`db:generate`**: Prisma Client 생성
- **`db:studio`**: 데이터베이스 시각적 관리 (웹 UI)
- **`db:migrate`**: 기존 마이그레이션 적용
- **`db:migrate:new`**: 새 마이그레이션 생성
- **`db:copy`**: 데이터 복사

### 환경 변수:

- **`check:env`**: 필수 환경 변수 확인

### 시드 데이터:

- **`seed:members`**: 멤버 테스트 데이터 생성
- **`seed:watermelon-items`**: 수박게임 아이템 데이터 생성

각 명령어의 자세한 내용은 위 설명을 참고하세요! 🎉
