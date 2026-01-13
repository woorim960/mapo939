# 마이그레이션 "적용" 개념 설명

## 📁 마이그레이션 파일이란?

마이그레이션 파일은 `prisma/migrations/` 폴더에 있는 SQL 파일들입니다.

```
prisma/migrations/
├── 20251228085318_init/
│   └── migration.sql          ← 이 파일이 "기존 마이그레이션"
├── 20251228085818_add_admin_sessions/
│   └── migration.sql          ← 이 파일도 "기존 마이그레이션"
├── 20260104082453_liar_init/
│   └── migration.sql          ← 이 파일도 "기존 마이그레이션"
└── ...
```

이 파일들은 **이미 작성되어 있고, Git에 커밋되어 있는 파일들**입니다.

---

## 🔄 "마이그레이션 적용"이란?

마이그레이션 파일 안에는 SQL 명령어들이 들어있습니다:

```sql
-- 예: 20251228085318_init/migration.sql
CREATE TABLE "Member" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "birthDate" TIMESTAMP(3) NOT NULL,
  ...
);
```

**"마이그레이션을 적용한다"** = 이 SQL 파일들을 **실제 데이터베이스에서 실행**한다는 의미입니다.

---

## 📊 `db:migrate` vs `db:migrate:dev` 차이

### `npm run db:migrate` - 기존 마이그레이션만 적용

**의미**: `prisma/migrations/` 폴더에 **이미 존재하는** 마이그레이션 파일들만 DB에 실행

**동작 과정**:
1. `prisma/migrations/` 폴더를 확인
2. 아직 DB에 적용되지 않은 마이그레이션 파일들을 찾음
3. 순서대로 실행 (날짜순)
4. **새 파일을 만들지 않음**

**예시**:
```bash
# prisma/migrations/ 폴더에 이런 파일들이 있다고 가정:
# - 20251228085318_init/migration.sql
# - 20251228085818_add_admin_sessions/migration.sql
# - 20260104082453_liar_init/migration.sql

npm run db:migrate

# 실행 결과:
# ✅ 20251228085318_init 적용됨
# ✅ 20251228085818_add_admin_sessions 적용됨
# ✅ 20260104082453_liar_init 적용됨
# ❌ 새 파일은 생성되지 않음
```

---

### `npm run db:migrate:dev` - 스키마 변경 감지 + 새 마이그레이션 생성

**의미**: `prisma/schema.prisma` 파일을 보고, 변경사항이 있으면 **새 마이그레이션 파일을 생성**한 후 적용

**동작 과정**:
1. `prisma/schema.prisma` 파일 읽기
2. 현재 DB 스키마와 비교
3. **차이가 있으면** → 새 마이그레이션 파일 생성
4. 생성된 파일을 DB에 적용

**예시**:
```bash
# 1. prisma/schema.prisma 파일을 수정
# 예: Member 테이블에 새 컬럼 추가

# 2. 마이그레이션 실행
npm run db:migrate:dev

# 실행 결과:
# ✅ 스키마 변경사항 감지됨
# ✅ 새 파일 생성: prisma/migrations/20260113225748_add_phone/migration.sql
# ✅ 새 파일을 DB에 적용
```

---

## 🎯 구체적인 예시

### 시나리오 1: 새 개발 DB 만들기

```bash
# 1. Neon에서 새 DB 생성
# 2. .env.local에 개발 DB URL 설정

# 3. 기존 마이그레이션 파일들만 적용
npm run db:migrate
```

**무슨 일이 일어나는가?**:
- `prisma/migrations/` 폴더에 있는 **모든 기존 마이그레이션 파일들**을 읽음
- 각 파일의 SQL을 순서대로 실행
- 새 파일은 생성하지 않음

**결과**:
- ✅ DB에 모든 테이블이 생성됨
- ✅ 기존 마이그레이션 파일들은 그대로 유지됨

---

### 시나리오 2: 스키마 변경 후

```bash
# 1. prisma/schema.prisma 파일 수정
# 예: Member 테이블에 phone 컬럼 추가

model Member {
  id        String   @id @default(uuid())
  name      String
  birthDate DateTime
  phone     String   // ← 새로 추가한 컬럼
  ...
}

# 2. 새 마이그레이션 생성 및 적용
npm run db:migrate:dev
```

