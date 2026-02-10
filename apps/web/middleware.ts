// apps/web/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const LOGIN_PATH = "/login";
const SIGNUP_PATH = "/signup";
const DEFAULT_AFTER_LOGIN = "/calendar";

// ✅ 백엔드에서 실제로 세팅하는 쿠키 이름(지금은 access_token)
const TOKEN_COOKIE_NAME = "access_token";

function hasAuthCookie(req: NextRequest) {
  return !!req.cookies.get(TOKEN_COOKIE_NAME)?.value;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const authed = hasAuthCookie(req);

  const isAuthPage = pathname.startsWith(LOGIN_PATH) || pathname.startsWith(SIGNUP_PATH);

  // ✅ 1) 로그인/회원가입 페이지인데 이미 로그인 상태면 캘린더로 보내기
  if (isAuthPage && authed) {
    const url = req.nextUrl.clone();
    url.pathname = DEFAULT_AFTER_LOGIN;
    url.search = "";
    return NextResponse.redirect(url);
  }

  // ✅ 2) 보호할 페이지들 (/calendar, /today, /)
  const isProtected =
    pathname.startsWith("/calendar") ||
    pathname.startsWith("/today") ||
    pathname === "/"; // 홈을 막고 싶으면 유지, 아니면 이 줄 삭제

  if (!isProtected) return NextResponse.next();

  // ✅ 3) 보호 페이지인데 로그인 안 했으면 로그인으로 보내기 + next 유지
  if (!authed) {
    const url = req.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// ✅ 어느 경로에 적용할지
export const config = {
  matcher: ["/login", "/signup", "/calendar/:path*", "/today/:path*", "/"],
};
