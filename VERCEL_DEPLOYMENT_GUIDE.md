# Vercel 브랜치별 자동 배포 설정 가이드 (A-Z)

## 📋 목표

- **`develop` 브랜치** → 개발 서버 자동 배포
- **`main` 브랜치** → 운영 서버 자동 배포

---

## 🎯 전체 흐름도

```
GitHub Repository
├── develop 브랜치 (푸시) → Vercel Preview 배포 → 개발 DB 사용
└── main 브랜치 (푸시) → Vercel Production 배포 → 운영 DB 사용
```

---

## 📝 단계별 가이드

### 1단계: Neon에서 개발 데이터베이스 생성

#### 1-1. Neon 대시보드 접속
1. 브라우저에서 https://console.neon.tech 접속
2. 로그인 (GitHub 계정으로 로그인 가능)

#### 1-2. 새 프로젝트 생성
1. 대시보드에서 **"New Project"** 또는 **"Create Project"** 버튼 클릭
2. 프로젝트 설정:
   - **Project Name**: `attendance-app-dev` (또는 원하는 이름)
   - **Region**: `Asia Pacific (Seoul)` 또는 `Asia Pacific (Singapore)` 선택
   - **PostgreSQL Version**: 최신 버전 선택 (기본값)
3. **"Create Project"** 버튼 클릭

#### 1-3. 데이터베이스 연결 정보 확인
1. 프로젝트 생성 후 대시보드에서 **"Connection Details"** 또는 **"Connection String"** 확인
2. 연결 문자열 예시:
   ```
   postgresql://username:password@ep-xxx-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```
3. **이 연결 문자열을 복사해두세요** (다음 단계에서 사용)

#### 1-4. 개발 DB에 마이그레이션 적용 (로컬에서)
```bash
# 프로젝트 루트에서
# .env.local 파일 생성 (아직 없다면)
touch .env.local

# .env.local에 개발 DB URL 추가
echo 'DATABASE_URL="복사한_개발_DB_연결_문자열"' >> .env.local

# 마이그레이션 적용
npm run db:migrate
```

---

### 2단계: GitHub 브랜치 설정

#### 2-1. 현재 브랜치 확인
```bash
# 현재 브랜치 확인
git branch

# 현재 main 브랜치에 있다면 develop 브랜치 생성
git checkout -b develop

# 또는 이미 develop 브랜치가 있다면
git checkout develop
```

#### 2-2. develop 브랜치를 GitHub에 푸시
```bash
# develop 브랜치를 원격 저장소에 푸시
git push -u origin develop
```

#### 2-3. GitHub에서 브랜치 확인
1. GitHub 저장소 페이지 접속
2. 브랜치 드롭다운에서 `main`과 `develop` 브랜치가 모두 보이는지 확인

---

### 3단계: Vercel 프로젝트 설정

#### 3-1. Vercel 대시보드 접속
1. 브라우저에서 https://vercel.com 접속
2. 로그인 (GitHub 계정으로 로그인 가능)

#### 3-2. 기존 프로젝트 확인 또는 새 프로젝트 생성

**기존 프로젝트가 있는 경우:**
1. 대시보드에서 프로젝트 선택
2. **Settings** 탭 클릭

**새 프로젝트를 만드는 경우:**
1. 대시보드에서 **"Add New..."** → **"Project"** 클릭
2. GitHub 저장소 선택
3. 프로젝트 설정:
   - **Project Name**: `attendance-app` (또는 원하는 이름)
   - **Framework Preset**: Next.js (자동 감지됨)
   - **Root Directory**: `./` (기본값)
   - **Build Command**: `npm run build` (기본값)
   - **Output Directory**: `.next` (기본값)
   - **Install Command**: `npm install` (기본값)
4. **"Deploy"** 버튼 클릭

#### 3-3. Git 연결 확인
1. **Settings** → **Git** 탭 확인
2. 연결된 GitHub 저장소가 올바른지 확인
3. 필요시 **"Disconnect"** 후 다시 연결

