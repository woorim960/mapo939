# Vercel DATABASE_URL 환경 변수 확인 가이드

## 🤔 문제 상황

Vercel 운영 사이트에서 환경 변수를 확인했는데 `DATABASE_URL`이 등록되어 있지 않았는데, 어떻게 운영 DB와 연결되어 있었는지 궁금함.

---

## 💡 가능한 원인들

### 원인 1: Vercel 데이터베이스 통합 (Database Integration)

Vercel은 Neon, Prisma Postgres, PlanetScale 등의 데이터베이스 통합을 제공하며, 통합을 사용하면 **자동으로 `DATABASE_URL` 환경 변수가 주입**됩니다.

**특징**:
- 환경 변수 목록에 **표시되지 않을 수 있음** (자동 주입)
- 통합에서 관리되므로 수동으로 설정할 필요 없음
- 빌드 시점에 자동으로 사용 가능

**확인 방법**:
1. Vercel 대시보드 → 프로젝트 선택
2. **Settings** → **Integrations** 탭 확인
3. Neon, Prisma Postgres 등 데이터베이스 통합이 연결되어 있는지 확인

---

### 원인 2: 다른 이름의 환경 변수

혹시 다른 이름으로 설정되어 있을 수 있습니다:
- `POSTGRES_URL`
- `POSTGRES_PRISMA_URL`
- `DATABASE_PRISMA_URL`
- 등

**확인 방법**:
1. Vercel 대시보드 → **Settings** → **Environment Variables**
2. 모든 환경 변수 목록 확인
3. 데이터베이스 관련 변수가 있는지 확인

---

### 원인 3: 빌드 시점에만 존재

환경 변수가 빌드 시점에만 존재하고, 현재는 삭제되었을 수 있습니다.

**확인 방법**:
1. Vercel 대시보드 → **Deployments** 탭
2. 최신 배포 선택
3. **"Build Logs"** 확인
4. 빌드 로그에서 `DATABASE_URL` 관련 메시지 확인

---

### 원인 4: 시스템 환경 변수

Vercel의 시스템 환경 변수로 제공될 수 있습니다 (일반적이지 않음).

---

## 🔍 확인 단계

### 1단계: Vercel Integrations 확인

1. Vercel 대시보드 → 프로젝트 선택
2. **Settings** → **Integrations** 탭
3. 다음 통합이 연결되어 있는지 확인:
   - **Neon**
   - **Prisma Postgres**
   - **PlanetScale**
   - 기타 데이터베이스 통합

**통합이 연결되어 있다면**:
- ✅ 자동으로 `DATABASE_URL`이 주입됨
- ✅ 환경 변수 목록에 표시되지 않을 수 있음
- ✅ 이것이 정상적인 동작

---

### 2단계: 환경 변수 목록 전체 확인

1. Vercel 대시보드 → **Settings** → **Environment Variables**
2. **모든 환경 변수** 목록 확인 (Production, Preview, Development)
3. 다음 변수들이 있는지 확인:
   - `DATABASE_URL`
   - `POSTGRES_URL`
   - `POSTGRES_PRISMA_URL`
   - `DATABASE_PRISMA_URL`
   - 기타 데이터베이스 관련 변수

---

### 3단계: 빌드 로그 확인

1. Vercel 대시보드 → **Deployments** 탭
2. 최신 배포 (성공한 배포) 선택
3. **"Build Logs"** 또는 **"Function Logs"** 확인
4. 다음 메시지 확인:
   - `DATABASE_URL`
   - `Prisma schema loaded from`
   - `Datasource "db"`
   - 데이터베이스 연결 관련 로그

**빌드 로그 예시**:
```
Loaded Prisma config from prisma.config.ts.
Prisma schema loaded from prisma/schema.prisma.
Datasource "db": PostgreSQL database "neondb", schema "public" at "ep-xxx.neon.tech"
```

---

### 4단계: 실제 연결 확인

1. 운영 사이트 접속
2. 데이터가 정상적으로 로드되는지 확인
3. API 호출이 정상적으로 작동하는지 확인

**데이터가 정상적으로 로드된다면**:
- ✅ 데이터베이스 연결이 정상임
- ✅ 환경 변수가 어딘가에 설정되어 있음
- ⚠️ 환경 변수 목록에서 확인이 안 되는 상황

---

## 🎯 가장 가능성 높은 원인

### Vercel Neon 통합

Neon을 Vercel과 통합했다면:
- ✅ **자동으로 `DATABASE_URL`이 주입됨**
- ✅ 환경 변수 목록에 표시되지 않을 수 있음
- ✅ **Integrations** 탭에서 확인 가능

**확인 방법**:
1. Vercel 대시보드 → **Settings** → **Integrations**
2. **Neon** 통합이 연결되어 있는지 확인
3. 연결되어 있다면 이것이 원인

---

## ✅ 해결 방법

### 상황 1: 통합이 연결되어 있음

**그대로 사용**:
- ✅ 자동으로 `DATABASE_URL`이 주입됨
- ✅ 별도 설정 불필요
- ✅ 통합에서 관리됨

**주의사항**:
- 통합을 해제하면 `DATABASE_URL`이 없어짐
- 환경 변수 목록에 표시되지 않아도 정상

---

### 상황 2: 통합이 없고 환경 변수도 없음

**문제**:
- 빌드가 실패할 가능성이 높음
- 또는 다른 방식으로 연결되어 있을 수 있음

**해결**:
1. **Settings** → **Environment Variables**
2. **"Add New"** 클릭
3. 다음 설정:
   - Key: `DATABASE_URL`
   - Value: 운영 DB 연결 문자열
   - Environment: ✅ **Production** 체크
4. **"Save"** 클릭
5. 재배포

---

## 🔍 추가 확인 사항

### Vercel 대시보드에서 확인할 위치:

1. **Settings** → **Environment Variables**
   - 수동으로 설정한 환경 변수

2. **Settings** → **Integrations**
   - 데이터베이스 통합 (자동 주입)

3. **Deployments** → **Build Logs**
   - 빌드 시점 환경 변수 확인

---

## 📝 요약

### 가능한 원인:

1. ✅ **Vercel 데이터베이스 통합** (가장 가능성 높음)
   - Neon, Prisma Postgres 등 통합 사용
   - 자동으로 `DATABASE_URL` 주입
   - 환경 변수 목록에 표시되지 않을 수 있음

2. ⚠️ **다른 이름의 환경 변수**
   - `POSTGRES_URL` 등

3. ⚠️ **빌드 시점에만 존재**
   - 현재는 삭제됨

### 확인 방법:

1. **Settings** → **Integrations** 확인
2. **Settings** → **Environment Variables** 전체 목록 확인
3. **Deployments** → **Build Logs** 확인
4. 운영 사이트 동작 확인

---

## 🎯 다음 단계

1. **Vercel 대시보드에서 Integrations 확인**
2. **환경 변수 목록 전체 확인**
3. **확인 결과에 따라**:
   - 통합이 있다면: 그대로 사용
   - 통합이 없다면: 환경 변수 수동 설정 필요

Vercel 대시보드에서 확인한 결과를 알려주시면 더 정확히 안내드릴 수 있습니다! 🎉
