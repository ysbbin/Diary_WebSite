"use client";

import React, { useEffect, useMemo, useState } from "react";
import MonthGrid, { type CalendarEvent } from "@/components/calendar/MonthGrid";
import TagSidebar, { type Tag } from "@/components/calendar/TagSidebar";
import MiniMonthCalendar from "@/components/calendar/MiniMonthCalendar";
import UserMenu from "@/components/auth/UserMenu";
import { getHolidayEvents } from "@/lib/holidayEvents";

const LS_TAGS = "diary.tags.v1";

const HOLIDAY_TAG: Tag = { id: "holiday", name: "Holiday", color: "#e53935" };

const DEFAULT_TAGS: Tag[] = [
  { id: "t1", name: "Work", color: "#3b82f6" },
  { id: "t2", name: "Personal", color: "#22c55e" },
  { id: "t3", name: "Urgent", color: "#ef4444" },
  HOLIDAY_TAG,
];

function ensureHolidayTag(inputTags: Tag[]): Tag[] {
  const has = inputTags.some((t) => t.id === HOLIDAY_TAG.id);
  return has ? inputTags : [...inputTags, HOLIDAY_TAG];
}

type ApiEvent = {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  memo?: string | null;
  tagId?: string | null;
};

function monthRange(y: number, m: number) {
  const from = new Date(y, m, 1, 0, 0, 0, 0);
  const to = new Date(y, m + 1, 0, 23, 59, 59, 999);
  return { from, to };
}

