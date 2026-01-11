# 출석부 UI/UX 개선 계획 및 가이드

## 현재 문제점

1. **색상 과다 사용**
   - 알록달록한 그라데이션 과다 사용
   - 밝고 선명한 색상으로 인한 시각적 피로
   - 일관성 없는 색상 체계

2. **가독성 문제**
   - 버튼 텍스트 대비 부족 (검은 배경에 검은 글씨 등)
   - 과도한 그라데이션으로 텍스트 가독성 저하

3. **디자인 일관성 부족**
   - 컴포넌트별 색상 사용 불일치
   - 명확한 디자인 시스템 부재

## 개선 원칙

### 1. 색상 전략: Muted & Sophisticated

**핵심 원칙:**
- **채도 낮은 부드러운 색상** 사용 (bright 색상 지양)
- **명확한 대비** 확보 (WCAG 접근성 기준)
- **의미 있는 색상** 사용 (기능별 일관된 색상)

**색상 팔레트:**
```
Primary (주요 액션/버튼):
  - slate-600 (#475569) - 부드러운 진한 블루그레이
  - hover: slate-700
  - 텍스트: white

Success (출석/성공 상태):
  - emerald-600 (#059669) - 부드러운 그린
  - hover: emerald-700
  - 텍스트: white

Warning (지각/주의):
  - amber-500 (#f59e0b) - 부드러운 오렌지
  - hover: amber-600
  - 텍스트: white

Neutral (기본/배경):
  - 배경: neutral-50 (#fafafa)
  - 카드: white
  - 텍스트: neutral-900 (제목), neutral-700 (본문), neutral-600 (부제목), neutral-500 (캡션)
  - 테두리: neutral-200
```

### 2. 버튼 디자인 시스템

**계층 구조:**

1. **Primary Button (주요 액션)**
   - 배경: slate-600
   - 텍스트: white
   - 사용: "로그인", "멤버 추가", "수정", "추가" 등

2. **Success Button (출석)**
   - 배경: emerald-600
   - 텍스트: white
   - 사용: 출석 체크 버튼

3. **Warning Button (지각)**
   - 배경: amber-500
   - 텍스트: white
   - 사용: 지각 체크 버튼

4. **Secondary Button (보조 액션)**
   - 배경: white
   - 테두리: neutral-300
   - 텍스트: neutral-700
   - 사용: "결석", "로그아웃", "닫기", "취소" 등

**상태:**
- **Default**: 기본 색상
- **Hover**: 약간 어두운 색상 (예: slate-700)
- **Active**: scale-95 (클릭 피드백)
- **Disabled**: opacity-50

### 3. 배지(Badge) 디자인

**출석 상태 배지:**
- 출석: emerald-600 배경 + white 텍스트
- 지각: amber-500 배경 + white 텍스트
- 결석: neutral-200 배경 + neutral-600 텍스트

### 4. 카드 & 컨테이너

**원칙:**
- 깔끔한 흰색 배경
- 미묘한 그림자 (shadow-sm, shadow-md)
- 적절한 테두리 (border-neutral-200)
- 호버 시 미묘한 상승 효과 (hover:-translate-y-0.5)

### 5. 타이포그래피 계층

```
제목 (H1): text-3xl, font-bold, text-neutral-900
섹션 제목 (H2): text-2xl, font-bold, text-neutral-900
서브 제목 (H3): text-lg, font-semibold, text-neutral-900
본문: text-sm, font-normal, text-neutral-700
캡션: text-xs, font-medium, text-neutral-500
```

### 6. 간격 시스템

- 섹션 간: space-y-8 (32px)
- 카드 간: gap-4 (16px)
- 요소 간: gap-2, gap-3 (8px, 12px)
- 패딩: p-4, p-5, p-6 (16px, 20px, 24px)

### 7. 인터랙션

- 트랜지션: duration-200 (200ms)
- 호버 효과: hover:bg-*, hover:shadow-*
- 액티브 피드백: active:scale-95
- 부드러운 애니메이션

## 구현 가이드

### 색상 적용 예시

1. **헤더 & 주요 버튼**
   ```tsx
   className="bg-slate-600 text-white hover:bg-slate-700"
   ```

2. **출석 버튼**
   ```tsx
   className="bg-emerald-600 text-white hover:bg-emerald-700"
   ```

3. **지각 버튼**
   ```tsx
   className="bg-amber-500 text-white hover:bg-amber-600"
   ```

4. **보조 버튼**
   ```tsx
   className="bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-50"
   ```

5. **배지**
   ```tsx
   // 출석
   className="bg-emerald-600 text-white"
   // 지각
   className="bg-amber-500 text-white"
   // 결석
   className="bg-neutral-200 text-neutral-600"
   ```

## 개선 효과

1. **시각적 피로 감소**: 부드러운 색상으로 장시간 사용 시 피로도 감소
2. **가독성 향상**: 명확한 대비로 텍스트 가독성 개선
3. **일관성 확보**: 통일된 색상 시스템으로 전문적인 느낌
4. **접근성 개선**: WCAG 기준 준수로 모든 사용자 접근성 향상
5. **현대적 디자인**: 최신 UI/UX 트렌드 반영 (minimalism, muted colors)
