export default function TodayPage() {
  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800 }}>Today / To-do</h1>
      <p style={{ marginTop: 6, opacity: 0.7 }}>
        사이드바에서 넘어오는 별도 페이지. 다음 단계에서 카드 UI로 채울 거야.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16 }}>
        <div style={card}>오늘 일정(임시)</div>
        <div style={card}>To-do(임시)</div>
      </div>
    </div>
  );
}

const card: React.CSSProperties = {
  padding: 16,
  borderRadius: 16,
  border: "1px solid rgba(0,0,0,0.08)",
  background: "white",
  minHeight: 160,
};
