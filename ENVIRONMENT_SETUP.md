# 개발/운영 환경 분리 가이드

## 📋 개요

현재 개발 서버와 운영 서버가 동일한 데이터베이스를 사용하고 있어, 개발 환경을 분리해야 합니다.

## 🎯 목표

1. **개발 DB와 운영 DB 분리**
2. **환경 변수 관리 체계화**
3. **로컬 개발 환경 설정**
4. **Vercel 배포 환경 설정**

---

## 📝 단계별 가이드

### 1단계: 환경 변수 파일 구조 설정

프로젝트 루트에 다음 파일들을 생성합니다:

#### `.env.local` (로컬 개발용 - Git에 커밋하지 않음)
```bash
# 개발 데이터베이스 URL (Neon PostgreSQL)
DATABASE_URL="postgresql://user:password@host:5432/dev_db?sslmode=require"

# 토스페이먼츠 테스트 키
NEXT_PUBLIC_TOSS_PAYMENTS_WIDGET_CLIENT_KEY="test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm"
TOSS_PAYMENTS_WIDGET_SECRET_KEY="test_gsk_docs_OaPz8L5KdmQXkzRz3y47BMw6"
```

#### `.env.production.local` (로컬에서 운영 테스트용 - Git에 커밋하지 않음)
```bash
# 운영 데이터베이스 URL
DATABASE_URL="postgresql://user:password@host:5432/prod_db?sslmode=require"

# 토스페이먼츠 운영 키
NEXT_PUBLIC_TOSS_PAYMENTS_WIDGET_CLIENT_KEY="live_gck_..."
TOSS_PAYMENTS_WIDGET_SECRET_KEY="live_gsk_..."
```

#### `.env.example` (템플릿 - Git에 커밋)
```bash
# 데이터베이스 URL
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"

# 토스페이먼츠 키
NEXT_PUBLIC_TOSS_PAYMENTS_WIDGET_CLIENT_KEY="your_client_key"
TOSS_PAYMENTS_WIDGET_SECRET_KEY="your_secret_key"
```

---

### 2단계: 개발 데이터베이스 생성

#### Neon PostgreSQL 사용 시:

1. **Neon 대시보드 접속**: https://console.neon.tech
2. **새 프로젝트 생성**:
   - 프로젝트 이름: `attendance-app-dev`
   - 데이터베이스 이름: `dev_db` (또는 원하는 이름)
   - 리전: 개발 환경과 가까운 리전 선택
3. **연결 문자열 복사**:
   ```
   postgresql://user:password@ep-xxx-xxx.ap-southeast-1.aws.neon.tech/dev_db?sslmode=require
   ```
4. **`.env.local`에 추가**:
   ```bash
   DATABASE_URL="복사한_연결_문자열"
   ```

#### 다른 PostgreSQL 제공자 사용 시:
- Supabase, Railway, Render 등에서도 동일하게 개발용 DB를 생성하세요.

---

### 3단계: 개발 DB 마이그레이션 적용

로컬에서 개발 DB에 마이그레이션을 적용합니다:

```bash
# 개발 DB에 마이그레이션 적용
npx prisma migrate deploy

# 또는 개발 중이라면
npx prisma migrate dev
```

**주의**: 운영 DB에 이미 적용된 마이그레이션이 있다면, 개발 DB에도 동일하게 적용해야 합니다.

---

### 4단계: 개발 DB 시드 데이터 생성 (선택사항)

개발용 테스트 데이터가 필요하다면:

```bash
# 멤버 시드 데이터 생성
npm run seed:members

# 수박게임 아이템 시드 데이터 생성
npm run seed:watermelon-items
```

---

### 5단계: Vercel 환경 변수 설정

#### 5-1. Vercel 대시보드 접속
1. https://vercel.com 접속
2. 프로젝트 선택

#### 5-2. 환경 변수 추가
**Settings** → **Environment Variables**에서 다음 변수들을 추가:

##### Production 환경:
```
DATABASE_URL = 운영_DB_연결_문자열
NEXT_PUBLIC_TOSS_PAYMENTS_WIDGET_CLIENT_KEY = 운영_클라이언트_키
TOSS_PAYMENTS_WIDGET_SECRET_KEY = 운영_시크릿_키
```

##### Preview 환경 (선택사항):
개발 브랜치 배포 시 사용할 환경 변수
```
DATABASE_URL = 개발_DB_연결_문자열 (또는 운영_DB_연결_문자열)
NEXT_PUBLIC_TOSS_PAYMENTS_WIDGET_CLIENT_KEY = 테스트_클라이언트_키
TOSS_PAYMENTS_WIDGET_SECRET_KEY = 테스트_시크릿_키
```

##### Development 환경 (선택사항):
로컬 개발 시 Vercel CLI 사용 시
```
DATABASE_URL = 개발_DB_연결_문자열
NEXT_PUBLIC_TOSS_PAYMENTS_WIDGET_CLIENT_KEY = 테스트_클라이언트_키
TOSS_PAYMENTS_WIDGET_SECRET_KEY = 테스트_시크릿_키
```

