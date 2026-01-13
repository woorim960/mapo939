# 데이터베이스 분리 및 데이터 복사 가이드

## 📋 개요

기존에 하나의 DB를 로컬/운영에서 함께 사용하던 것을 **로컬/개발 DB**와 **운영 DB**로 분리합니다.

## 🎯 전략

**✅ 권장: 기존 DB를 운영 DB로 유지, 새 DB를 개발 DB로 사용**

### 이유:
1. **서비스 중단 없음**: 기존 운영 환경을 그대로 유지
2. **안전성**: 운영 데이터를 보호하면서 개발 환경 분리
3. **유연성**: 개발 환경에서 자유롭게 테스트 가능
4. **쉬운 전환**: 환경 변수만 변경하면 됨

---

## 📝 단계별 가이드

### 1단계: 개발 데이터베이스 생성

#### Neon PostgreSQL 사용 시:

1. **Neon 대시보드 접속**: https://console.neon.tech
2. **새 프로젝트 생성**:
   - 프로젝트 이름: `attendance-app-dev`
   - 데이터베이스 이름: `dev_db` (또는 원하는 이름)
   - 리전: 개발 환경과 가까운 리전 선택
3. **연결 문자열 복사**:
   ```
   postgresql://user:password@ep-xxx-xxx.ap-southeast-1.aws.neon.tech/dev_db?sslmode=require
   ```

#### 다른 PostgreSQL 제공자 사용 시:
- Supabase, Railway, Render 등에서도 동일하게 개발용 DB를 생성하세요.

---

### 2단계: 개발 DB에 마이그레이션 적용

새로 만든 개발 DB에 스키마를 생성합니다:

```bash
# 개발 DB URL을 DATABASE_URL로 설정
export DATABASE_URL="개발_DB_연결_문자열"

# 또는 .env.local에 추가 후
DATABASE_URL="개발_DB_연결_문자열" npx prisma migrate deploy
```

또는 `.env.local` 파일을 생성:

```bash
# .env.local
DATABASE_URL="개발_DB_연결_문자열"
```

그 다음:

```bash
npm run db:migrate
```

---

### 3단계: 기존 DB 데이터를 개발 DB로 복사

#### 방법 1: 스크립트 사용 (권장)

1. **`.env.local`에 기존 DB URL 추가**:
   ```bash
   # .env.local
   DATABASE_URL="개발_DB_연결_문자열"  # 새로 만든 개발 DB
   SOURCE_DATABASE_URL="기존_DB_연결_문자열"  # 기존 운영 DB
   TARGET_DATABASE_URL="개발_DB_연결_문자열"  # 새로 만든 개발 DB
   ```

2. **데이터 복사 스크립트 실행**:
   ```bash
   npm run db:copy
   ```

   이 스크립트는 다음 테이블의 데이터를 복사합니다:
   - Admin, AdminSession
   - Member, Attendance, BonusPoints
   - LiarGame, LiarPlayer
   - WatermelonPlayer, WatermelonScore
   - WatermelonItem, WatermelonPlayerItem
   - WatermelonPayment, WatermelonItemPurchase

#### 방법 2: pg_dump/pg_restore 사용 (대용량 데이터)

```bash
# 1. 기존 DB 덤프
pg_dump "기존_DB_연결_문자열" > backup.sql

# 2. 새 DB에 복원
psql "개발_DB_연결_문자열" < backup.sql
```

**주의**: 이 방법은 스키마와 데이터를 모두 복사하므로, Prisma 마이그레이션과 충돌할 수 있습니다. 스크립트 사용을 권장합니다.

---

### 4단계: 환경 변수 설정

#### 로컬 개발 환경 (`.env.local`)

```bash
# 개발 데이터베이스
DATABASE_URL="개발_DB_연결_문자열"

# 토스페이먼츠 테스트 키
NEXT_PUBLIC_TOSS_PAYMENTS_WIDGET_CLIENT_KEY="test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm"
TOSS_PAYMENTS_WIDGET_SECRET_KEY="test_gsk_docs_OaPz8L5KdmQXkzRz3y47BMw6"
```

#### Vercel 운영 환경

1. **Vercel 대시보드 접속**: https://vercel.com
2. **프로젝트 선택** → **Settings** → **Environment Variables**
3. **Production 환경에 다음 변수 추가**:
   ```
   DATABASE_URL = 기존_운영_DB_연결_문자열
   NEXT_PUBLIC_TOSS_PAYMENTS_WIDGET_CLIENT_KEY = 운영_클라이언트_키
   TOSS_PAYMENTS_WIDGET_SECRET_KEY = 운영_시크릿_키
   ```

---

### 5단계: 검증

