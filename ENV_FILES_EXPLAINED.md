# 환경 변수 파일 관리 가이드

## 📋 핵심 개념

**`.env.local`은 로컬 개발 환경에서만 사용되고, Vercel 배포 시에는 Vercel 대시보드의 환경 변수를 사용합니다.**

이 둘은 **완전히 분리**되어 있어서:
- 로컬 개발: `.env.local` 파일 사용
- Vercel 배포: Vercel 대시보드 환경 변수 사용

---

## 📁 환경 변수 파일 구조

### `.env.local` (로컬 개발용)

**위치**: 프로젝트 루트  
**용도**: 로컬에서 `npm run dev` 실행 시 사용  
**Git 커밋**: ❌ 커밋하지 않음 (`.gitignore`에 포함)

```bash
# 개발 데이터베이스 URL
DATABASE_URL="postgresql://user:password@ep-xxx-dev.neon.tech/dev_db?sslmode=require"

# 토스페이먼츠 테스트 키
NEXT_PUBLIC_TOSS_PAYMENTS_WIDGET_CLIENT_KEY="test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm"
TOSS_PAYMENTS_WIDGET_SECRET_KEY="test_gsk_docs_OaPz8L5KdmQXkzRz3y47BMw6"
```

### Vercel 환경 변수 (배포용)

**위치**: Vercel 대시보드 → Settings → Environment Variables  
**용도**: Vercel에 배포된 앱에서 사용  
**Git 커밋**: ❌ Vercel 대시보드에서만 관리

#### Production 환경 (운영 서버)
```
DATABASE_URL = 운영_DB_연결_문자열
NEXT_PUBLIC_TOSS_PAYMENTS_WIDGET_CLIENT_KEY = 운영_클라이언트_키
TOSS_PAYMENTS_WIDGET_SECRET_KEY = 운영_시크릿_키
```

#### Preview 환경 (개발 서버)
```
DATABASE_URL = 개발_DB_연결_문자열
NEXT_PUBLIC_TOSS_PAYMENTS_WIDGET_CLIENT_KEY = 테스트_클라이언트_키
TOSS_PAYMENTS_WIDGET_SECRET_KEY = 테스트_시크릿_키
```

---

## 🔄 환경 변수 우선순위

Next.js는 다음 순서로 환경 변수를 읽습니다:

1. **Vercel 배포 환경** (가장 높은 우선순위)
   - Production: Vercel Production 환경 변수
   - Preview: Vercel Preview 환경 변수

2. **로컬 개발 환경**
   - `.env.local` 파일

**중요**: Vercel에 배포되면 `.env.local` 파일은 **무시**됩니다!

---

## 📝 실제 사용 시나리오

### 시나리오 1: 로컬 개발

```bash
# .env.local 파일이 있으면
DATABASE_URL="개발_DB_URL"

# npm run dev 실행 시
npm run dev
# → .env.local의 DATABASE_URL 사용
# → 개발 DB에 연결됨
```

### 시나리오 2: Vercel Production 배포 (main 브랜치)

```bash
# main 브랜치에 푸시
git push origin main

# Vercel이 자동 배포
# → Vercel Production 환경 변수 사용
# → 운영 DB에 연결됨
# → .env.local 파일은 무시됨
```

### 시나리오 3: Vercel Preview 배포 (develop 브랜치)

```bash
# develop 브랜치에 푸시
git push origin develop

# Vercel이 자동 배포
# → Vercel Preview 환경 변수 사용
# → 개발 DB에 연결됨
# → .env.local 파일은 무시됨
```

---

## 🎯 올바른 설정 방법

### 1단계: 로컬 개발 환경 설정

프로젝트 루트에 `.env.local` 파일 생성:

```bash
# .env.local
DATABASE_URL="개발_DB_연결_문자열"
NEXT_PUBLIC_TOSS_PAYMENTS_WIDGET_CLIENT_KEY="test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm"
TOSS_PAYMENTS_WIDGET_SECRET_KEY="test_gsk_docs_OaPz8L5KdmQXkzRz3y47BMw6"
```

### 2단계: Vercel 환경 변수 설정

#### Production 환경 변수 (운영 서버)

1. Vercel 대시보드 → 프로젝트 선택
2. **Settings** → **Environment Variables**
3. 다음 변수들을 **Production** 환경에 추가:

```
Key: DATABASE_URL
Value: 운영_DB_연결_문자열
Environment: ✅ Production만 체크

Key: NEXT_PUBLIC_TOSS_PAYMENTS_WIDGET_CLIENT_KEY
Value: 운영_클라이언트_키
Environment: ✅ Production만 체크

Key: TOSS_PAYMENTS_WIDGET_SECRET_KEY
Value: 운영_시크릿_키
Environment: ✅ Production만 체크
```

