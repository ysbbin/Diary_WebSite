"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

type MeResponse =
  | {
      ok: true;
      user: { id: string; email: string; name: string | null; createdAt?: string };
    }
  | { ok: false; message?: string };

function initials(nameOrEmail: string) {
  const s = (nameOrEmail ?? "").trim();
  if (!s) return "U";
  const parts = s.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? s[0];
  const second = parts.length > 1 ? parts[1]?.[0] : "";
  return (first + second).toUpperCase();
}

export default function UserMenu() {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [me, setMe] = useState<MeResponse | null>(null);

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);

  // ✅ 포탈로 뜬 드롭다운 DOM도 잡기 위한 ref
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  // ✅ 최초 마운트 시 내 정보 로드(아바타 처음부터 이름 반영)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        const data = (await res.json().catch(() => ({}))) as MeResponse;
        setMe(data);
      } catch {
        setMe({ ok: false, message: "내 정보 로딩 실패" });
      }
    })();
  }, []);

  // ✅ 바깥 클릭/ESC 닫기 (포탈 드롭다운도 '안쪽'으로 인정)
  useEffect(() => {
    function onDown(e: MouseEvent) {
      const target = e.target as Node;

      // 버튼 영역(원래 wrapper)
      if (wrapRef.current && wrapRef.current.contains(target)) return;

      // ✅ 포탈로 뜬 드롭다운 영역
      if (dropdownRef.current && dropdownRef.current.contains(target)) return;

      setOpen(false);
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  // ✅ 드롭다운 위치 계산(스크롤/리사이즈 대응)
  useEffect(() => {
    if (!open) return;

    const update = () => {
      const r = btnRef.current?.getBoundingClientRect() ?? null;
      setAnchorRect(r);
    };

    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);

    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  const displayName = useMemo(() => {
    if (me?.ok) return me.user.name || me.user.email;
    return "내 계정";
  }, [me]);

  const displayEmail = useMemo(() => {
    if (me?.ok) return me.user.email;
    return "";
  }, [me]);

  const avatarText = useMemo(() => initials(displayName), [displayName]);

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setOpen(false);
      router.replace("/login");
      router.refresh();
    }
  }

  const dropdown =
    open && anchorRect
      ? createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: "fixed",
              top: anchorRect.bottom + 8,
              left: anchorRect.right - 280,
              width: 280,
              background: "white",
              borderRadius: 16,
              border: "1px solid rgba(0,0,0,0.10)",
              boxShadow: "0 12px 28px rgba(0,0,0,0.12)",
              overflow: "hidden",
              zIndex: 999999,
            }}
            // ✅ 혹시 모를 이벤트 버블 방지(안전장치)
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: 14, borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 999,
                    border: "1px solid rgba(0,0,0,0.12)",
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 900,
                  }}
                >
                  {avatarText}
                </div>

                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 900,
                      lineHeight: 1.2,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {displayName}
                  </div>

                  {displayEmail && (
                    <div
                      style={{
                        fontSize: 12,
                        opacity: 0.7,
                        marginTop: 4,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {displayEmail}
                    </div>
                  )}

                  {me && !me.ok && (
                    <div style={{ fontSize: 12, color: "rgba(239,68,68,0.95)", marginTop: 6 }}>
                      {me.message || "내 정보 오류"}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div style={{ padding: 8 }}>
              <button
                type="button"
                onClick={logout}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "10px",
                  borderRadius: 12,
                  border: "1px solid rgba(0,0,0,0.10)",
                  background: "white",
                  cursor: "pointer",
                  fontWeight: 800,
                }}
              >
                로그아웃
              </button>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: 34,
          height: 34,
          borderRadius: 999,
          border: "1px solid rgba(0,0,0,0.12)",
          background: "white",
          display: "grid",
          placeItems: "center",
          fontWeight: 900,
          cursor: "pointer",
          userSelect: "none",
        }}
        aria-label="user menu"
      >
        {avatarText}
      </button>

      {dropdown}
    </div>
  );
}
