"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction } from "../actions";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, null);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ fontWeight: 900, fontSize: 16 }}>로그인</div>

      <form action={formAction} style={{ display: "grid", gap: 10 }}>
        <div style={{ display: "grid", gap: 6 }}>
          <div style={label}>이메일</div>
          <input name="email" type="email" placeholder="you@example.com" style={input} />
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <div style={label}>비밀번호</div>
          <input name="password" type="password" placeholder="••••••••" style={input} />
        </div>

        {state?.message && (
          <div style={{ color: "rgba(239,68,68,0.95)", fontWeight: 800, fontSize: 12 }}>
            {state.message}
          </div>
        )}

        <button
          type="submit"
          disabled={pending}
          style={{
            ...btn,
            opacity: pending ? 0.6 : 1,
            cursor: pending ? "not-allowed" : "pointer",
          }}
        >
          {pending ? "로그인 중..." : "로그인"}
        </button>
      </form>

      <div style={{ fontSize: 12, opacity: 0.75 }}>
        계정이 없으면 <Link href="/signup">회원가입</Link>
      </div>
    </div>
  );
}

const label: React.CSSProperties = { fontSize: 12, fontWeight: 900, opacity: 0.75 };

const input: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(0,0,0,0.12)",
  outline: "none",
  boxSizing: "border-box",
};

const btn: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(0,0,0,0.12)",
  background: "rgba(59,130,246,0.12)",
  fontWeight: 900,
};
