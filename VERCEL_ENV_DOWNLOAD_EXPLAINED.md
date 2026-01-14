# Vercel 환경 변수 다운로드 동작 설명

## 📋 질문: 배포 명령어 실행 시마다 자동으로 복사되나요?

**답변**: **아니요. `vercel link`는 환경 변수를 자동으로 다운로드하지 않습니다.**

---

## 🔍 `vercel link`와 `vercel env pull`의 차이

### `vercel link` (프로젝트 연결만)
- **목적**: 로컬 디렉토리를 Vercel 프로젝트에 연결
- **동작**: `.vercel/project.json` 파일만 생성/업데이트
- **환경 변수**: 다운로드하지 않음 ✅

### `vercel env pull` (환경 변수 다운로드)
- **목적**: Vercel 프로젝트의 환경 변수를 로컬로 다운로드
- **동작**: `.env.local` 파일에 환경 변수 작성/덮어쓰기
- **환경 변수**: 다운로드함 ⚠️

---

## ✅ 현재 배포 스크립트 동작

`scripts/deploy-vercel.sh`는 **`vercel link`만 사용**합니다:

```bash
# vercel link만 실행 (환경 변수 다운로드 안 함)
npx vercel link -p "$PROJECT_NAME" -y
```

따라서:
- ✅ `.env.local`이 자동으로 덮어써지지 않음
- ✅ 로컬 개발용 환경 변수 보호
- ✅ 배포 시에도 `.env.local` 유지

---

## 🛡️ 추가 보호 메커니즘

스크립트에는 추가 보호 메커니즘이 있습니다:

1. **백업**: `.env.local` 백업
2. **복원**: 만약 덮어써졌다면 자동 복원

하지만 `vercel link`만 사용하므로 일반적으로 복원이 필요하지 않습니다.

---

## 📝 실제 동작

### 배포 명령어 실행 시:

```bash
npm run deploy:dev
# 또는
npm run deploy:prod
```

**실행 순서**:
1. `.env.local` 백업 (안전을 위해)
2. `vercel link -p 프로젝트이름 -y` 실행
   - 프로젝트 연결만 (환경 변수 다운로드 안 함)
3. `.env.local` 확인 (덮어써졌는지 체크)
4. 복원 (필요시)
5. `vercel --prod` 실행 (배포)

---

## 🔒 결론

### `.env.local` 파일 관리:

1. **`VERCEL_OIDC_TOKEN` 제거해도 됨**:
   - 로컬 개발에 불필요
   - 배포 시에도 자동으로 다운로드되지 않음

2. **배포 명령어 실행 시**:
   - `vercel link`만 실행 (환경 변수 다운로드 안 함)
   - `.env.local`이 자동으로 덮어써지지 않음 ✅

3. **수동 다운로드 시에만 주의**:
   ```bash
   # 이 명령어만 환경 변수를 다운로드함 (스크립트는 사용 안 함)
   npx vercel env pull
   ```

---

## 📋 요약 테이블

| 명령어 | 환경 변수 다운로드 | `.env.local` 영향 |
|--------|------------------|-------------------|
| `vercel link` | ❌ 안 함 | ✅ 영향 없음 |
| `vercel env pull` | ✅ 함 | ⚠️ 덮어쓰기 가능 |
| `npm run deploy:dev` | ❌ 안 함 | ✅ 보호됨 |
| `npm run deploy:prod` | ❌ 안 함 | ✅ 보호됨 |

**결론**: 배포 스크립트를 사용하면 `.env.local`이 자동으로 덮어써지지 않습니다! 🎉
