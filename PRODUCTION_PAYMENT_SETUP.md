# 운영 결제 연동 가이드

## 📋 현재 상태

- ✅ 개발 환경: 테스트 키 사용 (결제 테스트만 가능)
- ❌ 운영 환경: 테스트 키 사용 (실제 결제 불가)
- 🎯 목표: 운영 환경에서 실제 결제 가능하도록 설정

---

## 🎯 단계별 가이드

### 1단계: 토스페이먼츠 운영 키 발급

#### 1-1. 토스페이먼츠 개발자센터 접속
1. 브라우저에서 https://developers.tosspayments.com 접속
2. 로그인 (토스페이먼츠 계정으로 로그인)

#### 1-2. 운영 키 발급
1. **대시보드** → **내 서비스** 선택
2. 운영용 서비스 선택 (또는 새로 생성)
3. **결제위젯** → **연동** 탭
4. **연동 키** 섹션에서 다음 키들을 확인:
   - **클라이언트 키 (Client Key)**: `live_gck_...` 형식
   - **시크릿 키 (Secret Key)**: `live_gsk_...` 형식

#### 1-3. 키 복사
운영 키를 안전하게 복사해두세요:
- 클라이언트 키: `live_gck_...`
- 시크릿 키: `live_gsk_...`

**⚠️ 중요**: 시크릿 키는 절대 공개하지 마세요!

---

### 2단계: Vercel 환경 변수 설정

#### 2-1. Vercel 대시보드 접속
1. https://vercel.com 접속
2. 로그인
3. 프로젝트 선택

#### 2-2. Production 환경 변수 업데이트

**Settings** → **Environment Variables** 탭으로 이동

**기존 테스트 키를 운영 키로 변경**:

1. **`NEXT_PUBLIC_TOSS_PAYMENTS_WIDGET_CLIENT_KEY` 수정**:
   - Production 환경 선택
   - 기존 값 (테스트 키) 선택
   - **"Edit"** 클릭
   - Value: `live_gck_...` (운영 클라이언트 키)
   - Environment: ✅ **Production**만 체크
   - **"Save"** 클릭

2. **`TOSS_PAYMENTS_WIDGET_SECRET_KEY` 수정**:
   - Production 환경 선택
   - 기존 값 (테스트 키) 선택
   - **"Edit"** 클릭
   - Value: `live_gsk_...` (운영 시크릿 키)
   - Environment: ✅ **Production**만 체크
   - **"Save"** 클릭

#### 2-3. Preview 환경 변수 확인 (유지)

Preview 환경 (개발 서버)은 테스트 키를 유지:
- `NEXT_PUBLIC_TOSS_PAYMENTS_WIDGET_CLIENT_KEY`: 테스트 키 (유지)
- `TOSS_PAYMENTS_WIDGET_SECRET_KEY`: 테스트 키 (유지)
- Environment: ✅ **Preview**만 체크

---

### 3단계: 환경 변수 확인

#### 3-1. Vercel 대시보드에서 확인

**Settings** → **Environment Variables**에서 다음이 설정되었는지 확인:

```
Production 환경:
✅ NEXT_PUBLIC_TOSS_PAYMENTS_WIDGET_CLIENT_KEY = live_gck_... (운영 키)
✅ TOSS_PAYMENTS_WIDGET_SECRET_KEY = live_gsk_... (운영 키)

Preview 환경:
✅ NEXT_PUBLIC_TOSS_PAYMENTS_WIDGET_CLIENT_KEY = test_gck_... (테스트 키)
✅ TOSS_PAYMENTS_WIDGET_SECRET_KEY = test_gsk_... (테스트 키)
```

---

### 4단계: 운영 서버 배포

#### 4-1. main 브랜치에 푸시하여 Production 배포

```bash
# main 브랜치로 전환
git checkout main

# 변경사항 커밋 및 푸시 (필요시)
git add .
git commit -m "chore: 운영 결제 키 설정 완료"
git push origin main
```

#### 4-2. Vercel 배포 확인

1. Vercel 대시보드 → **Deployments** 탭
2. Production 배포가 시작되는지 확인
3. 배포 완료 후 운영 사이트 접속

---

### 5단계: 운영 서버 확인

#### 5-1. 운영 사이트 접속

1. 운영 사이트 URL 접속
2. 아이템 상점 열기
3. 결제창이 표시되는지 확인

#### 5-2. 실제 결제 테스트 (소액)

**⚠️ 주의**: 실제 결제가 발생합니다!

1. 가장 저렴한 아이템 선택
2. 실제 카드 정보 입력
3. 결제 진행
4. 결제 완료 확인

**테스트 카드 정보 (실제 결제용)**:
- 실제 본인 명의 카드 사용
- 실제 금액이 결제됨
- 환불 가능하지만 주의해서 테스트

---

### 6단계: 결제 확인

#### 6-1. 토스페이먼츠 대시보드에서 확인

1. 토스페이먼츠 개발자센터 접속
2. **거래** → **결제** 탭
3. 방금 진행한 결제 내역 확인
4. 결제 상태가 "완료"인지 확인

#### 6-2. 애플리케이션에서 확인

