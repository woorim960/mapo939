# 토스페이먼츠 결제 연동 설정 가이드

## 1. 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 생성하고 다음 내용을 추가하세요:

```env
# 토스페이먼츠 결제위젯 키
# 테스트 키 (문서용 - 기본값으로 사용됨)
NEXT_PUBLIC_TOSS_PAYMENTS_WIDGET_CLIENT_KEY=test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm
TOSS_PAYMENTS_WIDGET_SECRET_KEY=test_gsk_docs_OaPz8L5KdmQXkzRz3y47BMw6

# 실제 운영 키 (전자결제 신청 후 발급받은 키로 교체)
# NEXT_PUBLIC_TOSS_PAYMENTS_WIDGET_CLIENT_KEY=your_production_client_key
# TOSS_PAYMENTS_WIDGET_SECRET_KEY=your_production_secret_key
```

### 중요 사항
- `NEXT_PUBLIC_` 접두사가 붙은 변수는 클라이언트(브라우저)에서도 접근 가능합니다
- `TOSS_PAYMENTS_WIDGET_SECRET_KEY`는 서버에서만 사용되므로 `NEXT_PUBLIC_` 접두사를 붙이지 마세요
- `.env.local` 파일은 Git에 커밋하지 마세요 (이미 .gitignore에 포함됨)

## 2. 테스트 키 사용 (현재 설정)

현재는 문서용 테스트 키가 기본값으로 설정되어 있습니다:
- 클라이언트 키: `test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm`
- 시크릿 키: `test_gsk_docs_OaPz8L5KdmQXkzRz3y47BMw6`

이 키로 테스트 결제를 진행할 수 있습니다.

## 3. 실제 운영 키 발급 (선택사항)

실제 결제를 받으려면:

1. 토스페이먼츠 개발자센터(https://developers.tosspayments.com) 접속
2. 가맹점 등록 및 전자결제 신청
3. 결제위젯 연동 키 발급
4. `.env.local`에 실제 키로 교체

## 4. 테스트 결제 방법

테스트 모드에서는 실제 결제가 발생하지 않습니다. 테스트용 카드 정보:
- 카드번호: `1234-5678-9012-3456` (임의의 유효기간, CVC 입력)
- 기타 결제수단도 테스트 모드로 진행 가능

## 5. 결제 흐름

1. 사용자가 아이템 상점에서 "구매하기" 클릭
2. 결제위젯이 표시되고 결제수단 선택
3. 결제 정보 입력 후 "결제하기" 클릭
4. `/watermelon/payment/success` 또는 `/watermelon/payment/fail`로 리다이렉트
5. 서버에서 결제 승인 API 호출
6. 결제 성공 시 아이템이 인벤토리에 추가됨

## 6. 문제 해결

### 결제위젯이 표시되지 않는 경우
- `.env.local` 파일이 프로젝트 루트에 있는지 확인
- `NEXT_PUBLIC_TOSS_PAYMENTS_WIDGET_CLIENT_KEY` 값이 올바른지 확인
- 브라우저 콘솔에서 에러 메시지 확인

### 결제 승인 실패하는 경우
- 서버 로그 확인
- `TOSS_PAYMENTS_WIDGET_SECRET_KEY` 값이 올바른지 확인
- 결제 금액이 일치하는지 확인
