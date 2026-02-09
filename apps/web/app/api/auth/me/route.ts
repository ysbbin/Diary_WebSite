// apps/web/app/api/auth/me/route.ts
import { NextResponse } from "next/server";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
  process.env.API_BASE_URL?.trim() ||
  "http://localhost:4000";

export async function GET(req: Request) {
  try {
    // ✅ 브라우저(3000)로 들어온 쿠키를 그대로 4000으로 전달
    const cookie = req.headers.get("cookie") ?? "";

    const res = await fetch(`${API_BASE}/auth/me`, {
      method: "GET",
      headers: {
        cookie,
      },
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));

    return NextResponse.json(data, { status: res.status });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, message: e?.message || "me 요청 실패" },
      { status: 500 }
    );
  }
}