**무슨 일이 일어나는가?**:
1. `schema.prisma` 파일 읽기
2. 현재 DB 스키마와 비교
3. "phone 컬럼이 없네?" → 차이점 감지
4. **새 마이그레이션 파일 생성**: `prisma/migrations/20260113225748_add_phone/migration.sql`
5. 새 파일 내용:
   ```sql
   ALTER TABLE "Member" ADD COLUMN "phone" TEXT NOT NULL;
   ```
6. 이 새 파일을 DB에 실행

**결과**:
- ✅ 새 마이그레이션 파일이 생성됨
- ✅ DB에 phone 컬럼이 추가됨
- ✅ Git에 새 파일을 커밋해야 함

---

## 📝 "기존 마이그레이션"의 의미

### 기존 마이그레이션 = 이미 존재하는 파일

```
prisma/migrations/
├── 20251228085318_init/          ← 이건 "기존 마이그레이션"
├── 20251228085818_add_admin_sessions/  ← 이것도 "기존 마이그레이션"
├── 20260104082453_liar_init/     ← 이것도 "기존 마이그레이션"
└── ...
```

이 파일들은:
- ✅ 이미 작성되어 있음
- ✅ Git에 커밋되어 있음
- ✅ 다른 개발자도 가지고 있음
- ✅ 변경하지 않음

### 새 마이그레이션 = 지금 생성하는 파일

```bash
npm run db:migrate:dev
# → 새 파일 생성: 20260113225748_add_phone/migration.sql
```

이 파일은:
- ✅ 방금 생성됨
- ✅ Git에 커밋해야 함
- ✅ 다른 개발자는 아직 없음

---

## 🔍 실제 동작 비교

### `db:migrate` 실행 시:

```bash
npm run db:migrate
```

**Prisma가 하는 일**:
1. `prisma/migrations/` 폴더 확인
2. "어떤 마이그레이션 파일들이 있나?"
3. "DB에 어떤 마이그레이션이 적용되었나?"
4. "아직 적용 안 된 파일들만 실행하자"
5. **새 파일은 만들지 않음**

**예시 출력**:
```
Applying migration `20251228085318_init`
Applying migration `20251228085818_add_admin_sessions`
Applying migration `20260104082453_liar_init`
...
```

---

### `db:migrate:dev` 실행 시:

```bash
npm run db:migrate:dev
```

**Prisma가 하는 일**:
1. `prisma/schema.prisma` 파일 읽기
2. 현재 DB 스키마 확인
3. "차이가 있나?"
4. **차이가 있으면** → 새 마이그레이션 파일 생성
5. 새 파일을 DB에 적용

**예시 출력** (스키마 변경이 있는 경우):
```
Applying migration `20260113225748`

The following migration(s) have been created and applied from new schema changes:

prisma/migrations/
  └─ 20260113225748/
    └─ migration.sql

Your database is now in sync with your schema.
```

**예시 출력** (스키마 변경이 없는 경우):
```
Already in sync, no schema change or pending migration was found.
```

---

## 💡 왜 이렇게 나뉘어 있나?

### 운영 환경에서는 안전하게

```bash
# 운영 DB에 적용할 때
npm run db:migrate
```

- ✅ 예측 가능: 어떤 마이그레이션이 적용될지 알 수 있음
- ✅ 안전: 새 파일이 갑자기 생성되지 않음
- ✅ 검증됨: 이미 테스트된 마이그레이션 파일들만 사용

### 개발 환경에서는 편리하게

```bash
# 개발 중 스키마 변경할 때
npm run db:migrate:dev
```

- ✅ 편리: 스키마만 수정하면 자동으로 마이그레이션 생성
- ✅ 빠름: 수동으로 SQL 작성할 필요 없음
- ✅ 자동: Prisma Client도 자동 재생성

---

## 📚 요약

### "기존 마이그레이션만 적용"의 의미:

1. **기존 마이그레이션** = `prisma/migrations/` 폴더에 **이미 존재하는** `.sql` 파일들
2. **적용** = 그 파일들의 SQL을 **DB에서 실행**
3. **만 적용** = **새 파일을 만들지 않고**, 기존 파일들만 실행

### `db:migrate`:
- 기존 파일들만 실행
- 새 파일 생성 안 함

### `db:migrate:dev`:
- 스키마 변경 감지
- 새 파일 생성
- 새 파일 실행

이제 이해되셨나요? 🎉
