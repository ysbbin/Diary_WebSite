"use client";

import React, { useMemo } from "react";

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = x.getDay(); // Sun=0
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function sameYMD(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function MiniMonthCalendar({
  year,
  month,
  onChangeMonth,
}: {
  year: number;
  month: number; // 0-11
  onChangeMonth: (year: number, month: number) => void;
}) {
  const monthDate = useMemo(() => new Date(year, month, 1), [year, month]);
  const today = useMemo(() => new Date(), []);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(monthDate));
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [monthDate]);

  function prev() {
    const d = new Date(year, month - 1, 1);
    onChangeMonth(d.getFullYear(), d.getMonth());
  }
  function next() {
    const d = new Date(year, month + 1, 1);
    onChangeMonth(d.getFullYear(), d.getMonth());
  }

  // ✅ 날짜 클릭 → 해당 날짜의 month/year로 이동(오른쪽 캘린더도 같이 이동)
  function goToDate(d: Date) {
    onChangeMonth(d.getFullYear(), d.getMonth());
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <button onClick={prev} style={navBtn}>←</button>
        <div style={{ fontWeight: 900 }}>
          {monthDate.toLocaleString(undefined, { year: "numeric", month: "long" })}
        </div>
        <button onClick={next} style={navBtn}>→</button>
      </div>

      <div
        style={{
          marginTop: 10,
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 6,
          fontSize: 12,
          opacity: 0.7,
        }}
      >
        {["S", "M", "T", "W", "T", "F", "S"].map((w, i) => (
          <div key={i} style={{ textAlign: "center", fontWeight: 800 }}>
            {w}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
        {days.map((d) => {
          const isCurrent = d.getMonth() === month && d.getFullYear() === year;
          const isToday = sameYMD(d, today);

          return (
            <button
              key={d.toISOString()}
              onClick={() => goToDate(d)}
              style={{
                textAlign: "center",
                padding: "8px 0",
                borderRadius: 10,
                border: isToday ? "2px solid rgba(59,130,246,0.65)" : "1px solid rgba(0,0,0,0.06)",
                opacity: isCurrent ? 1 : 0.35,
                fontWeight: 800,
                userSelect: "none",
                cursor: "pointer",
                background: "white",
              }}
              title={`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const navBtn: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 12,
  border: "1px solid rgba(0,0,0,0.12)",
  background: "white",
  cursor: "pointer",
  fontWeight: 900,
};
