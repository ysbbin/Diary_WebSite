"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import { signupAction } from "../actions";

type ActionState =
  | null
  | {
      ok: boolean;
      message?: string;
    };

export default function SignupPage() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(signupAction, null);

  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");

  const emailError = useMemo(() => {
    if (!email) return "";
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    return ok ? "" : "이메일 형식이 올바르지 않아.";
  }, [email]);

  const pwError = useMemo(() => {
    if (!pw) return "";
    if (pw.length < 8) return "비밀번호는 8자 이상이어야 해.";
    const hasLetter = /[A-Za-z]/.test(pw);
    const hasNumber = /[0-9]/.test(pw);
    if (!hasLetter || !hasNumber) return "비밀번호는 영문과 숫자를 포함해줘.";
    return "";
  }, [pw]);

  const pw2Error = useMemo(() => {
    if (!pw2) return "";
    return pw === pw2 ? "" : "비밀번호가 일치하지 않아.";
  }, [pw, pw2]);

  const clientInvalid = !!emailError || !!pwError || !!pw2Error;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ fontWeight: 900, fontSize: 16 }}>회원가입</div>

      <form action={formAction} style={{ display: "grid", gap: 10 }}>
        <div style={{ display: "grid", gap: 6 }}>
          <div style={label}>이름(선택)</div>
          <input name="name" placeholder="홍길동" style={input} />
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <div style={label}>이메일</div>
          <input
            name="email"
            type="email"
            placeholder="you@example.com"
            style={input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {emailError && <div style={err}>{emailError}</div>}
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <div style={label}>비밀번호</div>
          <input
            name="password"
            type="password"
            placeholder="8자 이상 (영문+숫자)"
            style={input}
            value={pw}
            onChange={(e) => setPw(e.target.value)}
          />
          {pwError && <div style={err}>{pwError}</div>}
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          <div style={label}>비밀번호 확인</div>
          <input
            name="password2"
            type="password"
            placeholder="비밀번호 다시 입력"
            style={input}
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
          />
          {pw2Error && <div style={err}>{pw2Error}</div>}
        </div>

        {/* 서버 응답 메시지 표시 */}
        {state?.message && <div style={err}>{state.message}</div>}

        <button
          type="submit"
          disabled={pending || clientInvalid}
          style={{
            ...btn,
            opacity: pending || clientInvalid ? 0.5 : 1,
            cursor: pending || clientInvalid ? "not-allowed" : "pointer",
          }}
        >
          {pending ? "가입 중..." : "회원가입"}
        </button>
      </form>

      <div style={{ fontSize: 12, opacity: 0.75 }}>
        이미 계정이 있으면 <Link href="/login">로그인</Link>
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
  background: "rgba(34,197,94,0.12)",
  fontWeight: 900,
};

const err: React.CSSProperties = {
  color: "rgba(239,68,68,0.95)",
  fontWeight: 800,
  fontSize: 12,
};
