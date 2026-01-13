// 환경 변수 검증 스크립트
// 사용법: tsx scripts/check-env.ts

import "dotenv/config";

const requiredEnvVars = [
  'DATABASE_URL',
  'NEXT_PUBLIC_TOSS_PAYMENTS_WIDGET_CLIENT_KEY',
  'TOSS_PAYMENTS_WIDGET_SECRET_KEY',
];

const missing = requiredEnvVars.filter(key => !process.env[key]);

if (missing.length > 0) {
  console.error('❌ Missing required environment variables:');
  missing.forEach(key => console.error(`  - ${key}`));
  console.error('\n💡 Please check your .env.local file or Vercel environment variables.');
  process.exit(1);
}

console.log('✅ All required environment variables are set');
console.log('\n📋 Environment variables:');
requiredEnvVars.forEach(key => {
  const value = process.env[key];
  // 민감한 정보는 일부만 표시
  if (key === 'DATABASE_URL') {
    const url = new URL(value!);
    console.log(`  - ${key}: postgresql://***@${url.host}${url.pathname}`);
  } else if (key.includes('SECRET') || key.includes('KEY')) {
    console.log(`  - ${key}: ${value?.substring(0, 20)}...`);
  } else {
    console.log(`  - ${key}: ${value}`);
  }
});
