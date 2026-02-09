import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const TOKEN_COOKIE_NAMES = ["access_token", "token", "auth_token"];

export default async function HomePage() {
  const c = await cookies(); // ✅ 여기 핵심
  const authed = TOKEN_COOKIE_NAMES.some((n) => !!c.get(n)?.value);

  if (authed) redirect("/calendar");

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          background: "white",
          border: "1px solid rgba(0,0,0,0.08)",
          borderRadius: 18,
          padding: 18,
          boxShadow: "0 12px 40px rgba(0,0,0,0.08)",
        }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>Diary</h1>
        <p style={{ marginTop: 10, opacity: 0.75, lineHeight: 1.5 }}>
          캘린더로 일정을 정리하고, 기록을 남기는 개인 다이어리 웹앱.
        </p>

        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <Link href="/login" style={btn}>로그인</Link>
          <Link href="/signup" style={{ ...btn, background: "rgba(34,197,94,0.12)" }}>회원가입</Link>
        </div>

        <div style={{ marginTop: 12, fontSize: 12, opacity: 0.65 }}>
          배포 버전에서는 구글/카카오 로그인도 추가할 수 있어.
        </div>
      </div>
    </main>
  );
}

const btn: React.CSSProperties = {
  flex: 1,
  textAlign: "center",
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(0,0,0,0.12)",
  background: "rgba(59,130,246,0.12)",
  fontWeight: 900,
  textDecoration: "none",
  color: "inherit",
};
