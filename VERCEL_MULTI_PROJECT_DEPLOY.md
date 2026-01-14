# Vercel 여러 프로젝트 배포 가이드

## 📋 개요

하나의 로컬 프로젝트를 두 개의 Vercel 프로젝트에 배포하는 방법입니다.

- `npm run deploy:prod` → 운영 서버 (`mapo939`)
- `npm run deploy:dev` → 개발 서버 (`mapo939-dev`)

---

## ⚠️ 중요: 환경 변수 보호

`vercel link` 명령어는 자동으로 Vercel 프로젝트의 환경 변수를 `.env.local` 파일에 다운로드합니다. 이는 로컬 개발 환경 변수를 덮어쓸 수 있으므로, 배포 스크립트가 자동으로 `.env.local`을 백업하고 복원합니다.

---

## 🚀 사용 방법

### 운영 서버 배포

```bash
npm run deploy:prod
```

### 개발 서버 배포

```bash
npm run deploy:dev
```

---

## 📝 스크립트 동작 방식

`scripts/deploy-vercel.sh` 스크립트는 다음 순서로 동작합니다:

1. **`.env.local` 백업**: 기존 `.env.local` 파일을 `.env.local.backup`으로 백업
2. **프로젝트 연결**: `vercel link -p 프로젝트이름 -y` 실행
3. **`.env.local` 복원**: 백업한 파일을 다시 복원
4. **배포**: `vercel --prod` 실행

---

## 🔧 Vercel 프로젝트 설정

### 운영 서버 프로젝트 (`mapo939`)

Vercel 대시보드 → 프로젝트 선택 (`mapo939`) → **Settings** → **Environment Variables**:

```
Production:
- DATABASE_URL = 운영_DB_URL
- NEXT_PUBLIC_TOSS_PAYMENTS_WIDGET_CLIENT_KEY = 운영_클라이언트_키
- TOSS_PAYMENTS_WIDGET_SECRET_KEY = 운영_시크릿_키
```

### 개발 서버 프로젝트 (`mapo939-dev`)

Vercel 대시보드 → 프로젝트 선택 (`mapo939-dev`) → **Settings** → **Environment Variables**:

```
Production:
- DATABASE_URL = 개발_DB_URL
- NEXT_PUBLIC_TOSS_PAYMENTS_WIDGET_CLIENT_KEY = 테스트_클라이언트_키
- TOSS_PAYMENTS_WIDGET_SECRET_KEY = 테스트_시크릿_키
```

---

## ⚠️ 주의사항

### 1. 환경 변수는 Vercel 대시보드에서 관리

- 로컬 `.env.local` 파일은 **로컬 개발용**입니다.
- Vercel 배포 시에는 **Vercel 대시보드의 환경 변수**가 사용됩니다.
- 배포 스크립트는 로컬 `.env.local`을 보호하기 위해 백업/복원합니다.

### 2. 프로젝트 이름 확인

프로젝트 이름은 Vercel 대시보드의 프로젝트 이름과 정확히 일치해야 합니다.

**확인 방법**:
1. Vercel 대시보드 접속
2. 프로젝트 목록 확인
3. 프로젝트 이름 확인 (URL에서도 확인 가능: `vercel.com/프로젝트이름`)

### 3. 빌드 에러 해결

빌드 에러가 발생하면:

1. **환경 변수 확인**: Vercel 대시보드에서 필요한 환경 변수가 모두 설정되어 있는지 확인
2. **로컬 빌드 테스트**: `npm run build`로 로컬에서 빌드가 성공하는지 확인
3. **Vercel 빌드 로그 확인**: Vercel 대시보드 → Deployments → 실패한 배포 → Build Logs 확인

---

## 🔍 문제 해결

### 문제: `.env.local`이 덮어써짐

**원인**: `vercel link`가 자동으로 환경 변수를 다운로드합니다.

**해결**: 배포 스크립트가 자동으로 백업/복원하므로 문제없습니다. 만약 수동으로 `vercel link`를 실행했다면:

```bash
# .env.local 복원 (백업이 있다면)
cp .env.local.backup .env.local
```

### 문제: 빌드 에러 발생

**원인**: Vercel 대시보드에 환경 변수가 없거나 잘못 설정됨.

**해결**:
1. Vercel 대시보드 → 프로젝트 → Settings → Environment Variables 확인
2. 필요한 환경 변수가 모두 설정되어 있는지 확인
3. Production 환경에 설정되어 있는지 확인

### 문제: 프로젝트를 찾을 수 없음

**원인**: 프로젝트 이름이 잘못되었거나 존재하지 않음.

**해결**:
1. Vercel 대시보드에서 프로젝트 이름 확인
2. `package.json`의 스크립트에서 프로젝트 이름 확인
3. 프로젝트가 존재하는지 확인

---

## 📚 참고 자료

- [Vercel CLI Documentation](https://vercel.com/docs/cli)
- [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables)
- [Vercel Multiple Projects](https://vercel.com/docs/monorepos)
