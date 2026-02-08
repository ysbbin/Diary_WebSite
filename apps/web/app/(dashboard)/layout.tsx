import Link from "next/link";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", minHeight: "100vh" }}>
      <aside
        style={{
          borderRight: "1px solid rgba(0,0,0,0.08)",
          padding: 16,
          background: "white",
          position: "sticky",
          top: 0,
          height: "100vh",
        }}
      >
        <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 14 }}>Diary</div>

        {/* 캘린더 선택 (지금은 UI만) */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6 }}>내 캘린더</div>
          <select style={{ width: "100%", padding: 10, borderRadius: 12, border: "1px solid rgba(0,0,0,0.12)" }}>
            <option>개인 캘린더</option>
            <option>팀 캘린더</option>
            <option>프로젝트 캘린더</option>
          </select>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Link href="/calendar" style={navLinkStyle}>📅 Calendar</Link>
          <Link href="/today" style={navLinkStyle}>✅ Today / To-do</Link>
        </nav>

        <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid rgba(0,0,0,0.08)", fontSize: 12, opacity: 0.7 }}>
          MVP UI 작업중
        </div>
      </aside>

      <main style={{ background: "rgba(0,0,0,0.02)" }}>
        {children}
      </main>
    </div>
  );
}

const navLinkStyle: React.CSSProperties = {
  display: "block",
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(0,0,0,0.08)",
  textDecoration: "none",
  color: "inherit",
  background: "white",
};