---

### 4단계: Vercel 배포 설정 (브랜치별 배포)

#### 4-1. Production 브랜치 설정
1. **Settings** → **Git** 탭으로 이동
2. **Production Branch** 섹션에서:
   - **Production Branch**: `main` 선택
   - 이 설정은 `main` 브랜치에 푸시하면 Production 배포가 됨을 의미

#### 4-2. Preview 배포 설정
1. **Settings** → **Git** 탭에서 계속
2. **Preview Deployments** 섹션 확인:
   - ✅ **"Automatically deploy every push to a Preview Deployment"** 체크되어 있는지 확인
   - 이 설정이 활성화되면 모든 브랜치(develop 포함)에 푸시하면 Preview 배포가 됨

#### 4-3. 브랜치별 배포 확인
- **main 브랜치 푸시** → Production 배포 (운영 서버)
- **develop 브랜치 푸시** → Preview 배포 (개발 서버)
- **다른 브랜치 푸시** → Preview 배포

---

### 5단계: Vercel 환경 변수 설정

#### 5-1. 환경 변수 설정 페이지 접속
1. **Settings** → **Environment Variables** 탭 클릭

#### 5-2. Production 환경 변수 설정 (운영 서버)

**운영 DB URL 설정:**
1. **"Add New"** 버튼 클릭
2. 입력:
   - **Key**: `DATABASE_URL`
   - **Value**: 기존 운영 DB 연결 문자열 (현재 사용 중인 DB)
   - **Environment**: ✅ **Production**만 체크
3. **"Save"** 버튼 클릭

**토스페이먼츠 운영 키 설정:**
1. **"Add New"** 버튼 클릭
2. 입력:
   - **Key**: `NEXT_PUBLIC_TOSS_PAYMENTS_WIDGET_CLIENT_KEY`
   - **Value**: 운영 클라이언트 키 (live_gck_...)
   - **Environment**: ✅ **Production**만 체크
3. **"Save"** 버튼 클릭

4. **"Add New"** 버튼 클릭
5. 입력:
   - **Key**: `TOSS_PAYMENTS_WIDGET_SECRET_KEY`
   - **Value**: 운영 시크릿 키 (live_gsk_...)
   - **Environment**: ✅ **Production**만 체크
6. **"Save"** 버튼 클릭

#### 5-3. Preview 환경 변수 설정 (개발 서버)

**개발 DB URL 설정:**
1. **"Add New"** 버튼 클릭
2. 입력:
   - **Key**: `DATABASE_URL`
   - **Value**: 새로 만든 개발 DB 연결 문자열
   - **Environment**: ✅ **Preview**만 체크
3. **"Save"** 버튼 클릭

**토스페이먼츠 테스트 키 설정:**
1. **"Add New"** 버튼 클릭
2. 입력:
   - **Key**: `NEXT_PUBLIC_TOSS_PAYMENTS_WIDGET_CLIENT_KEY`
   - **Value**: 테스트 클라이언트 키 (test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm)
   - **Environment**: ✅ **Preview**만 체크
3. **"Save"** 버튼 클릭

4. **"Add New"** 버튼 클릭
5. 입력:
   - **Key**: `TOSS_PAYMENTS_WIDGET_SECRET_KEY`
   - **Value**: 테스트 시크릿 키 (test_gsk_docs_OaPz8L5KdmQXkzRz3y47BMw6)
   - **Environment**: ✅ **Preview**만 체크
6. **"Save"** 버튼 클릭

#### 5-4. 환경 변수 확인
설정 완료 후 다음과 같이 표시되어야 합니다:

