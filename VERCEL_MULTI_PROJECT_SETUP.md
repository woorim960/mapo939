# Vercel 여러 프로젝트 연결 가이드

## 📋 목표

하나의 로컬 프로젝트를 두 개의 Vercel 프로젝트에 연결하여:
- `npm run deploy:prod` → 프로젝트 1 (운영 서버)에 배포
- `npm run deploy:dev` → 프로젝트 2 (개발 서버)에 배포

---

## 🎯 방법: `--project` 옵션 사용

Vercel CLI는 `--project` 옵션으로 특정 프로젝트를 지정할 수 있습니다.

### 구조:

```
로컬 프로젝트 (하나)
├── Vercel 프로젝트 1 (운영 서버)
└── Vercel 프로젝트 2 (개발 서버)
```

---

## 📝 단계별 가이드

### 1단계: Vercel에서 두 번째 프로젝트 생성

#### 1-1. Vercel 대시보드 접속
1. https://vercel.com 접속
2. 로그인

#### 1-2. 새 프로젝트 생성 (개발 서버용)
1. **"Add New..."** → **"Project"** 클릭
2. 같은 GitHub 저장소 선택
3. 프로젝트 설정:
   - **Project Name**: `attendance-app-dev` (또는 원하는 이름)
   - **Framework Preset**: Next.js
   - **Root Directory**: `./` (기본값)
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`
4. **"Deploy"** 클릭

#### 1-3. 프로젝트 이름 확인
- 운영 서버 프로젝트 이름 확인 (예: `attendance-app`)
- 개발 서버 프로젝트 이름 확인 (예: `attendance-app-dev`)

---

### 2단계: Vercel CLI로 프로젝트 연결

#### 2-1. 운영 서버 프로젝트 연결 (기존)

```bash
# 프로젝트 루트에서
cd /Users/woorim/Desktop/development/js/attendance-app

