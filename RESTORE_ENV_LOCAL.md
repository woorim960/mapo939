# .env.local 파일 복구 가이드

## ⚠️ 현재 상황

`.env.local` 파일이 Vercel CLI에 의해 덮어써져서 원래 로컬 개발용 환경 변수들이 삭제되었습니다.

현재 `.env.local`에는 Vercel에서 다운로드한 환경 변수만 있습니다:
- `DATABASE_URL` (개발 DB - Vercel에서 다운로드)
- `BLOB_READ_WRITE_TOKEN`
- `VERCEL_OIDC_TOKEN`

## 🔧 필요한 환경 변수

로컬 개발을 위해 다음 환경 변수들이 필요합니다:

```bash
# 데이터베이스
DATABASE_URL="개발_DB_URL"

# Toss Payments (테스트 키)
NEXT_PUBLIC_TOSS_PAYMENTS_WIDGET_CLIENT_KEY="테스트_클라이언트_키"
TOSS_PAYMENTS_WIDGET_SECRET_KEY="테스트_시크릿_키"

# 선택적: DB 복사 스크립트용
SOURCE_DATABASE_URL="소스_DB_URL"  # 운영 DB (선택적)
TARGET_DATABASE_URL="타겟_DB_URL"  # 개발 DB (선택적)
```

## 📝 복구 방법

### 방법 1: 수동으로 환경 변수 추가

`.env.local` 파일을 열고 다음 내용을 추가하세요:

```bash
# 로컬 개발용 환경 변수
DATABASE_URL="개발_DB_URL"
NEXT_PUBLIC_TOSS_PAYMENTS_WIDGET_CLIENT_KEY="테스트_클라이언트_키"
TOSS_PAYMENTS_WIDGET_SECRET_KEY="테스트_시크릿_키"

# Vercel 관련 (필요시 유지)
# BLOB_READ_WRITE_TOKEN="..."
# VERCEL_OIDC_TOKEN="..."
```

### 방법 2: 백업 파일 확인

스크립트가 백업 파일을 생성했을 수 있습니다:

```bash
# 백업 파일 찾기
ls -la .env.local.backup*

# 백업 파일이 있다면 복구
cp .env.local.backup.날짜시간 .env.local
```

### 방법 3: Neon 대시보드에서 DB URL 확인

1. https://console.neon.tech 접속
2. 개발 DB 프로젝트 선택
3. **Connection Details** 또는 **Connection String** 확인
4. `DATABASE_URL`에 복사

### 방법 4: Toss Payments 테스트 키 확인

1. Toss Payments 대시보드 접속
2. 테스트 키 확인
3. `.env.local`에 추가

## ✅ 복구 확인

환경 변수를 복구한 후 확인:

```bash
npm run check:env
```

모든 필수 환경 변수가 설정되어 있으면 성공 메시지가 표시됩니다.

## 🔒 향후 보호

개선된 배포 스크립트(`scripts/deploy-vercel.sh`)가 이제 자동으로 `.env.local`을 보호합니다:
- 배포 전 자동 백업
- Vercel 덮어쓰기 감지
- 자동 복원

## 💡 참고

- **로컬 개발**: `.env.local` 파일의 환경 변수 사용
- **Vercel 배포**: Vercel 대시보드의 환경 변수 사용
- 두 환경은 독립적으로 관리됩니다.