```
DATABASE_URL
  Production: postgresql://... (운영 DB)
  Preview: postgresql://... (개발 DB)

NEXT_PUBLIC_TOSS_PAYMENTS_WIDGET_CLIENT_KEY
  Production: live_gck_... (운영 키)
  Preview: test_gck_docs_... (테스트 키)

TOSS_PAYMENTS_WIDGET_SECRET_KEY
  Production: live_gsk_... (운영 키)
  Preview: test_gsk_docs_... (테스트 키)
```

---

### 6단계: 기존 DB 데이터를 개발 DB로 복사 (선택사항)

개발 환경에서도 실제 데이터를 테스트하고 싶다면:

#### 6-1. 로컬에서 데이터 복사 스크립트 실행
```bash
# .env.local에 추가
SOURCE_DATABASE_URL="기존_운영_DB_URL"
TARGET_DATABASE_URL="새_개발_DB_URL"

# 데이터 복사
npm run db:copy
```

---

### 7단계: 배포 테스트

#### 7-1. develop 브랜치에 푸시하여 개발 서버 배포 테스트

```bash
# develop 브랜치로 전환
git checkout develop

# 간단한 변경사항 만들기 (예: 주석 추가)
# 예: README.md에 주석 추가

# 커밋 및 푸시
git add .
git commit -m "test: develop 브랜치 배포 테스트"
git push origin develop
```

#### 7-2. Vercel에서 배포 확인
1. Vercel 대시보드 → **Deployments** 탭
2. 새로운 배포가 시작되는지 확인
3. 배포 상태 확인:
   - **Building** → 빌드 중
   - **Ready** → 배포 완료
4. 배포 완료 후 **"Visit"** 버튼 클릭하여 개발 서버 접속
5. URL 확인:
   - Preview 배포 URL은 `프로젝트명-랜덤문자.vercel.app` 형식
   - 또는 `프로젝트명-git-develop-계정명.vercel.app` 형식

#### 7-3. 개발 서버에서 DB 연결 확인
1. 개발 서버 접속
2. 데이터가 개발 DB에서 로드되는지 확인
3. 콘솔에서 에러가 없는지 확인

#### 7-4. main 브랜치에 푸시하여 운영 서버 배포 테스트

```bash
# main 브랜치로 전환
git checkout main

# develop 브랜치의 변경사항을 main에 머지 (또는 직접 변경)
git merge develop
# 또는
# 간단한 변경사항 만들기

# 커밋 및 푸시
git add .
git commit -m "test: main 브랜치 배포 테스트"
git push origin main
```

#### 7-5. Vercel에서 Production 배포 확인
1. Vercel 대시보드 → **Deployments** 탭
2. 새로운 Production 배포가 시작되는지 확인
3. 배포 완료 후 운영 서버 접속
4. 데이터가 운영 DB에서 로드되는지 확인

---

### 8단계: 커스텀 도메인 설정 (선택사항)

#### 8-1. 개발 서버 도메인 설정
1. **Settings** → **Domains** 탭
2. Preview 배포에 커스텀 도메인 추가:
   - **Domain**: `dev.yourdomain.com` (예시)
   - **Git Branch**: `develop` 선택
3. DNS 설정 안내에 따라 DNS 레코드 추가

#### 8-2. 운영 서버 도메인 설정
1. **Settings** → **Domains** 탭
2. Production 배포에 커스텀 도메인 추가:
   - **Domain**: `yourdomain.com` (예시)
   - Production 배포에 자동 연결됨

---

## 🔍 확인 사항

### ✅ 체크리스트

배포 설정 완료 확인:

- [ ] Neon에서 개발 DB가 생성되었는가?
- [ ] 개발 DB에 마이그레이션이 적용되었는가?
- [ ] GitHub에 `develop` 브랜치가 있는가?
- [ ] Vercel 프로젝트가 GitHub와 연결되었는가?
- [ ] Vercel Production 브랜치가 `main`으로 설정되었는가?
- [ ] Vercel Preview 배포가 활성화되었는가?
- [ ] Production 환경 변수가 설정되었는가? (운영 DB, 운영 키)
- [ ] Preview 환경 변수가 설정되었는가? (개발 DB, 테스트 키)
- [ ] develop 브랜치 푸시 시 Preview 배포가 되는가?
- [ ] main 브랜치 푸시 시 Production 배포가 되는가?

