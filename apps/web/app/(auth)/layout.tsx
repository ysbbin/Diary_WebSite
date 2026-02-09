export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "rgba(0,0,0,0.03)",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "white",
          borderRadius: 18,
          border: "1px solid rgba(0,0,0,0.08)",
          boxShadow: "0 12px 40px rgba(0,0,0,0.08)",
          padding: 18,
        }}
      >
        <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 12 }}>Diary</div>
        {children}
      </div>
    </div>
  );
}
