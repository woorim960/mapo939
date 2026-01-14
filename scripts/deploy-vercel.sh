#!/bin/bash

# Vercel 배포 스크립트 (환경 변수 보호)
# 사용법: ./scripts/deploy-vercel.sh [prod|dev]

set -e

PROJECT_TYPE=${1:-prod}

if [ "$PROJECT_TYPE" = "prod" ]; then
  PROJECT_NAME="mapo939"
elif [ "$PROJECT_TYPE" = "dev" ]; then
  PROJECT_NAME="mapo939-dev"
else
  echo "❌ 잘못된 프로젝트 타입: $PROJECT_TYPE"
  echo "사용법: $0 [prod|dev]"
  exit 1
fi

echo "🚀 $PROJECT_NAME 프로젝트에 배포 시작..."

# .env.local 백업 (타임스탬프 포함)
BACKUP_FILE=".env.local.backup.$(date +%Y%m%d_%H%M%S)"
if [ -f .env.local ]; then
  echo "📦 .env.local 백업 중... ($BACKUP_FILE)"
  cp .env.local "$BACKUP_FILE"
  ENV_BACKUP_EXISTS=true
else
  ENV_BACKUP_EXISTS=false
  echo "⚠️  .env.local 파일이 없습니다."
fi

# .vercel/project.json을 임시로 백업하여 vercel link가 환경 변수를 다운로드하지 않도록 함
VERCEL_PROJECT_BACKUP=".vercel/project.json.backup"
if [ -f .vercel/project.json ]; then
  cp .vercel/project.json "$VERCEL_PROJECT_BACKUP"
fi

# vercel link 실행 (환경 변수 다운로드 방지)
echo "🔗 Vercel 프로젝트 연결 중..."
# --yes 옵션으로 질문 건너뛰기, 하지만 환경 변수 다운로드는 하지 않음
npx vercel link -p "$PROJECT_NAME" -y > /dev/null 2>&1 || true

# .env.local이 덮어써졌는지 확인하고 복원
if [ "$ENV_BACKUP_EXISTS" = true ]; then
  # Vercel이 .env.local을 덮어썼는지 확인 (Vercel 주석이 있으면 덮어쓴 것)
  if grep -q "# Created by Vercel CLI" .env.local 2>/dev/null; then
    echo "⚠️  .env.local이 Vercel에 의해 덮어써졌습니다. 복원 중..."
    mv "$BACKUP_FILE" .env.local
    echo "✅ .env.local 복원 완료"
  else
    # 덮어써지지 않았으면 백업 파일 삭제
    rm -f "$BACKUP_FILE"
  fi
fi

# 배포
echo "📤 배포 중..."
npx vercel --prod

echo "✅ 배포 완료!"
