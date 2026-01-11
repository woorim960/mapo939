# 라이어 게임 멀티룸 시스템 개선 검토

## ⚠️ 중요 원칙

**게임 알고리즘은 전혀 변경하지 않습니다.**
- 역할 분배 로직 (`src/lib/liar/rules.ts`)
- 승리 조건 체크 (`checkWin`)
- 라운드 진행 로직 (ANSWERING → REVEAL → DISCUSS → VOTING → RESULT)
- 점수 계산 및 지급 로직
- 게임 상태 전환 로직
- 모든 게임 규칙 및 로직

**변경되는 것은 오직:**
- 데이터베이스에서 여러 게임을 저장할 수 있도록 (roomId로 구분)
- API에서 `roomId`를 받아서 해당 방의 게임 상태를 조회/수정
- 프론트엔드에서 방을 선택하고 해당 방의 게임에 참가

**즉, 단일 게임을 여러 개로 복제하여 독립적으로 운영할 수 있게 하는 것입니다.**

---

## 현재 구조 분석

### 현재 상태
- **단일 게임**: `LiarGame` 테이블의 `id`가 1로 고정되어 단일 게임만 관리
- **전역 닉네임**: `LiarPlayer.nickname`이 unique로 전역에서 중복 불가
- **단일 방 접근**: 모든 사용자가 동일한 게임 상태를 공유
- **점수 관리**: 플레이어별 점수가 전역으로 관리됨

### 현재 API 구조
- `/api/liar/state` - 단일 게임 상태 조회
- `/api/liar/join` - 단일 게임에 참가
- `/api/liar/me` - 내 정보 조회
- `/api/liar/start` - 게임 시작
- 기타 게임 진행 API들 (모두 단일 게임 가정)

---

## 멀티룸 시스템 구현에 필요한 기능

### 1. 데이터베이스 스키마 변경

#### 1.1 LiarGame 테이블 수정
```prisma
model LiarGame {
  id        String   @id @default(uuid())  // UUID로 변경 (기존: Int @default(1))
  name      String?                          // 방 이름 (선택사항)
  version   Int      @default(0)
  stateJson Json
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // 인덱스 추가
  @@index([createdAt])
  @@index([updatedAt])
}
```

**변경 사항:**
- `id`를 Int에서 String(UUID)로 변경
- 방 이름 필드 추가 (선택사항)
- 인덱스 추가로 방 목록 조회 최적화

#### 1.2 LiarPlayer 테이블 수정
```prisma
model LiarPlayer {
  id        String   @id
  gameId    String                              // 방 ID 추가
  nickname  String                               // unique 제거 (방별로 중복 가능)
  score     Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  game      LiarGame @relation(fields: [gameId], references: [id], onDelete: Cascade)
  
  @@unique([gameId, nickname])  // 방별 닉네임 중복 방지
  @@index([gameId])
  @@index([gameId, score])
}
```

**변경 사항:**
- `gameId` 필드 추가 (어느 방에 속하는지)
- `nickname`의 전역 unique 제거 → `(gameId, nickname)` 복합 unique로 변경
- 방 삭제 시 플레이어도 함께 삭제 (Cascade)

#### 1.3 마이그레이션 전략
- 기존 데이터 마이그레이션 필요
- 기존 `id: 1` 게임을 UUID로 변환
- 기존 플레이어들에 `gameId` 할당

---

### 2. 백엔드 API 변경

#### 2.1 새로운 API 엔드포인트

**방 목록 조회**
- `GET /api/liar/rooms`
  - 활성 방 목록 조회
  - 필터링: 진행 중/대기 중, 인원 수 등
  - 정렬: 생성 시간, 인원 수 등

**방 생성**
- `POST /api/liar/rooms`
  - 새 방 생성
  - 방 이름 설정 (선택사항)
  - 초기 게임 상태 생성

**방 정보 조회**
- `GET /api/liar/rooms/[roomId]`
  - 특정 방의 정보 조회
  - 공개 정보만 반환 (내부 상태는 제외)

**방 삭제**
- `DELETE /api/liar/rooms/[roomId]`
  - 방 삭제 (방장만 가능)
  - 관련 플레이어 데이터도 함께 삭제

#### 2.2 기존 API 수정

**모든 API에 `roomId` 파라미터 추가 필요:**

1. **`/api/liar/state`**
   - 변경: `GET /api/liar/state?roomId={roomId}`
   - 특정 방의 게임 상태 조회

2. **`/api/liar/join`**
   - 변경: `POST /api/liar/join` body에 `roomId` 추가
   - 특정 방에 참가

3. **`/api/liar/me`**
   - 변경: `POST /api/liar/me` body에 `roomId` 추가
   - 특정 방에서의 내 정보

4. **`/api/liar/start`**
   - 변경: `POST /api/liar/start` body에 `roomId` 추가
   - 특정 방의 게임 시작