**중요**: 각 환경 변수에 대해 **Production**, **Preview**, **Development** 중 어떤 환경에 적용할지 선택해야 합니다.

---

### 6단계: package.json 스크립트 개선

개발/운영 환경을 명확히 구분하기 위해 스크립트를 개선합니다:

```json
{
  "scripts": {
    "dev": "next dev",
    "dev:prod": "NODE_ENV=production next dev", // 로컬에서 운영 환경 테스트
    "build": "npx prisma migrate deploy && npx next build",
    "build:dev": "NODE_ENV=development npx prisma migrate deploy && npx next build",
    "start": "next start",
    "db:migrate": "npx prisma migrate deploy",
    "db:migrate:dev": "npx prisma migrate dev",
    "db:generate": "npx prisma generate",
    "db:studio": "npx prisma studio",
    "seed:members": "tsx prisma/seed-members.ts",
    "seed:watermelon-items": "tsx prisma/seed-watermelon-items.ts"
  }
}
```

---

### 7단계: 환경 변수 검증 스크립트 (선택사항)

환경 변수가 제대로 설정되었는지 확인하는 스크립트를 추가할 수 있습니다:

```typescript
// scripts/check-env.ts
const requiredEnvVars = [
  'DATABASE_URL',
  'NEXT_PUBLIC_TOSS_PAYMENTS_WIDGET_CLIENT_KEY',
  'TOSS_PAYMENTS_WIDGET_SECRET_KEY',
];

const missing = requiredEnvVars.filter(key => !process.env[key]);

if (missing.length > 0) {
  console.error('❌ Missing required environment variables:');
  missing.forEach(key => console.error(`  - ${key}`));
  process.exit(1);
}

console.log('✅ All required environment variables are set');
```

---

## 🔍 환경 변수 사용 위치

### 현재 프로젝트에서 사용하는 환경 변수:

1. **`DATABASE_URL`**
   - `src/lib/prisma.ts` - 메인 Prisma 클라이언트
   - `src/lib/liar/db.ts` - 라이어 게임 Prisma 클라이언트
   - `prisma.config.ts` - Prisma 설정

2. **`NEXT_PUBLIC_TOSS_PAYMENTS_WIDGET_CLIENT_KEY`**
   - `src/features/watermelon/components/PaymentWidget.tsx` - 토스페이먼츠 위젯 초기화

3. **`TOSS_PAYMENTS_WIDGET_SECRET_KEY`**
   - `src/app/api/watermelon/payments/approve/route.ts` - 결제 승인 API

---

## 🚀 배포 워크플로우

### 개발 환경에서 작업:
```bash
# 1. 개발 DB에 마이그레이션 적용
npm run db:migrate:dev

# 2. 개발 서버 실행
npm run dev
```

### 운영 배포 전:
```bash
# 1. 마이그레이션 파일 생성 (변경사항이 있을 경우)
npm run db:migrate:dev

# 2. 로컬에서 빌드 테스트
npm run build

# 3. Vercel에 배포
npm run prod
# 또는
vercel --prod
```

### 운영 배포 시:
- Vercel이 자동으로 `npm run build` 실행
- `npx prisma migrate deploy`가 자동 실행되어 운영 DB에 마이그레이션 적용
- 환경 변수는 Vercel 대시보드에서 설정한 값 사용

---

## ⚠️ 주의사항

1. **`.env.local` 파일은 절대 Git에 커밋하지 마세요**
   - `.gitignore`에 이미 포함되어 있지만 확인하세요.

2. **운영 DB와 개발 DB는 반드시 분리**
   - 개발 중 실수로 운영 데이터를 삭제하는 것을 방지합니다.

3. **마이그레이션 관리**
   - 개발 DB에 마이그레이션을 먼저 테스트한 후 운영에 적용하세요.
   - 운영 DB 마이그레이션은 신중하게 진행하세요.

4. **토스페이먼츠 키 관리**
   - 테스트 키와 운영 키를 명확히 구분하세요.
   - 운영 키는 절대 개발 환경에서 사용하지 마세요.

5. **환경 변수 확인**
   - 배포 전에 Vercel 대시보드에서 환경 변수가 올바르게 설정되었는지 확인하세요.

---

## 📚 추가 리소스

- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
- [Prisma Environment Variables](https://www.prisma.io/docs/guides/development-environment/environment-variables)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

---

## ✅ 체크리스트

배포 전 확인사항:

- [ ] 개발 DB가 생성되고 연결되었는가?
- [ ] `.env.local`에 개발 DB URL이 설정되었는가?
- [ ] Vercel에 운영 환경 변수가 설정되었는가?
- [ ] 개발 DB에 마이그레이션이 적용되었는가?
- [ ] 로컬에서 `npm run dev`가 정상 작동하는가?
- [ ] 로컬에서 `npm run build`가 정상 작동하는가?
- [ ] 운영 배포 후 데이터베이스 연결이 정상인가?
