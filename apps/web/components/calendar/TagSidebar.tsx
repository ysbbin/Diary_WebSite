"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

export type Tag = { id: string; name: string; color: string };

export default function TagSidebar({
  tags,
  selectedTagIds,
  onChangeSelectedTagIds,
  onAddTag,
  onUpdateTag,
  onDeleteTag,
}: {
  tags: Tag[];
  selectedTagIds: string[];
  onChangeSelectedTagIds: (ids: string[]) => void;
  onAddTag: (tag: Tag) => void;
  onUpdateTag: (tag: Tag) => void;
  onDeleteTag: (id: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");

  const palette = useMemo(
    () => ["#3b82f6", "#22c55e", "#ef4444", "#a855f7", "#f97316", "#14b8a6", "#eab308", "#0ea5e9"],
    []
  );
  const [color, setColor] = useState(() => palette[tags.length % palette.length]);

  // ===== per-tag menu/edit =====
  const [menuOpenTagId, setMenuOpenTagId] = useState<string | null>(null);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocDown(e: MouseEvent) {
      const el = e.target as HTMLElement | null;
      if (!el) return;
      if (rootRef.current && rootRef.current.contains(el)) return;
      setMenuOpenTagId(null);
      setEditingTagId(null);
    }
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, []);

  function toggle(id: string) {
    if (selectedTagIds.includes(id)) {
      onChangeSelectedTagIds(selectedTagIds.filter((x) => x !== id));
    } else {
      onChangeSelectedTagIds([...selectedTagIds, id]);
    }
  }

  function openAdd() {
    setAdding((v) => {
      const next = !v;
      if (next) {
        setName("");
        setColor(palette[tags.length % palette.length]);
      }
      return next;
    });
  }

  function add() {
    const trimmed = name.trim();
    if (!trimmed) return;

    const tag: Tag = {
      id: crypto.randomUUID(),
      name: trimmed,
      color,
    };

    onAddTag(tag);

    setName("");
    setColor(palette[(tags.length + 1) % palette.length]);
    setAdding(false);
  }

  function openEdit(tag: Tag) {
    setEditingTagId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color);
  }

  function saveEdit() {
    if (!editingTagId) return;
    const trimmed = editName.trim();
    if (!trimmed) return;

    onUpdateTag({ id: editingTagId, name: trimmed, color: editColor });
    setEditingTagId(null);
    setMenuOpenTagId(null);
  }

  return (
    <div ref={rootRef}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div style={{ fontWeight: 900 }}>내 캘린더</div>
        <button
          onClick={openAdd}
          style={{
            border: "1px solid rgba(0,0,0,0.12)",
            background: "white",
            borderRadius: 12,
            padding: "6px 10px",
            cursor: "pointer",
            fontWeight: 800,
          }}
        >
          + 태그
        </button>
      </div>

      {adding && (
        <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <label
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                border: "1px solid rgba(0,0,0,0.12)",
                background: "white",
                position: "relative",
                cursor: "pointer",
                flex: "0 0 44px",
              }}
              title="색상 선택"
            >
              <div
                style={{
                  position: "absolute",
                  inset: 6,
                  borderRadius: 10,
                  background: color,
                  boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.12)",
                }}
              />
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}
              />
            </label>

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="태그 이름"
              style={{
                flex: 1,
                minWidth: 0,
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.12)",
                outline: "none",
              }}
            />

            <button
              onClick={add}
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                border: "none",
                background: "black",
                color: "white",
                cursor: "pointer",
                fontWeight: 900,
                whiteSpace: "nowrap",
                flex: "0 0 auto",
              }}
            >
              추가
            </button>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {palette.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 999,
                  border: c === color ? "2px solid rgba(0,0,0,0.5)" : "1px solid rgba(0,0,0,0.15)",
                  background: c,
                  cursor: "pointer",
                }}
                title={c}
              />
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
        {tags.map((t) => {
          const checked = selectedTagIds.includes(t.id);
          const menuOpen = menuOpenTagId === t.id;
          const editing = editingTagId === t.id;

          return (
            <div key={t.id} style={{ position: "relative" }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 10px",
                  borderRadius: 14,
                  border: "1px solid rgba(0,0,0,0.08)",
                  cursor: "pointer",
                  background: "white",
                }}
              >
                <input type="checkbox" checked={checked} onChange={() => toggle(t.id)} />
                <span
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 4,
                    background: t.color,
                    display: "inline-block",
                  }}
                />
                <span style={{ fontWeight: 800, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
                  {t.name}
                </span>

                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setMenuOpenTagId((prev) => (prev === t.id ? null : t.id));
                    setEditingTagId(null);
                  }}
                  style={{
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    padding: "4px 6px",
                    borderRadius: 8,
                    fontWeight: 900,
                    opacity: 0.6,
                  }}
                  aria-label="태그 메뉴"
                  title="태그 메뉴"
                >
                  ⋮
                </button>
              </label>

              {/* 메뉴 팝오버 */}
              {menuOpen && !editing && (
                <div
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  style={{
                    position: "absolute",
                    right: 8,
                    top: 44,
                    width: 200,
                    background: "white",
                    border: "1px solid rgba(0,0,0,0.12)",
                    borderRadius: 12,
                    boxShadow: "0 12px 30px rgba(0,0,0,0.12)",
                    padding: 8,
                    zIndex: 50,
                  }}
                >
                  <button
                    onClick={() => openEdit(t)}
                    style={menuItem}
                  >
                    이름/색상 수정
                  </button>
                  <button
                    onClick={() => {
                      if (!window.confirm("이 태그를 삭제할까?")) return;
                      onDeleteTag(t.id);
                      setMenuOpenTagId(null);
                      setEditingTagId(null);
                    }}
                    style={{ ...menuItem, color: "#ef4444" }}
                  >
                    삭제
                  </button>
                </div>
              )}

              {/* 인라인 수정 팝오버 */}
              {menuOpen && editing && (
                <div
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  style={{
                    position: "absolute",
                    right: 8,
                    top: 44,
                    width: 260,
                    background: "white",
                    border: "1px solid rgba(0,0,0,0.12)",
                    borderRadius: 12,
                    boxShadow: "0 12px 30px rgba(0,0,0,0.12)",
                    padding: 10,
                    zIndex: 60,
                    display: "grid",
                    gap: 10,
                  }}
                >
                  <div style={{ fontWeight: 900, fontSize: 13 }}>태그 수정</div>

                  <div style={{ display: "grid", gap: 6 }}>
                    <div style={labelStyle}>이름</div>
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      style={inputStyle}
                      placeholder="태그 이름"
                    />
                  </div>

                  <div style={{ display: "grid", gap: 6 }}>
                    <div style={labelStyle}>색상</div>

                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <label
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 12,
                          border: "1px solid rgba(0,0,0,0.12)",
                          background: "white",
                          position: "relative",
                          cursor: "pointer",
                          flex: "0 0 36px",
                        }}
                        title="색상 선택"
                      >
                        <div
                          style={{
                            position: "absolute",
                            inset: 6,
                            borderRadius: 8,
                            background: editColor,
                            boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.12)",
                          }}
                        />
                        <input
                          type="color"
                          value={editColor}
                          onChange={(e) => setEditColor(e.target.value)}
                          style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }}
                        />
                      </label>

                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {palette.map((c) => (
                          <button
                            key={c}
                            onClick={() => setEditColor(c)}
                            style={{
                              width: 18,
                              height: 18,
                              borderRadius: 999,
                              border: c === editColor ? "2px solid rgba(0,0,0,0.5)" : "1px solid rgba(0,0,0,0.15)",
                              background: c,
                              cursor: "pointer",
                            }}
                            title={c}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                    <button
                      onClick={() => {
                        setEditingTagId(null);
                        setMenuOpenTagId(null);
                      }}
                      style={miniBtn}
                    >
                      취소
                    </button>
                    <button
                      onClick={saveEdit}
                      style={{ ...miniBtn, background: "rgba(59,130,246,0.12)" }}
                    >
                      저장
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 12, fontSize: 12, opacity: 0.7 }}>
        체크된 태그의 일정만 보여.
      </div>
    </div>
  );
}

const menuItem: React.CSSProperties = {
  width: "100%",
  textAlign: "left",
  border: "none",
  background: "transparent",
  cursor: "pointer",
  padding: "10px 10px",
  borderRadius: 10,
  fontWeight: 900,
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 900,
  opacity: 0.75,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(0,0,0,0.12)",
  outline: "none",
  fontWeight: 800,
};

const miniBtn: React.CSSProperties = {
  border: "1px solid rgba(0,0,0,0.12)",
  background: "white",
  borderRadius: 10,
  padding: "6px 10px",
  cursor: "pointer",
  fontWeight: 900,
  fontSize: 12,
};