1. 운영 사이트 접속
2. 플레이어 인벤토리 확인
3. 구매한 아이템이 추가되었는지 확인
4. 결제 내역 확인

---

## ⚠️ 주의사항

### 1. 운영 키 보안

- ✅ **시크릿 키는 절대 공개하지 마세요**
- ✅ Vercel 환경 변수에만 저장
- ✅ `.env.local`에는 테스트 키만 저장
- ✅ Git에 커밋하지 않음 (이미 `.gitignore`에 포함)

### 2. 테스트 키와 운영 키 구분

- **테스트 키**: `test_gck_...`, `test_gsk_...`
  - 개발/테스트용
  - 실제 결제 발생 안 함
  - Preview 환경에서 사용

- **운영 키**: `live_gck_...`, `live_gsk_...`
  - 실제 결제용
  - 실제 결제 발생
  - Production 환경에서만 사용

### 3. 환경 변수 설정 확인

- ✅ Production 환경에만 운영 키 설정
- ✅ Preview 환경에는 테스트 키 유지
- ✅ 환경 변수 변경 후 재배포 필요

### 4. 실제 결제 테스트

- ⚠️ 실제 금액이 결제됩니다
- ⚠️ 테스트 시 소액으로 진행
- ⚠️ 환불은 가능하지만 주의
- ✅ 테스트 완료 후 실제 운영 시작

---

## 📊 환경별 키 설정 정리

### 로컬 개발 환경 (`.env.local`):

```bash
# 테스트 키 사용
NEXT_PUBLIC_TOSS_PAYMENTS_WIDGET_CLIENT_KEY="test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm"
TOSS_PAYMENTS_WIDGET_SECRET_KEY="test_gsk_docs_OaPz8L5KdmQXkzRz3y47BMw6"
```

### Vercel Preview 환경 (개발 서버):

```
NEXT_PUBLIC_TOSS_PAYMENTS_WIDGET_CLIENT_KEY = test_gck_... (테스트 키)
TOSS_PAYMENTS_WIDGET_SECRET_KEY = test_gsk_... (테스트 키)
Environment: Preview
```

### Vercel Production 환경 (운영 서버):

```
NEXT_PUBLIC_TOSS_PAYMENTS_WIDGET_CLIENT_KEY = live_gck_... (운영 키)
TOSS_PAYMENTS_WIDGET_SECRET_KEY = live_gsk_... (운영 키)
Environment: Production
```

---

## 🔍 키 형식 확인

### 테스트 키:
- 클라이언트 키: `test_gck_docs_...` 또는 `test_gck_...`
- 시크릿 키: `test_gsk_docs_...` 또는 `test_gsk_...`

### 운영 키:
- 클라이언트 키: `live_gck_...`
- 시크릿 키: `live_gsk_...`

**중요**: `live_`로 시작하는 키만 실제 결제가 가능합니다!

---

## ✅ 체크리스트

운영 결제 연동 완료 확인:

- [ ] 토스페이먼츠에서 운영 키 발급받았는가?
- [ ] Vercel Production 환경 변수에 운영 키가 설정되었는가?
- [ ] Vercel Preview 환경 변수는 테스트 키인가?
- [ ] 운영 서버가 배포되었는가?
- [ ] 운영 사이트에서 결제창이 표시되는가?
- [ ] 실제 결제 테스트가 성공했는가?
- [ ] 토스페이먼츠 대시보드에서 결제 내역이 확인되는가?
- [ ] 애플리케이션에서 구매한 아이템이 정상적으로 추가되었는가?

---

## 🆘 문제 해결

### 문제: 운영 사이트에서 결제창이 표시되지 않음

**원인**: 환경 변수가 제대로 설정되지 않았거나 재배포되지 않음

**해결**:
1. Vercel 대시보드에서 환경 변수 확인
2. Production 환경에 운영 키가 설정되었는지 확인
3. 재배포 (최신 배포 선택 → "Redeploy")

### 문제: 결제가 실패함

**원인**:
- 운영 키가 잘못 설정됨
- 테스트 키를 운영 환경에서 사용

**해결**:
1. Vercel 환경 변수에서 키 확인
2. `live_`로 시작하는 운영 키인지 확인
3. 토스페이먼츠 대시보드에서 키 확인

### 문제: 결제는 성공했는데 아이템이 추가되지 않음

**원인**: 결제 승인 API 오류

**해결**:
1. 서버 로그 확인
2. `TOSS_PAYMENTS_WIDGET_SECRET_KEY`가 올바른지 확인
3. 결제 승인 API (`/api/watermelon/payments/approve`) 확인

---

## 📚 추가 리소스

- [토스페이먼츠 개발자센터](https://developers.tosspayments.com)
- [토스페이먼츠 결제위젯 문서](https://docs.tosspayments.com/guides/widget)
- [Vercel 환경 변수 설정](https://vercel.com/docs/concepts/projects/environment-variables)

---

## ✅ 요약

1. **토스페이먼츠에서 운영 키 발급**
2. **Vercel Production 환경 변수에 운영 키 설정**
3. **운영 서버 배포**
4. **실제 결제 테스트 (소액)**
5. **결제 확인**

이제 운영 환경에서 실제 결제가 가능합니다! 🎉
