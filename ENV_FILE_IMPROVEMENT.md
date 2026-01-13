# 환경 변수 파일 개선 가이드

## 🎯 문제점

현재 `.env`와 `.env.local` 두 개의 환경 설정 파일이 있어서:
- 환경 변수 우선순위 혼란
- 실수로 운영 DB URL이 `.env`에 있으면 문제 발생
- 어떤 파일을 수정해야 할지 혼란

---

## ✅ 권장 해결 방법

### 방법 1: `.env` 파일 제거 (가장 권장)

**장점**:
- ✅ 파일이 하나만 있어서 혼란 없음
- ✅ 실수로 운영 DB URL을 설정할 위험 감소
- ✅ 간단하고 명확함

**단점**:
- ❌ 없음

**실행 방법**:
1. `.env` 파일 백업 (필요시)
2. `.env` 파일 삭제
3. `.env.local`만 사용

---

### 방법 2: `.env`를 `.env.example`로 변경 (대안)

**장점**:
- ✅ 예시 값을 Git에 커밋 가능
- ✅ 다른 개발자가 참고 가능
- ✅ 실제 값은 `.env.local`에만 존재

**단점**:
- ⚠️ `.env.example`을 `.env`로 복사해야 함 (하지만 불필요)

**실행 방법**:
1. `.env` 파일을 `.env.example`로 변경
2. 실제 값들을 예시 값으로 변경
3. `.env.local`만 사용

---

## 🎯 권장: `.env` 파일 제거

### 이유:

1. **`.env.local`이 이미 있음**:
   - 로컬 개발용 환경 변수
   - Git에 커밋되지 않음 (`.gitignore`에 포함)
   - 실제 값을 저장하는 곳

2. **`.env` 파일의 필요성 낮음**:
   - Next.js는 기본적으로 `.env.local`을 읽음
   - `.env` 파일이 없어도 `.env.local`만으로 충분
   - 두 파일이 있으면 혼란만 증가

3. **안전성 향상**:
   - 파일이 하나만 있으면 실수로 잘못된 파일을 수정할 위험 감소
   - 운영 DB URL을 실수로 설정할 가능성 감소

---

## 📝 실행 단계

### 1단계: `.env` 파일 내용 확인

```bash
# .env 파일 내용 확인
cat .env
```

### 2단계: 필요한 값이 있다면 `.env.local`로 이동

만약 `.env`에 `.env.local`에 없는 설정이 있다면:
1. 해당 설정을 `.env.local`에 복사
2. `.env.local`에 이미 있다면 무시

### 3단계: `.env` 파일 삭제

```bash
# .env 파일 삭제
rm .env
```

### 4단계: `.env.example` 파일 생성 (선택사항)

다른 개발자를 위해 예시 파일 생성:
```bash
# .env.example 파일 생성
cat > .env.example << 'EOF'
# 데이터베이스 연결 URL
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"

# 토스페이먼츠 키
NEXT_PUBLIC_TOSS_PAYMENTS_WIDGET_CLIENT_KEY="your_client_key_here"
TOSS_PAYMENTS_WIDGET_SECRET_KEY="your_secret_key_here"
EOF
```

---

## 🔧 `prisma.config.ts` 개선

`.env` 파일을 제거한 후, `prisma.config.ts`를 더 간단하게 만들 수 있습니다:

### 현재 (`.env.local` 우선순위 보장):

```typescript
import { config } from "dotenv";
config({ path: ".env.local", override: true });
config();

import { defineConfig } from "prisma/config";
// ...
```

### 개선 (더 간단):

```typescript
import "dotenv/config";
import { defineConfig } from "prisma/config";
// ...
```

**이유**:
- `dotenv/config`는 기본적으로 `.env.local`을 먼저 읽음
- `.env` 파일이 없으면 `.env.local`만 읽음
- 더 간단하고 명확함

---

## 📚 Next.js 환경 변수 우선순위

Next.js는 다음 순서로 환경 변수를 읽습니다 (높은 우선순위부터):

1. `.env.local` (항상 로드, Git에 커밋하지 않음)
2. `.env.development`, `.env.production` (환경별)
3. `.env` (기본값, Git에 커밋 가능)

**결론**: `.env.local`만 있어도 충분합니다!

---

## ✅ 체크리스트

`.env` 파일 제거 후 확인:

- [ ] `.env.local`에 모든 필요한 환경 변수가 있나요?
- [ ] 애플리케이션이 정상 작동하나요?
- [ ] `npm run dev`가 정상 작동하나요?
- [ ] `npm run build`가 정상 작동하나요?
- [ ] Prisma 명령어가 정상 작동하나요?

---

## 🎯 최종 권장 구조

```
프로젝트 루트/
├── .env.local          ← 실제 값 (Git에 커밋 안 됨)
├── .env.example        ← 예시 값 (Git에 커밋 가능, 선택사항)
└── .env                ← 제거 권장
```

**`.env.local`만 사용하는 것이 가장 안전하고 명확합니다!** 🎉