5. **기타 게임 진행 API들**
   - `submit-answer`, `vote`, `finalize`, `restart` 등
   - 모두 `roomId` 파라미터 추가 필요

#### 2.3 DB 헬퍼 함수 수정

**`src/lib/liar/db.ts` 변경:**

```typescript
// 기존
export async function getOrCreateGame(): Promise<{ state: GameState; dbVersion: number }>

// 변경
export async function getOrCreateGame(roomId: string): Promise<{ state: GameState; dbVersion: number }>
export async function getGame(roomId: string): Promise<{ state: GameState; dbVersion: number } | null>
export async function createRoom(name?: string): Promise<string>  // roomId 반환
export async function listRooms(): Promise<RoomInfo[]>
export async function deleteRoom(roomId: string): Promise<boolean>
```

**`updateGameCAS` 함수:**
```typescript
// 기존
export async function updateGameCAS(
  expectedVersion: number,
  nextState: GameState
): Promise<{ ok: true; newVersion: number } | { ok: false }>

// 변경
export async function updateGameCAS(
  roomId: string,
  expectedVersion: number,
  nextState: GameState
): Promise<{ ok: true; newVersion: number } | { ok: false }>
```

---

### 3. 프론트엔드 변경

#### 3.1 라우팅 변경

**기존:**
- `/liar` - 단일 게임 페이지

**변경:**
- `/liar` - 방 목록 페이지 (새로 추가)
- `/liar/[roomId]` - 특정 방의 게임 페이지

#### 3.2 새로운 컴포넌트

**방 목록 페이지 (`/liar/page.tsx` 또는 새 파일)**
- 방 목록 표시
- 방 생성 버튼
- 방 입장 버튼
- 방 정보 표시 (인원 수, 상태, 생성 시간 등)

**방 선택/생성 UI**
- 방 목록 컴포넌트
- 방 생성 모달/폼
- 방 검색/필터링

#### 3.3 기존 컴포넌트 수정

**`useLiarGame` 훅**
- `roomId` 상태 추가
- `roomId`를 URL 파라미터나 쿼리에서 가져오기
- API 호출 시 `roomId` 포함

**게임 페이지 (`/liar/[roomId]/page.tsx`)**
- 동적 라우팅으로 `roomId` 받기
- 모든 API 호출에 `roomId` 포함

#### 3.4 상태 관리 변경

**로컬 스토리지**
- `liar_room_id` - 현재 참가한 방 ID 저장
- `liar_nickname` - 닉네임 (방별로 다를 수 있음)

**URL 상태**
- `roomId`를 URL에 포함하여 공유 가능하게

---

### 4. 기능별 상세 요구사항

#### 4.1 방 목록 기능

**조회 조건:**
- 활성 방만 표시 (게임 진행 중 또는 대기 중)
- 비활성 방은 자동 정리 (예: 1시간 이상 비활성)

**표시 정보:**
- 방 이름 (또는 기본 이름)
- 현재 인원 수 / 최대 인원 수
- 게임 상태 (LOBBY, PREP, 진행 중 등)
- 방장 닉네임
- 생성 시간

**정렬/필터:**
- 최신순, 인원순
- 상태별 필터 (대기 중, 진행 중)

#### 4.2 방 생성 기능

**생성 옵션:**
- 방 이름 설정 (선택사항, 기본값: "방 {번호}")
- 비밀번호 설정 (선택사항, 향후 확장)

**생성자 처리:**
- 생성자가 자동으로 방장이 됨
- 생성자가 자동으로 참가됨

#### 4.3 방 입장 기능

**입장 프로세스:**
1. 닉네임 입력 (방별로 중복 가능)
2. 방 선택
3. 입장 요청
4. 게임 페이지로 이동

**입장 제한:**
- 게임 진행 중일 때는 관전만 가능 (기존 로직 유지)
- 방이 가득 찬 경우 (최대 인원 제한, 선택사항)

#### 4.4 방 퇴장 기능

**자동 퇴장:**
- 브라우저 종료 시 자동 퇴장 처리
- 일정 시간 비활성 시 자동 퇴장 (선택사항)

**수동 퇴장:**
- "방 나가기" 버튼
- 방장이 나가면 다음 플레이어가 방장 위임

#### 4.5 방 삭제 기능

**삭제 권한:**
- 방장만 삭제 가능
- 또는 관리자 권한 (선택사항)

**삭제 처리:**
- 게임 상태 삭제
- 관련 플레이어 데이터 삭제
- 참가자들에게 알림 (선택사항)

---

### 5. 점수 관리 변경

#### 5.1 점수 스코프

**현재:**
- 전역 점수 (모든 게임에서 공유)
- `LiarPlayer` 테이블에 `score` 필드로 저장

**변경:**
- **방별 점수로 변경** (각 방에서 독립적인 게임이므로)
- `LiarPlayer` 테이블에 `gameId` 추가하여 방별로 점수 관리
- 각 방에서 독립적으로 점수 계산 및 지급 (기존 로직 그대로)