---

## 🚀 일상적인 워크플로우

### 개발 중:

```bash
# 1. develop 브랜치에서 작업
git checkout develop

# 2. 코드 수정
# ... 코드 작성 ...

# 3. 커밋 및 푸시
git add .
git commit -m "feat: 새로운 기능 추가"
git push origin develop

# 4. Vercel에서 자동으로 개발 서버 배포됨
# 5. 개발 서버에서 테스트
```

### 운영 배포:

```bash
# 1. develop 브랜치의 변경사항을 main에 머지
git checkout main
git merge develop

# 2. main 브랜치에 푸시
git push origin main

# 3. Vercel에서 자동으로 운영 서버 배포됨
```

---

## ⚠️ 주의사항

### 1. 환경 변수 관리
- **절대 Production 환경 변수를 Preview에 설정하지 마세요**
- **절대 Preview 환경 변수를 Production에 설정하지 마세요**
- 환경 변수 변경 후 배포가 자동으로 재시작됩니다

### 2. 데이터베이스 분리
- **개발 서버는 항상 개발 DB를 사용해야 합니다**
- **운영 서버는 항상 운영 DB를 사용해야 합니다**
- 실수로 개발 서버에서 운영 DB를 사용하면 운영 데이터가 손상될 수 있습니다

### 3. 브랜치 관리
- **develop 브랜치**: 개발 및 테스트용
- **main 브랜치**: 운영 배포용
- main 브랜치에 직접 푸시하지 말고, develop에서 머지하는 것을 권장합니다

### 4. 마이그레이션 관리
- **개발 DB에서 먼저 마이그레이션 테스트**
- 테스트 완료 후 운영 DB에 적용
- 운영 DB 마이그레이션은 신중하게 진행

---

## 🆘 문제 해결

### 배포가 자동으로 되지 않는 경우:

1. **Vercel Git 연결 확인**
   - Settings → Git 탭에서 연결 상태 확인
   - 필요시 재연결

2. **브랜치 설정 확인**
   - Production Branch가 `main`으로 설정되어 있는지 확인
   - Preview Deployments가 활성화되어 있는지 확인

3. **GitHub Webhook 확인**
   - GitHub 저장소 → Settings → Webhooks
   - Vercel webhook이 활성화되어 있는지 확인

### 환경 변수가 적용되지 않는 경우:

1. **환경 변수 설정 확인**
   - Vercel → Settings → Environment Variables
   - 올바른 Environment (Production/Preview)에 설정되었는지 확인

2. **배포 재시작**
   - Deployments 탭에서 최신 배포 선택
   - "Redeploy" 버튼 클릭

### 데이터베이스 연결 오류:

1. **연결 문자열 확인**
   - Neon 대시보드에서 연결 문자열 복사
   - Vercel 환경 변수에 정확히 입력되었는지 확인

2. **SSL 모드 확인**
   - 연결 문자열에 `?sslmode=require`가 포함되어 있는지 확인

---

## 📚 추가 리소스

- [Vercel Git Integration](https://vercel.com/docs/concepts/git)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Vercel Branch Deployments](https://vercel.com/docs/concepts/deployments/branches)
- [Neon Documentation](https://neon.tech/docs)

---

## ✅ 최종 확인

모든 설정이 완료되면:

1. **develop 브랜치 푸시** → 개발 서버 배포 확인
2. **main 브랜치 푸시** → 운영 서버 배포 확인
3. 각 서버에서 올바른 DB를 사용하는지 확인
4. 각 서버에서 올바른 토스페이먼츠 키를 사용하는지 확인

이제 개발과 운영 환경이 완전히 분리되었습니다! 🎉
