"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";

type ActionState =
  | null
  | {
      ok: boolean;
      message?: string;
    };

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
  process.env.API_BASE_URL?.trim() ||
  "http://localhost:4000";

function rethrowIfRedirectError(e: any) {
  // Next.js redirect()는 내부적으로 NEXT_REDIRECT를 throw 함
  if (e?.digest === "NEXT_REDIRECT" || e?.message === "NEXT_REDIRECT") {
    throw e;
  }
}

/** 회원가입 */
export async function signupAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const password2 = String(formData.get("password2") ?? "");

  if (!email) return { ok: false, message: "이메일을 입력해줘." };
  if (!password) return { ok: false, message: "비밀번호를 입력해줘." };
  if (password.length < 8) return { ok: false, message: "비밀번호는 8자 이상이어야 해." };
  if (password !== password2) return { ok: false, message: "비밀번호가 일치하지 않아." };

  try {
    const res = await fetch(`${API_BASE}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name: name || null }),
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg = data?.message || `회원가입 실패 (HTTP ${res.status})`;
      return { ok: false, message: msg };
    }

    // ✅ 성공 시 로그인 페이지로 이동
    redirect("/login");
  } catch (e: any) {
    rethrowIfRedirectError(e);
    return { ok: false, message: e?.message || "요청에 실패했어." };
  }
}

/** 로그인 */
export async function loginAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email) return { ok: false, message: "이메일을 입력해줘." };
  if (!password) return { ok: false, message: "비밀번호를 입력해줘." };

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg = data?.message || `로그인 실패 (HTTP ${res.status})`;
      return { ok: false, message: msg };
    }

    /**
     * ✅ 중요 포인트
     * 백엔드(4000)가 HttpOnly 쿠키를 굽더라도 그 쿠키는 localhost:4000 도메인 쿠키라
     * 프론트(3000)에서는 안 보임.
     *
     * 그래서 백엔드 응답의 set-cookie 헤더에서 access_token을 꺼내서
     * Next(3000) 쿠키로 다시 심어줘야 /calendar 접근 시 인증이 유지됨.
     */
    const setCookie = res.headers.get("set-cookie") || "";
    const m = setCookie.match(/access_token=([^;]+)/);

    if (!m?.[1]) {
      return {
        ok: false,
        message: "서버 응답에 token이 없어. (백엔드 /auth/login에서 쿠키가 제대로 내려오는지 확인 필요)",
      };
    }

    const token = m[1];

    // ✅ Next 15+ 에서는 cookies()가 Promise일 수 있어서 await 필요
    const cookieStore = await cookies();
    cookieStore.set("access_token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: false, // 로컬 개발
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7일(초)
    });

    // ✅ 성공 시 캘린더로 이동
    redirect("/calendar");
  } catch (e: any) {
    rethrowIfRedirectError(e);
    return { ok: false, message: e?.message || "요청에 실패했어." };
  }
}
