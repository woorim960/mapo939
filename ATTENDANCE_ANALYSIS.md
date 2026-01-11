# 출석부 페이지 개발 분석 문서

## 📋 개요

출석부 페이지는 Next.js 기반의 웹 애플리케이션으로, 교회 출석 관리를 위한 시스템입니다. 멤버 관리, 출석 체크, 통계 조회 등의 기능을 제공합니다.

---

## 🏗️ 아키텍처 구조

### 1. 페이지 구조
```
src/app/page.tsx (메인 페이지)
  └── MembersBoard (출석부 메인 컴포넌트)
```

### 2. 기능별 디렉토리 구조
```
src/features/attendance/
├── api/              # API 클라이언트 함수들
│   ├── admin.ts      # 관리자 인증 API
│   ├── attendance.ts # 출석 체크 API
│   ├── members.ts    # 멤버 CRUD API
│   └── uploads.ts    # 이미지 업로드 API
├── components/        # UI 컴포넌트들
│   ├── MembersBoard.tsx      # 메인 보드 (컨테이너)
│   ├── MemberSection.tsx     # 청년회/학생회 섹션
│   ├── MemberCard.tsx        # 개별 멤버 카드
│   ├── MemberModal.tsx       # 멤버 상세 모달
│   ├── MemberForm.tsx        # 멤버 추가/수정 폼
│   ├── LoginModal.tsx        # 관리자 로그인 모달
│   └── CropModal.tsx         # 이미지 크롭 모달
├── hooks/            # 커스텀 훅
│   ├── useMembers.ts         # 멤버 데이터 관리
│   ├── useAdmin.ts           # 관리자 인증 상태
│   └── useMemberForm.ts      # 멤버 폼 상태 관리
├── types/            # 타입 정의
└── utils/              # 유틸리티 함수
```

### 3. 백엔드 API 구조
```
src/app/api/
├── admin/
│   ├── login/route.ts    # 관리자 로그인
│   ├── logout/route.ts   # 관리자 로그아웃
│   └── me/route.ts        # 관리자 세션 확인
├── attendance/
│   ├── check/route.ts    # 출석/지각 체크
│   └── absent/route.ts   # 결석 처리
├── members/
│   ├── route.ts          # 멤버 목록 조회/생성
│   ├── [id]/route.ts     # 멤버 수정/삭제
│   └── [id]/stats/route.ts # 멤버 통계 조회
└── stats/route.ts        # 전체 통계 조회
```

---

## 🎯 주요 기능

### 1. 멤버 관리

#### 멤버 목록 표시
- **청년회 (20세 이상)** / **학생회 (20세 미만)** 자동 분류
- 한국나이 기준으로 자동 계산 (`koreanAgeFromBirthDate`)
- 멤버 카드에 표시되는 정보:
  - 사진 (메인 이미지 + 원형 프로필)
  - 이름, 나이, 생년월일
  - 오늘 출석 상태 배지 (출석/지각/결석)
  - 출석 포인트 (누적)
  - 올해 출석 횟수

#### 멤버 정렬
- **누적 출석 포인트 기준 내림차순** 정렬
- 포인트가 높을수록 상단에 표시

#### 멤버 상세 정보
- 모달을 통한 개인 통계 조회:
  - 이번달/올해 출석/지각 횟수
  - 출석율 계산
  - 누적/올해 출석 포인트
  - 모임 수 대비 출석률

### 2. 출석 체크

#### 출석 상태
- **PRESENT** (출석): 1000 포인트
- **LATE** (지각): 500 포인트
- **ABSENT** (결석): 0 포인트 (기록 없음)

#### 출석 체크 규칙
- **일요일**: 누구나 출석/지각 체크 가능
- **평일**: 관리자 인증 필요
- 같은 날 중복 체크 시 자동 업데이트 (upsert)

#### 출석 체크 UI
- 각 멤버 카드 하단에 3개 버튼:
  - 출석 버튼
  - 지각 버튼
  - 결석 버튼

### 3. 관리자 기능

#### 관리자 인증
- 세션 기반 인증 (`AdminSession`)
- 만료 시간 표시 (실시간 카운트다운)
- 평일 출석 체크 시 자동 로그인 모달 표시

#### 관리자 전용 기능
- 멤버 추가/수정/비활성화
- 평일 출석 체크 수정
- 멤버 정보 수정 (이름, 전화번호, 생년월일, 사진)

### 4. 통계 기능

#### 전체 통계 (헤더)
- 오늘 출석 인원 수 (지각 포함)
- 이번달 평균 출석 인원
- 전체 평균 출석 인원
- 모임 수 정보