#### 개발 환경 확인:

```bash
# 1. 환경 변수 확인
npm run check:env

# 2. 개발 서버 실행
npm run dev

# 3. 데이터 확인 (Prisma Studio)
npm run db:studio
```

#### 운영 환경 확인:

1. Vercel 대시보드에서 환경 변수 확인
2. 운영 사이트 접속하여 정상 작동 확인
3. 데이터가 기존과 동일한지 확인

---

## ⚠️ 주의사항

### 1. 데이터 복사 시 주의

- **중복 방지**: 스크립트는 `skipDuplicates: true` 옵션을 사용하여 중복 데이터를 건너뜁니다.
- **외래 키 제약**: 테이블 간 관계가 있으므로 순서대로 복사됩니다.
- **대용량 데이터**: 데이터가 많으면 시간이 걸릴 수 있습니다.

### 2. 운영 DB 보호

- **절대 개발 환경에서 운영 DB를 사용하지 마세요**
- `.env.local`에는 항상 개발 DB URL만 설정
- 운영 DB URL은 Vercel 환경 변수에만 설정

### 3. 마이그레이션 관리

- **개발 DB에서 먼저 테스트**: 새로운 마이그레이션은 개발 DB에서 먼저 테스트
- **운영 DB 적용**: 테스트 완료 후 운영 DB에 적용
- **백업**: 운영 DB 마이그레이션 전에 백업 권장

---

## 🔄 워크플로우

### 개발 중:

```bash
# 1. 개발 DB에 마이그레이션 적용
npm run db:migrate:dev

# 2. 개발 서버 실행
npm run dev
```

### 운영 배포 전:

```bash
# 1. 개발 DB에서 마이그레이션 테스트
npm run db:migrate:dev

# 2. 로컬 빌드 테스트
npm run build

# 3. Vercel 배포
npm run prod
```

### 운영 배포 시:

- Vercel이 자동으로 `npm run build` 실행
- `npx prisma migrate deploy`가 자동 실행되어 운영 DB에 마이그레이션 적용
- 환경 변수는 Vercel 대시보드에서 설정한 값 사용

---

## 📊 데이터 복사 스크립트 상세

### 실행 방법:

```bash
# .env.local에 설정
SOURCE_DATABASE_URL="기존_DB_URL"
TARGET_DATABASE_URL="개발_DB_URL"

# 스크립트 실행
npm run db:copy
```

### 복사되는 테이블:

1. **Admin** - 관리자 계정
2. **AdminSession** - 관리자 세션
3. **Member** - 멤버 정보
4. **Attendance** - 출석 기록
5. **BonusPoints** - 보너스 포인트
6. **LiarGame** - 라이어 게임
7. **LiarPlayer** - 라이어 게임 플레이어
8. **WatermelonPlayer** - 수박게임 플레이어
9. **WatermelonScore** - 수박게임 점수
10. **WatermelonItem** - 수박게임 아이템
11. **WatermelonPlayerItem** - 플레이어 아이템 보유량
12. **WatermelonPayment** - 결제 내역
13. **WatermelonItemPurchase** - 아이템 구매 내역

### 스크립트 특징:

- ✅ 중복 데이터 자동 건너뜀 (`skipDuplicates: true`)
- ✅ 외래 키 관계 고려한 순서로 복사
- ✅ 진행 상황 실시간 표시
- ✅ 오류 발생 시 상세 메시지 출력

---

## ✅ 체크리스트

데이터베이스 분리 완료 확인:

- [ ] 개발 DB가 생성되었는가?
- [ ] 개발 DB에 마이그레이션이 적용되었는가?
- [ ] 기존 DB 데이터가 개발 DB로 복사되었는가?
- [ ] `.env.local`에 개발 DB URL이 설정되었는가?
- [ ] Vercel에 운영 DB URL이 설정되었는가?
- [ ] 로컬에서 `npm run dev`가 정상 작동하는가?
- [ ] 운영 사이트가 정상 작동하는가?
- [ ] 개발 DB와 운영 DB가 분리되어 있는가?

---

## 🆘 문제 해결

### 데이터 복사 실패 시:

1. **연결 확인**: 두 DB URL이 올바른지 확인
2. **스키마 확인**: 개발 DB에 마이그레이션이 적용되었는지 확인
3. **권한 확인**: DB 사용자에게 INSERT 권한이 있는지 확인
4. **로그 확인**: 스크립트 출력 메시지 확인

### 환경 변수 오류 시:

```bash
# 환경 변수 확인
npm run check:env
```

### 마이그레이션 오류 시:

```bash
# Prisma 상태 확인
npx prisma migrate status

# 마이그레이션 재적용
npx prisma migrate deploy
```
