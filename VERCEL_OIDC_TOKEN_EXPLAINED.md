# VERCEL_OIDC_TOKEN 설명

## 📋 VERCEL_OIDC_TOKEN이란?

`VERCEL_OIDC_TOKEN`은 **Vercel CLI가 자동으로 생성하는 OIDC(OpenID Connect) 인증 토큰**입니다.

### 특징:
- ✅ **Vercel CLI가 자동 생성**: `vercel link` 또는 `vercel env pull` 실행 시 자동으로 생성
- ✅ **단기 토큰**: 짧은 수명을 가진 임시 인증 토큰
- ✅ **Vercel 배포 시에만 사용**: Vercel 서버에서 빌드/배포할 때만 필요
- ❌ **로컬 개발에는 불필요**: 로컬에서 `npm run dev` 실행 시 필요 없음

---

## 🔍 왜 `.env.local`에 있나요?

`vercel link` 명령어를 실행하면:
1. Vercel 프로젝트와 로컬 디렉토리를 연결
2. **자동으로 `vercel env pull` 실행** (환경 변수 다운로드)
3. Vercel 대시보드의 환경 변수를 `.env.local`에 다운로드
4. `VERCEL_OIDC_TOKEN`도 함께 다운로드됨

---

## ❓ 로컬 개발에 필요한가요?

**아니요. 필요 없습니다.**

### 로컬 개발에 필요한 환경 변수:
```bash
# 필수
DATABASE_URL="개발_DB_URL"
NEXT_PUBLIC_TOSS_PAYMENTS_WIDGET_CLIENT_KEY="테스트_클라이언트_키"
TOSS_PAYMENTS_WIDGET_SECRET_KEY="테스트_시크릿_키"

# 선택적
SOURCE_DATABASE_URL="소스_DB_URL"
TARGET_DATABASE_URL="타겟_DB_URL"
```

### Vercel 배포 시에만 필요한 환경 변수:
```bash
VERCEL_OIDC_TOKEN="..."  # Vercel이 자동으로 생성
BLOB_READ_WRITE_TOKEN="..."  # Vercel Blob 사용 시
```

---

## 🧹 .env.local 정리

`.env.local` 파일에서 다음 항목들을 **제거해도 됩니다**:

```bash
# 제거해도 되는 항목
VERCEL_OIDC_TOKEN="..."
BLOB_READ_WRITE_TOKEN="..."  # Vercel Blob을 사용하지 않는다면
```

### 정리된 .env.local 예시:

```bash
# 로컬 개발용 환경 변수
DATABASE_URL="개발_DB_URL"
NEXT_PUBLIC_TOSS_PAYMENTS_WIDGET_CLIENT_KEY="테스트_클라이언트_키"
TOSS_PAYMENTS_WIDGET_SECRET_KEY="테스트_시크릿_키"

# 선택적: DB 복사 스크립트용
SOURCE_DATABASE_URL="소스_DB_URL"
TARGET_DATABASE_URL="타겟_DB_URL"
```

---

## 📝 VERCEL_OIDC_TOKEN의 용도

### Vercel 서버에서:
- **빌드 시**: Vercel이 각 빌드마다 새로운 OIDC 토큰 생성
- **함수 실행 시**: `x-vercel-oidc-token` 헤더로 전달
- **보안**: 장기 인증 정보 대신 단기 토큰 사용

### 로컬 개발에서:
- **사용 안 함**: 로컬 개발 시 Vercel 서버가 아니므로 불필요
- **제거 가능**: `.env.local`에서 제거해도 로컬 개발에 영향 없음

---

## ✅ 결론

1. **`VERCEL_OIDC_TOKEN`은 Vercel CLI가 자동으로 생성**
2. **로컬 개발에는 필요 없음**
3. **`.env.local`에서 제거해도 됨**
4. **Vercel 배포 시에는 Vercel 대시보드의 환경 변수 사용**

---

## 🔒 향후 보호

개선된 배포 스크립트(`scripts/deploy-vercel.sh`)가 이제 자동으로:
- `.env.local` 백업
- Vercel 덮어쓰기 감지
- 자동 복원

따라서 앞으로는 `VERCEL_OIDC_TOKEN`이 `.env.local`에 추가되어도 자동으로 복원됩니다.