#### 개인 통계 (멤버 모달)
- 이번달/올해 출석/지각 횟수
- 출석율 (모임 수 대비)
- 누적/올해 포인트

---

## 💾 데이터베이스 구조

### 주요 모델

#### Member (멤버)
```prisma
- id: UUID
- name: 이름
- phone: 전화번호
- birthDate: 생년월일
- photoUrl: 사진 URL
- isActive: 활성화 여부 (soft delete)
```

#### Attendance (출석 기록)
```prisma
- id: UUID
- memberId: 멤버 ID
- date: 날짜 (UTC)
- status: PRESENT | LATE
- points: 포인트 (1000 or 500)
- unique: [memberId, date] (하루에 한 번만 기록)
```

#### Admin / AdminSession (관리자)
```prisma
- Admin: 관리자 계정
- AdminSession: 세션 토큰 (만료 시간 포함)
```

---

## 🔄 데이터 흐름

### 1. 페이지 로드 시
```
1. useMembers() 훅 실행
   └── fetchMembers() → GET /api/members
   └── fetchStats() → GET /api/stats
2. useAdmin() 훅 실행
   └── fetchAdminMe() → GET /api/admin/me
3. 멤버 데이터를 나이 기준으로 분류 (청년회/학생회)
4. 포인트 기준 정렬
5. UI 렌더링
```

### 2. 출석 체크 시
```
1. 사용자가 출석/지각 버튼 클릭
2. handleCheckAttendance() 실행
3. checkAttendance() API 호출 → POST /api/attendance/check
4. 서버에서:
   - 오늘이 일요일인지 확인
   - 평일이면 관리자 인증 확인
   - KST 기준 날짜로 UTC 변환
   - upsert로 출석 기록 저장/업데이트
5. 클라이언트에서 데이터 새로고침
6. UI 업데이트
```

### 3. 멤버 추가/수정 시
```
1. 관리자 인증 확인
2. MemberForm 모달 열기
3. 사진 업로드 → CropModal로 크롭
4. 크롭된 이미지를 서버에 업로드 → POST /api/uploads/member-photo
5. WebP로 변환되어 blob URL 반환
6. 폼 저장 시:
   - createMember() → POST /api/members
   - 또는 updateMember() → PATCH /api/members/[id]
7. 데이터 새로고침
```

---

## 🎨 UI/UX 특징

### 디자인
- **Tailwind CSS** 기반 모던한 디자인
- 반응형 레이아웃 (모바일/데스크톱)
- 카드 기반 레이아웃
- 부드러운 모달 애니메이션

### 사용자 경험
- 실시간 출석 상태 표시
- 로딩 상태 관리
- 에러 처리 및 토스트 알림
- 접근성 고려 (키보드 네비게이션)

### 주요 UI 컴포넌트
- **MemberCard**: 멤버 정보 카드 (사진, 이름, 통계, 버튼)
- **MemberSection**: 청년회/학생회 섹션 구분
- **MemberModal**: 상세 통계 모달
- **MemberForm**: 멤버 추가/수정 폼
- **LoginModal**: 관리자 로그인

---

## 🔐 보안 및 권한

### 인증
- 관리자 세션 기반 인증
- 세션 토큰 해시 저장
- 만료 시간 관리

### 권한 체크
- **공개 기능**: 멤버 조회, 통계 조회, 일요일 출석 체크
- **관리자 전용**: 멤버 CRUD, 평일 출석 체크 수정

### API 보안
- `requireAdminSession()`: 세션 검증
- `requireAdminOr401()`: 관리자 또는 401 에러
- 입력값 검증 및 타입 체크

---

## 📅 날짜/시간 처리

### KST (한국 표준시) 기준
- 모든 날짜는 **KST 기준**으로 처리
- UTC와 KST 변환 유틸리티:
  - `getKstYmdKey()`: 현재 KST 날짜 (YYYY-MM-DD)
  - `kstYmdToUtcDate()`: KST 날짜를 UTC Date로 변환
  - `isSundayKst()`: KST 기준 일요일 확인

### 출석 날짜 처리
- 출석 기록은 KST 기준 날짜로 저장
- UTC Date로 변환하여 DB에 저장
- 조회 시 KST 기준으로 필터링

---

## 🎯 포인트 시스템

### 포인트 계산
- **출석 (PRESENT)**: 1000 포인트
- **지각 (LATE)**: 500 포인트
- **결석 (ABSENT)**: 0 포인트 (기록 없음)

### 포인트 집계
- **누적 포인트**: 전체 출석 기록의 포인트 합계
- **올해 포인트**: 올해(1월 1일~) 출석 기록의 포인트 합계
- 멤버 정렬에 사용 (누적 포인트 기준)