**점수 계산 로직은 변경 없음:**
- 승리 시 100점 지급
- 트롤 사망 시 100점 지급
- 300점 달성 시 최종 우승
- 모든 점수 계산 로직은 기존과 동일

#### 5.2 점수 저장 구조

**방별 점수 구조:**
```typescript
// LiarPlayer 테이블에 gameId 포함
// 각 방에서 독립적인 점수 관리
// 기존 점수 계산/지급 로직은 그대로 유지
```

---

### 6. 추가 고려사항

#### 6.1 성능 최적화

**방 목록 조회:**
- 페이지네이션 (많은 방이 있을 경우)
- 캐싱 (방 목록은 자주 변경되지 않음)

**게임 상태 폴링:**
- 기존과 동일하게 1초마다 폴링
- `roomId`별로 독립적인 폴링

#### 6.2 보안

**방 접근 제어:**
- 존재하지 않는 방 접근 시 에러
- 삭제된 방 접근 시 에러

**닉네임 중복:**
- 방별로만 중복 방지
- 같은 방에서만 unique 체크

#### 6.3 사용자 경험

**방 전환:**
- 다른 방으로 이동 시 현재 방에서 자동 퇴장
- 방 목록에서 바로 이동 가능

**방 공유:**
- URL 공유로 특정 방에 초대 가능
- QR 코드 생성 (선택사항)

#### 6.4 데이터 정리

**비활성 방 정리:**
- 일정 시간 비활성 방 자동 삭제
- 또는 수동 정리 (관리자 기능)

**플레이어 데이터 정리:**
- 방 삭제 시 관련 플레이어 데이터 삭제
- 또는 보관 (통계용, 선택사항)

---

## 구현 우선순위

### Phase 1: 기본 멀티룸 구조
1. ✅ 데이터베이스 스키마 변경
2. ✅ DB 헬퍼 함수 수정
3. ✅ 방 목록/생성 API
4. ✅ 기존 API에 `roomId` 추가

### Phase 2: 프론트엔드 기본 UI
1. ✅ 방 목록 페이지
2. ✅ 방 생성 UI
3. ✅ 방 선택/입장 UI
4. ✅ 게임 페이지에 `roomId` 연동

### Phase 3: 고급 기능
1. 방 삭제 기능
2. 방 정보 표시 개선
3. 방 검색/필터링
4. 성능 최적화

---

## 예상 작업량

### 백엔드
- **데이터베이스 마이그레이션**: 2-3시간
- **DB 헬퍼 함수 수정**: 3-4시간
- **새로운 API 엔드포인트**: 4-5시간
- **기존 API 수정**: 6-8시간
- **테스트**: 3-4시간
- **총계**: 약 18-24시간

### 프론트엔드
- **방 목록 페이지**: 4-5시간
- **방 생성/선택 UI**: 3-4시간
- **게임 페이지 수정**: 4-5시간
- **상태 관리 수정**: 3-4시간
- **테스트**: 2-3시간
- **총계**: 약 16-21시간

### 전체 예상 작업량
**약 34-45시간** (약 4-6일 작업)

---

## 주의사항

1. **하위 호환성**: 기존 사용자 데이터 마이그레이션 필요
2. **동시성**: 여러 방에서 동시 게임 진행 시 성능 고려
3. **데이터 정리**: 비활성 방 정리 전략 필요
4. **게임 로직 보존**: 모든 게임 알고리즘은 변경하지 않고 그대로 유지

## 게임 로직 보존 확인 사항

다음 파일들의 로직은 **전혀 변경하지 않습니다:**

### 백엔드 게임 로직 (변경 없음)
- `src/lib/liar/rules.ts` - 역할 분배, 승리 조건 체크
- `src/lib/liar/types.ts` - GameState 타입 정의
- `src/app/api/liar/state-helpers.ts` - 게임 상태 헬퍼 함수들
- `src/app/api/liar/start/route.ts` - 게임 시작 로직 (역할 분배 등)
- `src/app/api/liar/finalize/route.ts` - 게임 종료 조건 체크 및 점수 지급
- `src/app/api/liar/submit-answer/route.ts` - 답변 제출 로직
- `src/app/api/liar/vote/route.ts` - 투표 로직
- 기타 게임 진행 관련 로직

### 변경되는 부분 (인프라만)
- `src/lib/liar/db.ts` - `getOrCreateGame(roomId)`, `updateGameCAS(roomId, ...)` 등에 `roomId` 파라미터 추가
- 모든 API 엔드포인트에 `roomId` 파라미터 추가
- 데이터베이스 스키마에 `gameId` 추가

**핵심: 게임 로직은 그대로 두고, 단지 어떤 방의 게임 상태를 조회/수정할지만 지정하는 것입니다.**
