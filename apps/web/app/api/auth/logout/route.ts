// apps/web/app/api/auth/logout/route.ts
import { NextResponse } from "next/server";

export async function POST() {
  // ✅ 웹(3000) 도메인에 저장된 access_token 쿠키를 삭제
  const res = NextResponse.json({ ok: true });

  res.cookies.set({
    name: "access_token",
    value: "",
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: false, // 로컬
    maxAge: 0, // 즉시 만료
  });

  return res;
}