# 운영 서버 프로젝트 연결 (기존 프로젝트)
npx vercel link
# → 기존 프로젝트 선택 또는 프로젝트 이름 입력
# → 프로젝트 이름: attendance-app (운영 서버)
```

#### 2-2. 개발 서버 프로젝트 확인

`.vercel/project.json` 파일에 현재 연결된 프로젝트가 저장됩니다.

---

### 3단계: package.json 스크립트 수정

#### 3-1. 현재 스크립트 확인

```json
{
  "scripts": {
    "prod": "npx vercel --prod"
  }
}
```

#### 3-2. 스크립트 수정

```json
{
  "scripts": {
    "deploy:prod": "npx vercel --prod --project=attendance-app",
    "deploy:dev": "npx vercel --prod --project=attendance-app-dev"
  }
}
```

**설명**:
- `--project=프로젝트이름`: 특정 프로젝트 지정
- `--prod`: Production 배포
- 각 스크립트가 다른 Vercel 프로젝트에 배포

---

### 4단계: 환경 변수 설정

#### 4-1. 운영 서버 프로젝트 (attendance-app)

Vercel 대시보드 → 프로젝트 선택 (`attendance-app`) → **Settings** → **Environment Variables**:

```
Production:
- DATABASE_URL = 운영_DB_URL
- NEXT_PUBLIC_TOSS_PAYMENTS_WIDGET_CLIENT_KEY = 운영_클라이언트_키
- TOSS_PAYMENTS_WIDGET_SECRET_KEY = 운영_시크릿_키
```

#### 4-2. 개발 서버 프로젝트 (attendance-app-dev)

Vercel 대시보드 → 프로젝트 선택 (`attendance-app-dev`) → **Settings** → **Environment Variables**:

```
Production:
- DATABASE_URL = 개발_DB_URL
- NEXT_PUBLIC_TOSS_PAYMENTS_WIDGET_CLIENT_KEY = 테스트_클라이언트_키
- TOSS_PAYMENTS_WIDGET_SECRET_KEY = 테스트_시크릿_키
```

---

### 5단계: 배포 테스트

#### 5-1. 운영 서버 배포

```bash
npm run deploy:prod
# → attendance-app 프로젝트에 배포
# → 운영 DB 사용
```

#### 5-2. 개발 서버 배포

```bash
npm run deploy:dev
# → attendance-app-dev 프로젝트에 배포
# → 개발 DB 사용
```

---

## ⚠️ 주의사항

### 1. 프로젝트 이름 확인

`--project` 옵션에 사용하는 프로젝트 이름은 **Vercel 대시보드의 프로젝트 이름**입니다.

**확인 방법**:
1. Vercel 대시보드 접속
2. 프로젝트 목록 확인
3. 프로젝트 이름 확인 (URL에서도 확인 가능: `vercel.com/프로젝트이름`)

---

### 2. GitHub 연결

두 프로젝트 모두 같은 GitHub 저장소에 연결할 수 있지만:
- 각 프로젝트는 **별도의 배포 설정**을 가짐
- **Production 브랜치**를 다르게 설정할 수 있음
- 또는 둘 다 `main` 브랜치를 사용하고 CLI로만 배포

---

### 3. `.vercel` 디렉토리

`.vercel/project.json` 파일에는 **하나의 프로젝트만** 연결됩니다.
- `vercel link` 명령어로 변경 가능
- `--project` 옵션을 사용하면 `.vercel/project.json`이 아닌 명령어 옵션을 우선 사용

---

## 🔄 대안: GitHub 브랜치 기반 배포 (권장)

현재 설정 (GitHub 브랜치 기반)을 유지하는 것이 더 간단할 수 있습니다:

### 현재 방식 (권장):

- **main 브랜치** → 운영 서버 자동 배포
- **develop 브랜치** → 개발 서버 자동 배포 (Preview)

**장점**:
- ✅ 자동 배포
- ✅ Git 워크플로우와 통합
- ✅ 설정 간단

### 여러 프로젝트 방식:

- **프로젝트 1**: `npm run deploy:prod` → 운영 서버
- **프로젝트 2**: `npm run deploy:dev` → 개발 서버

**장점**:
- ✅ 명령어로 직접 배포
- ✅ 프로젝트별로 완전히 분리

**단점**:
- ⚠️ 자동 배포 안 됨 (수동 배포)
- ⚠️ Git 워크플로우와 분리

---

## 📝 권장 방법 선택

### 방법 1: GitHub 브랜치 기반 (현재 방식) - 권장

```bash
# main 브랜치 푸시 → 운영 서버 자동 배포
git checkout main
git push origin main

# develop 브랜치 푸시 → 개발 서버 자동 배포
git checkout develop
git push origin develop
```

**장점**:
- ✅ 자동 배포
- ✅ Git과 통합
- ✅ 현재 이미 설정됨

---

### 방법 2: 여러 프로젝트 연결 (CLI 기반)

```json
{
  "scripts": {
    "deploy:prod": "npx vercel --prod --project=attendance-app",
    "deploy:dev": "npx vercel --prod --project=attendance-app-dev"
  }
}
```

**장점**:
- ✅ 명령어로 직접 배포
- ✅ 프로젝트 완전 분리

**단점**:
- ⚠️ 자동 배포 안 됨
- ⚠️ 수동 배포 필요

---

## ✅ 체크리스트

여러 프로젝트 설정 완료 확인:

- [ ] Vercel에서 두 번째 프로젝트 생성했는가?
- [ ] 프로젝트 이름 확인했는가?
- [ ] `package.json`에 스크립트 추가했는가?
- [ ] 각 프로젝트에 환경 변수 설정했는가?
- [ ] `deploy:prod` 테스트했는가?
- [ ] `deploy:dev` 테스트했는가?

---

## 🎯 최종 권장

**현재 GitHub 브랜치 기반 방식을 유지**하는 것을 권장합니다:
- ✅ 자동 배포
- ✅ Git과 통합
- ✅ 설정 간단

하지만 **명령어로 직접 배포**하고 싶다면 여러 프로젝트 연결 방식을 사용할 수 있습니다.

어떤 방식을 선호하시나요? 🎉