function apiToUiEvent(e: ApiEvent): CalendarEvent {
  return {
    id: e.id,
    title: e.title,
    start: new Date(e.startAt),
    end: new Date(e.endAt),
    tagId: (e.tagId ?? "t1") as any,
  };
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") || "";
function apiUrl(path: string) {
  if (API_BASE) return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  if (path.startsWith("/events")) return `/api${path}`;
  return path;
}

export default function CalendarPage() {
  const [mounted, setMounted] = useState(false);

  const now = useMemo(() => new Date(), []);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const [tags, setTags] = useState<Tag[]>(DEFAULT_TAGS);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    DEFAULT_TAGS.map((t) => t.id)
  );

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [holidayEvents, setHolidayEvents] = useState<CalendarEvent[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  useEffect(() => {
    setMounted(true);

    // tags load
    try {
      const storedTags = localStorage.getItem(LS_TAGS);
      if (storedTags) {
        const parsed = JSON.parse(storedTags);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const nextTags = ensureHolidayTag(parsed);
          setTags(nextTags);
          setSelectedTagIds(nextTags.map((t: Tag) => t.id));
        } else {
          setTags(DEFAULT_TAGS);
          setSelectedTagIds(DEFAULT_TAGS.map((t) => t.id));
        }
      } else {
        setTags(DEFAULT_TAGS);
        setSelectedTagIds(DEFAULT_TAGS.map((t) => t.id));
      }
    } catch {
      setTags(DEFAULT_TAGS);
      setSelectedTagIds(DEFAULT_TAGS.map((t) => t.id));
    }
  }, []);

  // tags save
  useEffect(() => {
    if (!mounted) return;
    try {
      const nextTags = ensureHolidayTag(tags);
      localStorage.setItem(LS_TAGS, JSON.stringify(nextTags));
    } catch {}
  }, [mounted, tags]);

  // holidays
  useEffect(() => {
    if (!mounted) return;
    (async () => {
      try {
        const hol = await getHolidayEvents(year);
        setHolidayEvents(hol);
      } catch {
        setHolidayEvents([]);
      }
    })();
  }, [mounted, year]);

  async function reloadEvents(targetYear = year, targetMonth = month) {
    setLoadingEvents(true);
    try {
      const { from, to } = monthRange(targetYear, targetMonth);
      const qs = new URLSearchParams({
        from: from.toISOString(),
        to: to.toISOString(),
      });

      const url = apiUrl(`/events?${qs.toString()}`);
      console.log("[events] GET", url);

      const res = await fetch(url, {
        cache: "no-store",
        credentials: "include",
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`GET 실패 (${res.status})\n${txt}`);
      }

      const data = await res.json().catch(() => ({}));
      const list: ApiEvent[] = Array.isArray(data?.events) ? data.events : [];
      setEvents(list.map(apiToUiEvent));
    } finally {
      setLoadingEvents(false);
    }
  }

  useEffect(() => {
    if (!mounted) return;
    reloadEvents(year, month).catch((e) => {
      console.error(e);
      setEvents([]);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, year, month]);

  const allEvents = useMemo(() => [...events, ...holidayEvents], [events, holidayEvents]);

  const filteredEvents = useMemo(() => {
    if (selectedTagIds.length === 0) return [];
    return allEvents.filter((e) => selectedTagIds.includes(e.tagId));
  }, [allEvents, selectedTagIds]);

  function prevMonth() {
    const d = new Date(year, month - 1, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }

  function nextMonth() {
    const d = new Date(year, month + 1, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }

  if (!mounted) return <div style={{ padding: 24 }} />;

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "grid", gap: 12 }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>Calendar</h1>
            <div style={{ marginTop: 6, opacity: 0.7 }}>
              월간 뷰 · 드래그로 기간 선택
              {loadingEvents ? (
                <span style={{ marginLeft: 10, fontWeight: 800 }}>· 불러오는 중...</span>
              ) : null}
            </div>
          </div>

          <UserMenu />
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            marginTop: 4,
          }}
        >
          <button onClick={prevMonth} style={btnStyle}>
            ←
          </button>

          <div style={{ fontWeight: 900, minWidth: 140, textAlign: "center" }}>
            {new Date(year, month, 1).toLocaleString("ko-KR", {
              year: "numeric",
              month: "long",
            })}
          </div>

          <button onClick={nextMonth} style={btnStyle}>
            →
          </button>
        </div>
      </div>

      <div
        style={{
          marginTop: 16,
          display: "grid",
          gridTemplateColumns: "320px 1fr",
          gap: 16,
          alignItems: "start",
        }}
      >
        <div style={{ display: "grid", gap: 12 }}>
          <div style={panel}>
            <MiniMonthCalendar
              year={year}
              month={month}
              onChangeMonth={(y, m) => {
                setYear(y);
                setMonth(m);
              }}
            />
          </div>

          <div style={panel}>
            <TagSidebar
              tags={tags}
              selectedTagIds={selectedTagIds}
              onChangeSelectedTagIds={setSelectedTagIds}
              onAddTag={(tag) => {
                setTags((prev) => ensureHolidayTag([...prev, tag]));
                setSelectedTagIds((prev) => Array.from(new Set([...prev, tag.id])));
              }}
              onUpdateTag={(next) => {
                setTags((prev) =>
                  ensureHolidayTag(prev.map((t) => (t.id === next.id ? next : t)))
                );
              }}
              onDeleteTag={(id) => {
                setSelectedTagIds((prev) => prev.filter((x) => x !== id));
                setTags((prevTags) => ensureHolidayTag(prevTags.filter((t) => t.id !== id)));
              }}
            />
          </div>
        </div>

        <div style={{ ...panel, minWidth: 0 }}>
          <MonthGrid
            year={year}
            month={month}
            tags={tags}
            events={filteredEvents}
            onCreateEvent={async (ev) => {
              const payload = {
                title: ev.title,
                startAt: ev.start.toISOString(),
                endAt: ev.end.toISOString(),
                memo: "",
                tagId: ev.tagId ?? "t1",
              };

              const url = apiUrl("/events");
              console.log("[events] POST", url, payload);

              const res = await fetch(url, {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(payload),
                credentials: "include",
              });

              if (!res.ok) {
                const txt = await res.text().catch(() => "");
                alert(`일정 저장 실패 (${res.status})\n${txt}`);
                return;
              }

              await reloadEvents();
            }}
            onUpdateEvent={async (ev) => {
              const payload = {
                title: ev.title,
                startAt: ev.start.toISOString(),
                endAt: ev.end.toISOString(),
                memo: "",
                tagId: ev.tagId ?? "t1",
              };

              const url = apiUrl(`/events/${ev.id}`);
              console.log("[events] PATCH", url, payload);

              const res = await fetch(url, {
                method: "PATCH",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(payload),
                credentials: "include",
              });

              if (!res.ok) {
                const txt = await res.text().catch(() => "");
                alert(`일정 수정 실패 (${res.status})\n${txt}`);
                return;
              }

              await reloadEvents();
            }}
            onDeleteEvent={async (id) => {
              const url = apiUrl(`/events/${id}`);
              console.log("[events] DELETE", url);

              const res = await fetch(url, {
                method: "DELETE",
                credentials: "include",
              });

              if (!res.ok) {
                const txt = await res.text().catch(() => "");
                alert(`일정 삭제 실패 (${res.status})\n${txt}`);
                return;
              }

              await reloadEvents();
            }}
          />
        </div>
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 12,
  border: "1px solid rgba(0,0,0,0.12)",
  background: "white",
  cursor: "pointer",
};

const panel: React.CSSProperties = {
  background: "white",
  borderRadius: 16,
  border: "1px solid rgba(0,0,0,0.08)",
  boxShadow: "0 1px 0 rgba(0,0,0,0.02)",
  padding: 12,
};
