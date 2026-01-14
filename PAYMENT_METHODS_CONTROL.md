# 토스페이먼츠 결제 수단 제어 가이드

## 📋 답변: 네, 결제 수단을 제어할 수 있습니다!

토스페이먼츠 위젯에 표시되는 결제 방법(토스, 카카오페이 등)은 **토스페이먼츠 관리자 대시보드에서 설정**할 수 있습니다.

---

## 🎯 결제 수단 제어 방법

### 방법 1: 토스페이먼츠 관리자 대시보드에서 설정 (권장)

#### 1-1. 토스페이먼츠 개발자센터 접속
1. https://developers.tosspayments.com 접속
2. 로그인

#### 1-2. 결제 UI 설정
1. **대시보드** → **내 서비스** 선택
2. **결제위젯** → **결제 UI 설정** (또는 **Payment UI Settings**) 탭
3. **결제 UI Variant** 생성 또는 수정:
   - 새 Variant 생성 또는 기존 Variant 선택
   - **결제 수단 선택**:
     - ✅ 토스페이
     - ✅ 카카오페이
     - ✅ 신용/체크카드
     - ✅ 계좌이체
     - ✅ 가상계좌
     - ✅ 휴대폰 소액결제
     - 등 원하는 결제 수단만 선택
   - **Variant Key** 확인 (예: `default`, `custom-variant-1` 등)

#### 1-3. 코드에 Variant Key 적용

`PaymentWidget.tsx`에서 `renderPaymentMethods`에 `variantKey` 옵션 추가:

```typescript
await widget.renderPaymentMethods({
  selector: `#${paymentMethodsId}`,
  variantKey: 'your-variant-key', // 관리자에서 설정한 Variant Key
});
```

---

## 🔧 코드 수정 방법

### 현재 코드:

```typescript
await widget.renderPaymentMethods({
  selector: `#${paymentMethodsId}`,
});
```

### 수정 후:

```typescript
await widget.renderPaymentMethods({
  selector: `#${paymentMethodsId}`,
  variantKey: 'your-variant-key', // 선택사항: 관리자에서 설정한 Variant Key
});
```

**참고**: `variantKey`를 지정하지 않으면 기본 결제 수단이 표시됩니다.

---

## 📊 결제 수단 제어 옵션

### 토스페이먼츠에서 제공하는 결제 수단:

1. **토스페이** (간편결제)
2. **카카오페이** (간편결제)
3. **신용/체크카드**
4. **계좌이체**
5. **가상계좌**
6. **휴대폰 소액결제**
7. **상품권** (문화상품권, 도서상품권 등)
8. **해외결제** (해외 카드)

### 제어 방법:

- ✅ **토스페이먼츠 관리자에서 설정**: 가장 권장되는 방법
- ✅ **Variant Key 사용**: 코드에서 특정 Variant 지정
- ⚠️ **코드로 직접 제어**: SDK에서 지원하는 경우에만 가능

---

## 🎯 실제 사용 예시

### 예시 1: 기본 결제 수단만 표시

토스페이먼츠 관리자에서:
- Variant 생성: `simple-payment`
- 결제 수단 선택: 토스페이, 카카오페이만 활성화

코드:
```typescript
await widget.renderPaymentMethods({
  selector: `#${paymentMethodsId}`,
  variantKey: 'simple-payment',
});
```

### 예시 2: 카드 결제만 표시

토스페이먼츠 관리자에서:
- Variant 생성: `card-only`
- 결제 수단 선택: 신용/체크카드만 활성화

코드:
```typescript
await widget.renderPaymentMethods({
  selector: `#${paymentMethodsId}`,
  variantKey: 'card-only',
});
```

---

## ⚠️ 주의사항

### 1. Variant Key는 관리자에서 생성해야 함

- 코드에 `variantKey`를 지정해도, 관리자에서 해당 Variant를 먼저 생성해야 함
- Variant가 없으면 기본 결제 수단이 표시됨

### 2. 테스트 환경과 운영 환경

- **테스트 환경**: 테스트용 Variant 설정
- **운영 환경**: 운영용 Variant 설정
- 각 환경별로 다른 Variant Key 사용 가능

### 3. 결제 수단별 수수료

- 결제 수단마다 수수료가 다를 수 있음
- 비즈니스 요구사항에 맞게 선택

---

## 🔍 현재 코드 확인

현재 `PaymentWidget.tsx`에서는:

```typescript
await widget.renderPaymentMethods({
  selector: `#${paymentMethodsId}`,
});
```

`variantKey` 옵션이 없으므로, 토스페이먼츠 관리자에서 설정한 **기본 결제 수단**이 표시됩니다.

---

## 📝 요약

### 결제 수단 제어 방법:

1. **토스페이먼츠 관리자 대시보드**:
   - 결제 UI 설정에서 Variant 생성
   - 원하는 결제 수단만 선택
   - Variant Key 확인

2. **코드 수정** (선택사항):
   - `renderPaymentMethods`에 `variantKey` 옵션 추가
   - 특정 Variant를 사용하고 싶을 때만 필요

### 답변:

- ✅ **네, 결제 수단을 제어할 수 있습니다!**
- ✅ **토스페이먼츠 관리자에서 설정**하는 것이 가장 권장되는 방법
- ✅ **코드에서 `variantKey`를 지정**하여 특정 Variant 사용 가능

---

## 🚀 다음 단계

1. 토스페이먼츠 관리자에서 결제 UI 설정 확인
2. 원하는 결제 수단만 선택하여 Variant 생성
3. 필요시 코드에 `variantKey` 추가

자세한 내용은 토스페이먼츠 개발자센터의 "결제 UI 설정" 문서를 참고하세요! 🎉