---

## 🛠️ 기술 스택

### 프론트엔드
- **Next.js 14+** (App Router)
- **React** (Client Components)
- **TypeScript**
- **Tailwind CSS**

### 백엔드
- **Next.js API Routes**
- **Prisma ORM**
- **PostgreSQL**

### 주요 라이브러리
- 이미지 크롭 (CropModal)
- 날짜 처리 (KST 변환)
- 에러 처리 (ApiError)

---

## 📝 주요 파일 설명

### 프론트엔드

#### `MembersBoard.tsx`
- 출석부 메인 컨테이너 컴포넌트
- 상태 관리 및 이벤트 핸들링
- 청년회/학생회 섹션 렌더링
- 모달 관리

#### `MemberCard.tsx`
- 개별 멤버 카드 UI
- 출석 상태 배지 표시
- 출석/지각/결석 버튼
- 클릭 시 상세 모달 열기

#### `useMembers.ts`
- 멤버 데이터 및 통계 관리
- API 호출 및 상태 업데이트
- 자동 새로고침 기능

#### `useAdmin.ts`
- 관리자 인증 상태 관리
- 세션 만료 시간 카운트다운
- 관리자 정보 조회

### 백엔드

#### `api/attendance/check/route.ts`
- 출석/지각 체크 API
- 일요일/평일 구분
- 관리자 인증 확인
- upsert로 중복 방지

#### `api/members/route.ts`
- 멤버 목록 조회 (GET)
- 멤버 생성 (POST)
- 통계 집계 (올해 출석, 누적 포인트, 오늘 상태)

#### `api/stats/route.ts`
- 전체 통계 조회
- 오늘/이번달/전체 평균 출석 인원
- 모임 수 계산

#### `lib/kst-attendance.ts`
- KST 날짜 처리 유틸리티
- 일요일 확인
- 포인트 계산

---

## 🔄 상태 관리

### 로컬 상태 (useState)
- 모달 열림/닫힘 상태
- 로딩 상태
- 에러 메시지
- 토스트 알림

### 커스텀 훅
- `useMembers`: 멤버 데이터 및 통계
- `useAdmin`: 관리자 인증 상태
- `useMemberForm`: 멤버 폼 상태

### 데이터 새로고침
- 출석 체크 후 자동 새로고침
- 멤버 추가/수정 후 자동 새로고침
- 관리자 로그인 후 자동 새로고침

---

## 🐛 에러 처리

### API 에러
- `ApiError` 클래스로 통일된 에러 처리
- 401 에러 시 자동 로그인 모달 표시
- 사용자 친화적인 에러 메시지

### 유효성 검증
- 폼 입력값 검증
- 날짜 형식 검증
- 필수 필드 확인

---

## 📊 성능 최적화

### 데이터 로딩
- 초기 로드 시 멤버와 통계 병렬 조회 (`Promise.all`)
- 필요한 데이터만 조회 (select 옵션)

### UI 최적화
- 로딩 상태 표시
- 비활성화된 멤버 필터링 (isActive)
- 인덱스 활용 (DB 쿼리 최적화)

---

## 🎓 개발 패턴

### 컴포넌트 구조
- **Container-Presenter 패턴**: MembersBoard가 컨테이너, 하위 컴포넌트가 프레젠터
- **커스텀 훅**: 비즈니스 로직 분리
- **타입 안정성**: TypeScript로 타입 정의

### API 설계
- RESTful API
- 명확한 에러 응답
- 타입 안전한 요청/응답

---

## 🔮 향후 개선 가능 사항

1. **실시간 업데이트**: WebSocket 또는 Server-Sent Events
2. **출석 히스토리**: 날짜별 출석 기록 조회
3. **엑셀 내보내기**: 통계 데이터 내보내기
4. **알림 기능**: 출석 체크 알림
5. **검색/필터**: 멤버 검색 및 필터링
6. **다크 모드**: 테마 지원

---

## 📌 주요 특징 요약

✅ **자동 분류**: 나이 기준 청년회/학생회 자동 분류  
✅ **포인트 시스템**: 출석/지각에 따른 포인트 부여  
✅ **관리자 인증**: 세션 기반 관리자 인증  
✅ **통계 기능**: 개인/전체 통계 제공  
✅ **반응형 디자인**: 모바일/데스크톱 지원  
✅ **KST 기준**: 한국 시간 기준 날짜 처리  
✅ **일요일 예외**: 일요일은 누구나 출석 체크 가능  
✅ **Soft Delete**: 멤버 비활성화 (기록 유지)  

---

*마지막 업데이트: 2025년 1월*
