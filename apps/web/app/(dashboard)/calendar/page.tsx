// apps/web/app/(dashboard)/calendar/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import MonthGrid, { type CalendarEvent } from "@/components/calendar/MonthGrid";
import TagSidebar, { type Tag } from "@/components/calendar/TagSidebar";
import MiniMonthCalendar from "@/components/calendar/MiniMonthCalendar";

// ✅ 너가 이미 만들어둔 "연도 -> CalendarEvent[] 공휴일" 변환 함수
import { getHolidayEvents } from "@/lib/holidayEvents";

const LS_TAGS = "diary.tags.v1";
const LS_EVENTS = "diary.events.v1";

const HOLIDAY_TAG: Tag = { id: "holiday", name: "Holiday", color: "#e53935" };

const DEFAULT_TAGS: Tag[] = [
  { id: "t1", name: "Work", color: "#3b82f6" },
  { id: "t2", name: "Personal", color: "#22c55e" },
  { id: "t3", name: "Urgent", color: "#ef4444" },
  // ✅ 공휴일 태그(고정)
  HOLIDAY_TAG,
];

function reviveEvents(raw: any[]): CalendarEvent[] {
  return (raw ?? []).map((e) => ({
    ...e,
    start: new Date(e.start),
    end: new Date(e.end),
  }));
}

function ensureHolidayTag(inputTags: Tag[]): Tag[] {
  const has = inputTags.some((t) => t.id === HOLIDAY_TAG.id);
  return has ? inputTags : [...inputTags, HOLIDAY_TAG];
}

export default function CalendarPage() {
  const [mounted, setMounted] = useState(false);

  const now = useMemo(() => new Date(), []);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  const [tags, setTags] = useState<Tag[]>(DEFAULT_TAGS);
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  // ✅ 공휴일은 별도 state (localStorage 저장 X)
  const [holidayEvents, setHolidayEvents] = useState<CalendarEvent[]>([]);

  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    DEFAULT_TAGS.map((t) => t.id)
  ); // ✅ 처음부터 전부 체크

  // ✅ 마운트 후 localStorage 로딩
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
          setSelectedTagIds(nextTags.map((t: Tag) => t.id)); // ✅ 로딩된 태그도 전부 체크
        }
      } else {
        // localStorage에 없으면 DEFAULT_TAGS 그대로(이미 holiday 포함)
        setTags(DEFAULT_TAGS);
        setSelectedTagIds(DEFAULT_TAGS.map((t) => t.id));
      }
    } catch {
      setTags(DEFAULT_TAGS);
      setSelectedTagIds(DEFAULT_TAGS.map((t) => t.id));
    }

    // events load (유저 일정만)
    try {
      const storedEvents = localStorage.getItem(LS_EVENTS);
      if (storedEvents) {
        const parsed = JSON.parse(storedEvents);
        if (Array.isArray(parsed)) setEvents(reviveEvents(parsed));
      }
    } catch {}
  }, []);

  // ✅ 공휴일 로딩: mounted 이후 + year 변경 시
  useEffect(() => {
    if (!mounted) return;

    (async () => {
      try {
        const hol = await getHolidayEvents(year); // CalendarEvent[]
        setHolidayEvents(hol);
      } catch {
        setHolidayEvents([]);
      }
    })();
  }, [mounted, year]);

  // ✅ localStorage 저장 (tags)
  useEffect(() => {
    if (!mounted) return;
    try {
      // holiday 태그가 빠지지 않도록 보정해서 저장
      const nextTags = ensureHolidayTag(tags);
      localStorage.setItem(LS_TAGS, JSON.stringify(nextTags));
    } catch {}
  }, [mounted, tags]);

  // ✅ localStorage 저장 (유저 일정 events만)
  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(LS_EVENTS, JSON.stringify(events));
    } catch {}
  }, [mounted, events]);

  // ✅ MonthGrid로 내려갈 전체 이벤트 = 유저 + 공휴일
  const allEvents = useMemo(() => {
    return [...events, ...holidayEvents];
  }, [events, holidayEvents]);

  // ✅ “체크된 태그만” 일정 표시 (아무것도 체크 안 하면 아무것도 안 보이게)
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

  if (!mounted) {
    return <div style={{ padding: 24 }} />;
  }

  return (
    <div style={{ padding: 24 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900 }}>Calendar</h1>
          <div style={{ marginTop: 4, opacity: 0.7 }}>
            월간 뷰 · 드래그로 기간 선택(하이라이트)
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={prevMonth} style={btnStyle}>
            ←
          </button>
          <div style={{ fontWeight: 900, minWidth: 140, textAlign: "center" }}>
            {new Date(year, month, 1).toLocaleString(undefined, {
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
                setSelectedTagIds((prev) =>
                  Array.from(new Set([...prev, tag.id]))
                ); // ✅ 새 태그도 자동 체크
              }}
              onUpdateTag={(next) => {
                setTags((prev) =>
                    ensureHolidayTag(prev.map((t) => (t.id === next.id ? next : t)))
                );
                }}
              onDeleteTag={(id) => {
                // ✅ holiday 태그는 삭제 금지
                if (id === HOLIDAY_TAG.id) return;

                // ✅ 태그 삭제 시: 선택에서도 제거
                setSelectedTagIds((prev) => prev.filter((x) => x !== id));

                // ✅ 일정의 tagId 처리: 남은 태그가 있으면 첫 태그로 이동, 없으면 삭제
                setTags((prevTags) => {
                  const nextTagsRaw = prevTags.filter((t) => t.id !== id);
                  const nextTags = ensureHolidayTag(nextTagsRaw);

                  setEvents((prevEvents) => {
                    if (nextTags.length === 0) return prevEvents.filter((e) => e.tagId !== id);
                    const fallbackId = nextTags[0].id;
                    return prevEvents.map((e) =>
                      e.tagId === id ? { ...e, tagId: fallbackId } : e
                    );
                  });

                  return nextTags;
                });
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
            onCreateEvent={(ev) => setEvents((prev) => [...prev, ev])}
            onUpdateEvent={(ev) =>
              setEvents((prev) => prev.map((x) => (x.id === ev.id ? ev : x)))
            }
            onDeleteEvent={(id) => setEvents((prev) => prev.filter((x) => x.id !== id))}
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
