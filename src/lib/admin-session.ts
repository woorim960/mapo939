import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/auth";

/**
 * 쿠키 이름 (고정)
 */
export const ADMIN_SESSION_COOKIE = "admin_session";

/**
 * 세션 유지시간(분) — 요구사항: 1회 인증 20분 유지
 */
export const ADMIN_SESSION_TTL_MINUTES = 20;

/**
 * Next cookies()는 App Router에서 Promise를 반환하는 케이스가 있어 await 사용
 */
async function getCookieValue(name: string): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(name)?.value ?? null;
}

async function setCookie(
  name: string,
  value: string,
  options: {
    maxAgeSeconds: number;
    secure?: boolean;
    sameSite?: "lax" | "strict" | "none";
    path?: string;
  }
) {
  const cookieStore = await cookies();
  cookieStore.set({
    name,
    value,
    httpOnly: true,
    secure: options.secure ?? process.env.NODE_ENV === "production",
    sameSite: options.sameSite ?? "lax",
    path: options.path ?? "/",
    maxAge: options.maxAgeSeconds,
  });
}

async function deleteCookie(name: string) {
  const cookieStore = await cookies();
  cookieStore.delete(name);
}

/**
 * 세션 조회 (null이면 미인증)
 * - UI에서 "expiresAt" 표시/타이머에 필요
 */
export async function getAdminSession(): Promise<{
  adminId: string;
  username: string;
  expiresAt: Date;
  tokenHash: string;
} | null> {
  const token = await getCookieValue(ADMIN_SESSION_COOKIE);
  if (!token) return null;

  const tokenHash = hashToken(token);

  const session = await prisma.adminSession.findUnique({
    where: { tokenHash },
    include: { admin: true },
  });

  if (!session) return null;

  // 만료 처리(정리)
  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.adminSession.delete({ where: { tokenHash } }).catch(() => {});
    return null;
  }

  // 관리자 비활성화면 무효
  if (!session.admin.isActive) return null;

  return {
    adminId: session.adminId,
    username: session.admin.username,
    expiresAt: session.expiresAt,
    tokenHash,
  };
}

/**
 * 기존 네 함수 이름 유지: requireAdminSession()
 * - 기존 호출부 깨지지 않게 그대로 제공
 * - (원래는 expiresAt 없이 반환했는데, 호환을 위해 그대로 유지)
 */
export async function requireAdminSession(): Promise<{ adminId: string; username: string } | null> {
  const sess = await getAdminSession();
  if (!sess) return null;
  return { adminId: sess.adminId, username: sess.username };
}

/**
 * 라우트에서 쓰기 편한 버전: 없으면 401용 throw
 */
export async function requireAdminSessionOrThrow(): Promise<{ adminId: string; username: string }> {
  const sess = await requireAdminSession();
  if (!sess) {
    // 라우트에서 catch해서 401 리턴하면 됨
    throw new Error("unauthorized_admin");
  }
  return sess;
}

/**
 * 로그인 성공 시 호출:
 * - DB adminSession 레코드 생성(혹은 갱신)
 * - 쿠키 설정 (20분)
 *
 * token(평문)은 DB에 저장하지 않고 tokenHash만 저장하는 구조를 유지
 */
export async function createAdminSession(params: {
  adminId: string;
  token: string; // 평문(쿠키에 넣을 값)
}): Promise<{ expiresAt: Date; tokenHash: string }> {
  const tokenHash = hashToken(params.token);
  const expiresAt = new Date(Date.now() + ADMIN_SESSION_TTL_MINUTES * 60 * 1000);

  // tokenHash를 PK/unique로 쓰는 구조라면 upsert가 안정적
  // (동일 토큰 재로그인 같은 케이스 방지)
  await prisma.adminSession.upsert({
    where: { tokenHash },
    create: {
      tokenHash,
      adminId: params.adminId,
      expiresAt,
    },
    update: {
      adminId: params.adminId,
      expiresAt,
    },
  });

  // 쿠키 설정
  await setCookie(ADMIN_SESSION_COOKIE, params.token, {
    maxAgeSeconds: ADMIN_SESSION_TTL_MINUTES * 60,
  });

  return { expiresAt, tokenHash };
}

/**
 * 로그아웃:
 * - 쿠키 삭제
 * - DB 세션도 같이 삭제(있으면)
 */
export async function clearAdminSession(): Promise<void> {
  const token = await getCookieValue(ADMIN_SESSION_COOKIE);

  // 쿠키 먼저 제거
  await deleteCookie(ADMIN_SESSION_COOKIE);

  if (!token) return;

  const tokenHash = hashToken(token);
  await prisma.adminSession.delete({ where: { tokenHash } }).catch(() => {});
}

/**
 * (선택) "무슨 일이 있어도 20분 유지"를 강하게 원하면
 * 특정 API 호출마다 expiresAt을 20분 뒤로 연장하는 방식이 필요함.
 *
 * 이 함수는:
 * - 세션이 유효하면 expiresAt을 연장하고
 * - 쿠키 maxAge도 갱신
 *
 * 사용처 예:
 * - 관리자 인증이 필요한 라우트 시작 부분에서 호출
 */
export async function refreshAdminSessionTtl(): Promise<{
  adminId: string;
  username: string;
  expiresAt: Date;
} | null> {
  const sess = await getAdminSession();
  if (!sess) return null;

  const newExpiresAt = new Date(Date.now() + ADMIN_SESSION_TTL_MINUTES * 60 * 1000);

  await prisma.adminSession.update({
    where: { tokenHash: sess.tokenHash },
    data: { expiresAt: newExpiresAt },
  });

  // 쿠키 maxAge도 갱신
  const token = await getCookieValue(ADMIN_SESSION_COOKIE);
  if (token) {
    await setCookie(ADMIN_SESSION_COOKIE, token, {
      maxAgeSeconds: ADMIN_SESSION_TTL_MINUTES * 60,
    });
  }

  return { adminId: sess.adminId, username: sess.username, expiresAt: newExpiresAt };
}