#### Preview 환경 변수 (개발 서버)

같은 페이지에서 다음 변수들을 **Preview** 환경에 추가:

```
Key: DATABASE_URL
Value: 개발_DB_연결_문자열
Environment: ✅ Preview만 체크

Key: NEXT_PUBLIC_TOSS_PAYMENTS_WIDGET_CLIENT_KEY
Value: 테스트_클라이언트_키
Environment: ✅ Preview만 체크

Key: TOSS_PAYMENTS_WIDGET_SECRET_KEY
Value: 테스트_시크릿_키
Environment: ✅ Preview만 체크
```

---

## ✅ 확인 방법

### 로컬 개발 환경 확인

```bash
# 환경 변수 확인
npm run check:env

# 개발 서버 실행
npm run dev

# 브라우저에서 접속하여 개발 DB 데이터가 보이는지 확인
```

### Vercel Production 환경 확인

1. Vercel 대시보드 → **Deployments** 탭
2. Production 배포 선택
3. **"Visit"** 버튼 클릭하여 운영 사이트 접속
4. 운영 DB 데이터가 보이는지 확인

### Vercel Preview 환경 확인

1. Vercel 대시보드 → **Deployments** 탭
2. Preview 배포 선택 (develop 브랜치)
3. **"Visit"** 버튼 클릭하여 개발 사이트 접속
4. 개발 DB 데이터가 보이는지 확인

---

## 🔍 환경 변수 확인 스크립트

로컬에서 환경 변수를 확인하려면:

```bash
npm run check:env
```

이 스크립트는 `.env.local` 파일의 환경 변수를 확인합니다.

---

## ⚠️ 주의사항

### 1. `.env.local`은 로컬에서만 사용

- ✅ 로컬 개발: `.env.local` 사용
- ❌ Vercel 배포: `.env.local` 무시됨

### 2. Vercel 환경 변수는 대시보드에서만 관리

- ✅ Vercel 대시보드에서 설정
- ❌ Git에 커밋하지 않음
- ❌ 코드에 하드코딩하지 않음

### 3. 운영 DB URL은 안전하게 관리

- ✅ Vercel Production 환경 변수에만 저장
- ✅ `.env.local`에는 개발 DB URL만 저장
- ✅ 절대 Git에 커밋하지 않음

### 4. 환경 변수 변경 후 재배포

Vercel 환경 변수를 변경한 후:
- 자동으로 재배포되지 않을 수 있음
- **Deployments** 탭에서 최신 배포 선택
- **"Redeploy"** 버튼 클릭하여 재배포

---

## 📊 환경 변수 매핑 정리

| 환경 | DATABASE_URL | 토스페이먼츠 키 | 설정 위치 |
|------|-------------|----------------|----------|
| 로컬 개발 | 개발 DB | 테스트 키 | `.env.local` |
| Vercel Preview (develop) | 개발 DB | 테스트 키 | Vercel Preview 환경 변수 |
| Vercel Production (main) | 운영 DB | 운영 키 | Vercel Production 환경 변수 |

---

## 🆘 문제 해결

### 문제: 로컬에서 운영 DB를 사용하고 있는 것 같아요

**원인**: `.env.local`에 운영 DB URL이 설정되어 있음

**해결**:
1. `.env.local` 파일 확인
2. `DATABASE_URL`이 개발 DB URL인지 확인
3. 개발 DB URL로 변경

### 문제: Vercel 배포 후 운영 DB가 아닌 개발 DB를 사용하고 있어요

**원인**: Vercel Production 환경 변수에 개발 DB URL이 설정되어 있음

**해결**:
1. Vercel 대시보드 → Settings → Environment Variables
2. Production 환경의 `DATABASE_URL` 확인
3. 운영 DB URL로 변경
4. 재배포

### 문제: 환경 변수가 적용되지 않아요

**원인**: 환경 변수 변경 후 재배포하지 않음

**해결**:
1. Vercel 대시보드 → Deployments
2. 최신 배포 선택
3. **"Redeploy"** 버튼 클릭

---

## 📚 요약

1. **`.env.local`**: 로컬 개발용, 개발 DB URL 설정
2. **Vercel Production 환경 변수**: 운영 서버용, 운영 DB URL 설정
3. **Vercel Preview 환경 변수**: 개발 서버용, 개발 DB URL 설정
4. **각 환경은 완전히 분리**되어 있어 서로 영향을 주지 않음

이제 안심하고 `.env.local`에 개발 DB URL을 설정하세요! 🎉
