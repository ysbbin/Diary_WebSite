// apps/web/components/calendar/MonthGrid.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Tag } from "@/components/calendar/TagSidebar";

type DateRange = {
  start: Date | null;
  end: Date | null;
};

export type CalendarEvent = {
  id: string;
  title: string;
  start: Date; // day-based
  end: Date; // day-based (inclusive)
  tagId: string;
};

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
function clampToDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function minDate(a: Date, b: Date) {
  return a.getTime() <= b.getTime() ? a : b;
}
function maxDate(a: Date, b: Date) {
  return a.getTime() >= b.getTime() ? a : b;
}
function inRange(d: Date, start: Date, end: Date) {
  const t = d.getTime();
  return t >= start.getTime() && t <= end.getTime();
}
function fmt(d: Date) {
  return d.toLocaleDateString();
}

// YYYY-MM-DD <-> Date (local, day clamp)
function toInputDate(d: Date) {
  const x = clampToDay(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function fromInputDate(s: string) {
  const [y, m, d] = s.split("-").map((v) => parseInt(v, 10));
  return clampToDay(new Date(y, (m || 1) - 1, d || 1));
}

// popover positioning
function smartPopoverLeft(rect: DOMRect, popoverW: number, margin = 12) {
  const vw = window.innerWidth;
  const rightSpace = vw - rect.left;
  const leftSpace = rect.right;

  if (rightSpace < popoverW + margin && leftSpace >= popoverW + margin) {
    const left = rect.right - popoverW;
    return Math.max(margin, left);
  }

  const minLeft = margin;
  const maxLeft = Math.max(margin, vw - popoverW - margin);
  return Math.min(Math.max(rect.left, minLeft), maxLeft);
}

type BarSegment = {
  ev: CalendarEvent;
  weekIndex: number; // 0..5
  startCol: number; // 0..6
  span: number; // 1..7
  lane: number; // 0..n
};

const DRAFT_ID = "__draft__";

export default function MonthGrid({
  year,
  month, // 0-11
  tags,
  events,
  onCreateEvent,
  onUpdateEvent,
  onDeleteEvent,
  onRangeChange,
}: {
  year: number;
  month: number;
  tags: Tag[];
  events: CalendarEvent[];
  onCreateEvent: (ev: CalendarEvent) => void;
  onUpdateEvent?: (ev: CalendarEvent) => void;
  onDeleteEvent?: (id: string) => void;
  onRangeChange?: (range: DateRange) => void;
}) {
  // ========= UI Tuning =========
  const GRID_GAP = 8;
  const MAX_LANES = 3;
  const CELL_PADDING = 10;
  const CELL_MIN_H = 120;

  const HEADER_H = 32;
  const BAR_H = 16;

  const BAR_GAP_Y = 2;
  const LANE_H = BAR_H + BAR_GAP_Y;

  const BAR_INSET_L = 2;
  const BAR_INSET_R = 4;

  const POPOVER_W = 360;
  // ============================

  const today = useMemo(() => clampToDay(new Date()), []);
  const monthDate = useMemo(() => new Date(year, month, 1), [year, month]);

  // 6주(42칸) 고정
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(monthDate));
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [monthDate]);

  // ===== 드래그로 range 선택 =====
  const [range, setRange] = useState<DateRange>({ start: null, end: null });
  const draggingRef = useRef(false);
  const anchorRef = useRef<Date | null>(null);
  const lastHoverRectRef = useRef<DOMRect | null>(null);
  const openedThisUpRef = useRef(false);

  function setAndEmit(next: DateRange) {
    setRange(next);
    onRangeChange?.(next);
  }

  const start = range.start ? clampToDay(range.start) : null;
  const end = range.end ? clampToDay(range.end) : null;

  // ===== 새 일정 생성 Popover =====
  const [createOpen, setCreateOpen] = useState(false);
  const [createAnchorRect, setCreateAnchorRect] = useState<DOMRect | null>(null);

  const [createTitle, setCreateTitle] = useState("");
  const [createStart, setCreateStart] = useState("");
  const [createEnd, setCreateEnd] = useState("");
  const [createTagId, setCreateTagId] = useState(() => tags[0]?.id ?? "");

  useEffect(() => {
    if (!createTagId && tags[0]?.id) setCreateTagId(tags[0].id);
  }, [tags, createTagId]);

  function openCreatePopoverAt(rect: DOMRect) {
    if (!start || !end) return;

    setCreateAnchorRect(rect);
    setCreateTitle("");
    setCreateStart(toInputDate(start));
    setCreateEnd(toInputDate(end));
    setCreateTagId(tags[0]?.id ?? "");
    setCreateOpen(true);
  }

  function handleMouseDown(e: React.MouseEvent, d: Date) {
    openedThisUpRef.current = false;
    draggingRef.current = true;

    const day = clampToDay(d);
    anchorRef.current = day;

    lastHoverRectRef.current = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setAndEmit({ start: day, end: day });

    setCreateOpen(false);
    setMoreOpen(false);
    setDetailOpen(false);
  }

  function handleMouseEnter(e: React.MouseEvent, d: Date) {
    if (!draggingRef.current) return;
    const anchor = anchorRef.current;
    if (!anchor) return;

    const day = clampToDay(d);
    const s = minDate(anchor, day);
    const ee = maxDate(anchor, day);
    setAndEmit({ start: s, end: ee });

    lastHoverRectRef.current = (e.currentTarget as HTMLElement).getBoundingClientRect();
  }

  function finalizeDragAt(rect: DOMRect | null) {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    if (!rect) return;
    openCreatePopoverAt(rect);
  }

  function handleCellMouseUp(e: React.MouseEvent) {
    if (!draggingRef.current) return;
    if (openedThisUpRef.current) return;

    openedThisUpRef.current = true;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    finalizeDragAt(rect);
  }

  useEffect(() => {
    function onDocMouseUp() {
      if (!draggingRef.current) return;

      if (openedThisUpRef.current) {
        openedThisUpRef.current = false;
        draggingRef.current = false;
        return;
      }

      openedThisUpRef.current = true;
      finalizeDragAt(lastHoverRectRef.current);
    }

    document.addEventListener("mouseup", onDocMouseUp);
    return () => document.removeEventListener("mouseup", onDocMouseUp);
  }, []);

  // ===== +N more Popover =====
  const [moreOpen, setMoreOpen] = useState(false);
  const [moreAnchorRect, setMoreAnchorRect] = useState<DOMRect | null>(null);
  const [moreDate, setMoreDate] = useState<Date | null>(null);
  const [moreItems, setMoreItems] = useState<CalendarEvent[]>([]);

  function openMore(rect: DOMRect, date: Date, items: CalendarEvent[]) {
    setMoreAnchorRect(rect);
    setMoreDate(date);
    setMoreItems(items);
    setMoreOpen(true);
    setCreateOpen(false);
    setDetailOpen(false);
  }

  // ===== 일정 상세 Popover + 편집 =====
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailAnchorRect, setDetailAnchorRect] = useState<DOMRect | null>(null);
  const [detailEvent, setDetailEvent] = useState<CalendarEvent | null>(null);

  const [detailEditing, setDetailEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editTagId, setEditTagId] = useState("");

  function openDetail(rect: DOMRect, ev: CalendarEvent) {
    setDetailAnchorRect(rect);
    setDetailEvent(ev);

    setDetailEditing(false);
    setEditTitle(ev.title);
    setEditStart(toInputDate(ev.start));
    setEditEnd(toInputDate(ev.end));
    setEditTagId(ev.tagId);

    setDetailOpen(true);
    setCreateOpen(false);
    setMoreOpen(false);
  }

  // ✅ 바깥 클릭 시 닫기 (popover 내부 클릭은 유지)
  const createPopoverRef = useRef<HTMLDivElement | null>(null);
  const morePopoverRef = useRef<HTMLDivElement | null>(null);
  const detailPopoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocDown(e: MouseEvent) {
      const target = e.target as Node | null;
      if (!target) return;

      if (
        createPopoverRef.current?.contains(target) ||
        morePopoverRef.current?.contains(target) ||
        detailPopoverRef.current?.contains(target)
      ) {
        return;
      }

      if (moreOpen) setMoreOpen(false);
      if (createOpen) setCreateOpen(false);
      if (detailOpen) setDetailOpen(false);
    }

    document.addEventListener("mousedown", onDocDown, true);
    return () => document.removeEventListener("mousedown", onDocDown, true);
  }, [moreOpen, createOpen, detailOpen]);

  // ✅ 새 일정 날짜 유효성
  const createDateInvalid = useMemo(() => {
    if (!createOpen) return false;
    if (!createStart || !createEnd) return false;
    const s = fromInputDate(createStart);
    const e = fromInputDate(createEnd);
    return s.getTime() > e.getTime();
  }, [createOpen, createStart, createEnd]);

  // ✅ 새 일정 폼 날짜 바꾸면: 선택 하이라이트도 같이 업데이트
  useEffect(() => {
    if (!createOpen) return;
    if (!createStart || !createEnd) return;
    if (createDateInvalid) return;

    const s = fromInputDate(createStart);
    const e = fromInputDate(createEnd);
    setAndEmit({ start: s, end: e });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createOpen, createStart, createEnd, createDateInvalid]);

  // ✅ 수정 날짜 유효성
  const editDateInvalid = useMemo(() => {
    if (!detailEditing) return false;
    if (!editStart || !editEnd) return false;
    const s = fromInputDate(editStart);
    const e = fromInputDate(editEnd);
    return s.getTime() > e.getTime();
  }, [detailEditing, editStart, editEnd]);

  // ✅ draft(작성 중) 이벤트 만들기: 저장 전에도 bar가 “즉시” 늘어나게
  const draftEvent = useMemo<CalendarEvent | null>(() => {
    if (!createOpen) return null;
    if (!createStart || !createEnd) return null;
    if (createDateInvalid) return null;
    if (!createTagId) return null;

    const s = fromInputDate(createStart);
    const e = fromInputDate(createEnd);

    return {
      id: DRAFT_ID,
      title: (createTitle.trim() || "(제목 없음)") + " ",
      start: s,
      end: e,
      tagId: createTagId,
    };
  }, [createOpen, createStart, createEnd, createDateInvalid, createTagId, createTitle]);

  const renderEvents = useMemo(() => {
    return draftEvent ? [...events, draftEvent] : events;
  }, [events, draftEvent]);

    // =========================
    // 멀티데이 bar segment + lane 배치 (구글식: 이벤트별 lane 고정)
    // =========================
    const barSegments = useMemo<BarSegment[]>(() => {
    const gridStart = clampToDay(days[0]);
    const gridEnd = clampToDay(days[41]);

    // --------
    // 0) 유틸: day index / mask
    // --------
    const MS_PER_DAY = 24 * 3600 * 1000;
    const dayIndex = (d: Date) =>
        Math.floor((clampToDay(d).getTime() - gridStart.getTime()) / MS_PER_DAY);

    const segMask = (startCol: number, span: number) => {
        // span 1..7, startCol 0..6
        const bits = (1 << span) - 1; // e.g. span=3 => 0b111
        return bits << startCol;
    };

    // --------
    // 1) 이벤트별로 "week segment 목록" 만들기
    //    (normal/draft 분리)
    // --------
    type SegLite = Omit<BarSegment, "lane">;
    type EvPack = {
        ev: CalendarEvent;
        isDraft: boolean;
        startIndex: number; // grid 기준
        endIndex: number;
        duration: number;
        segs: SegLite[];
    };

    const packs: EvPack[] = [];

    // renderEvents = (events + draftEvent) 이미 위에서 만들어둔 거 사용
    for (const ev of renderEvents) {
        const isDraft = ev.id === DRAFT_ID;

        const evStart = clampToDay(ev.start);
        const evEnd = clampToDay(ev.end);

        const safeStart = minDate(evStart, evEnd);
        const safeEnd = maxDate(evStart, evEnd);

        const clippedStart = maxDate(safeStart, gridStart);
        const clippedEnd = minDate(safeEnd, gridEnd);
        if (clippedStart.getTime() > clippedEnd.getTime()) continue;

        const startIdx = dayIndex(clippedStart);
        const endIdx = dayIndex(clippedEnd);
        const startWeek = Math.floor(startIdx / 7);
        const endWeek = Math.floor(endIdx / 7);

        const segs: SegLite[] = [];
        for (let w = startWeek; w <= endWeek; w++) {
        const weekStartIndex = w * 7;
        const weekEndIndex = w * 7 + 6;

        const segStartIndex = Math.max(startIdx, weekStartIndex);
        const segEndIndex = Math.min(endIdx, weekEndIndex);

        const startCol = segStartIndex - weekStartIndex;
        const span = segEndIndex - segStartIndex + 1;

        segs.push({
            ev,
            weekIndex: w,
            startCol,
            span,
        });
        }

        packs.push({
        ev,
        isDraft,
        startIndex: startIdx,
        endIndex: endIdx,
        duration: endIdx - startIdx + 1,
        segs,
        });
    }

    // --------
    // 2) normal 먼저 이벤트 단위로 lane 확정 (구글식)
    //    정렬: 시작 빠른 것 우선, 같은 시작이면 긴 것 우선
    // --------
    const normals = packs.filter((p) => !p.isDraft);
    const drafts = packs.filter((p) => p.isDraft);

    normals.sort((a, b) => {
        if (a.startIndex !== b.startIndex) return a.startIndex - b.startIndex; // 시작 빠른 순
        if (b.duration !== a.duration) return b.duration - a.duration; // 같은 시작이면 긴 것 우선
        const at = clampToDay(a.ev.start).getTime();
        const bt = clampToDay(b.ev.start).getTime();
        if (at !== bt) return at - bt;
        return a.ev.id.localeCompare(b.ev.id);
    });

    // laneOccupancy[lane][weekIndex] = 7bit mask (Sun..Sat)
    const laneOccupancy: number[][] = [];
    const assignedLaneById = new Map<string, number>();

    function canPlaceOnLane(lane: number, pack: EvPack) {
        const occ = laneOccupancy[lane] ?? [];
        for (const s of pack.segs) {
        const w = s.weekIndex;
        const mask = segMask(s.startCol, s.span);
        const cur = occ[w] ?? 0;
        if ((cur & mask) !== 0) return false;
        }
        return true;
    }

    function commitToLane(lane: number, pack: EvPack) {
        if (!laneOccupancy[lane]) laneOccupancy[lane] = [];
        const occ = laneOccupancy[lane];
        for (const s of pack.segs) {
        const w = s.weekIndex;
        const mask = segMask(s.startCol, s.span);
        occ[w] = (occ[w] ?? 0) | mask;
        }
        assignedLaneById.set(pack.ev.id, lane);
    }

    for (const pack of normals) {
        // 혹시 동일 id 중복이 들어오면(원래는 없어야 함) 그대로 reuse
        const already = assignedLaneById.get(pack.ev.id);
        if (already != null) {
        commitToLane(already, pack);
        continue;
        }

        let lane = 0;
        while (true) {
        if (canPlaceOnLane(lane, pack)) {
            commitToLane(lane, pack);
            break;
        }
        lane += 1;
        }
    }

    // --------
    // 3) 최종 BarSegment로 풀기 (normal은 고정 lane)
    // --------
    const out: BarSegment[] = [];

    for (const pack of normals) {
        const lane = assignedLaneById.get(pack.ev.id) ?? 0;
        for (const s of pack.segs) {
        out.push({ ...s, lane });
        }
    }

    // --------
    // 4) draft는 "배치에 영향 없이" 올리기 (기존 컨셉 유지)
    //    - 가능한 비어있는 lane(<MAX_LANES) 찾기
    //    - 없으면 lane 0 오버레이
    // --------
    for (const pack of drafts) {
        let placedLane: number | null = null;

        for (let lane = 0; lane < MAX_LANES; lane++) {
        if (canPlaceOnLane(lane, pack)) {
            placedLane = lane;
            break;
        }
        }
        const lane = placedLane ?? 0;

        // draft는 occupancy에 "커밋하지 않음" (숨김/배치에 영향 X)
        for (const s of pack.segs) {
        out.push({ ...s, lane });
        }
    }

    return out;
    }, [renderEvents, days, MAX_LANES]);



  const weekMaxLanes = useMemo(() => {
    const max = Array.from({ length: 6 }, () => 0);
    for (const s of barSegments) max[s.weekIndex] = Math.max(max[s.weekIndex], s.lane + 1);
    return max;
  }, [barSegments]);

  return (
    <div>
      {/* 요일 헤더 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: GRID_GAP,
          marginBottom: 8,
          padding: "0 4px",
          isolation: "isolate",
        }}
      >
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((w) => (
          <div key={w} style={{ fontSize: 12, opacity: 0.65, fontWeight: 700 }}>
            {w}
          </div>
        ))}
      </div>

      {/* 6주 렌더 */}
      <div style={{ display: "grid", gap: GRID_GAP }}>
        {Array.from({ length: 6 }, (_, weekIndex) => {
          const weekDays = days.slice(weekIndex * 7, weekIndex * 7 + 7);

          const lanesVisibleCount = Math.max(1, Math.min(MAX_LANES, weekMaxLanes[weekIndex]));
          const weekBarsAll = barSegments.filter((s) => s.weekIndex === weekIndex);
          const weekBarsVisible = weekBarsAll.filter((s) => s.lane < MAX_LANES);
          const weekBarsHidden = weekBarsAll.filter((s) => s.lane >= MAX_LANES);

          // col별 숨겨진 이벤트 목록 (draft는 hidden 계산에서 제외)
          const hiddenEventsByCol: CalendarEvent[][] = Array.from({ length: 7 }, () => []);
          for (const seg of weekBarsHidden) {
            if (seg.ev.id === DRAFT_ID) continue;
            const segStart = seg.startCol;
            const segEnd = seg.startCol + seg.span - 1;
            for (let c = segStart; c <= segEnd; c++) hiddenEventsByCol[c].push(seg.ev);
          }
          for (let c = 0; c < 7; c++) {
            const seen = new Set<string>();
            hiddenEventsByCol[c] = hiddenEventsByCol[c]
              .filter((ev) => (seen.has(ev.id) ? false : (seen.add(ev.id), true)))
              .sort((a, b) => clampToDay(a.start).getTime() - clampToDay(b.start).getTime());
          }

          return (
            <div key={`week-${weekIndex}`} style={{ position: "relative" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7, 1fr)",
                  gap: GRID_GAP,
                  position: "relative",
                  overflow: "visible",
                }}
              >
                {weekDays.map((d, colIndex) => {
                  const isCurrentMonth = d.getMonth() === month;
                  const isToday = sameDay(d, today);
                  const selected = start && end ? inRange(clampToDay(d), start, end) : false;

                  const hiddenList = hiddenEventsByCol[colIndex];
                  const hiddenCount = hiddenList.length;

                  const startSegmentsHere = weekBarsVisible
                    .filter((s) => s.startCol === colIndex)
                    .sort((a, b) => a.lane - b.lane);

                  const hasBarsHere = startSegmentsHere.length > 0;
                  const showMoreRow = hiddenCount > 0;
                  const barStackH = (lanesVisibleCount + (showMoreRow ? 1 : 0)) * LANE_H;

                  const zForCell = hasBarsHere ? 100 + (6 - colIndex) : 1;

                  return (
                    <div
                      key={d.toISOString()}
                      onMouseDown={(e) => handleMouseDown(e, d)}
                      onMouseEnter={(e) => handleMouseEnter(e, d)}
                      onMouseUp={(e) => handleCellMouseUp(e)}
                      style={{
                        userSelect: "none",
                        background: "white",
                        borderRadius: 14,
                        border: selected
                          ? "2px solid rgba(59,130,246,0.9)"
                          : "1px solid rgba(0,0,0,0.08)",
                        padding: CELL_PADDING,
                        minHeight: CELL_MIN_H,
                        boxShadow: "0 1px 0 rgba(0,0,0,0.02)",
                        opacity: isCurrentMonth ? 1 : 0.45,
                        position: "relative",
                        overflow: "visible",
                        zIndex: zForCell,
                      }}
                    >
                      {/* 날짜 헤더 */}
                      <div style={{ height: HEADER_H, display: "flex", alignItems: "center", gap: 8 }}>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 800,
                            width: 28,
                            height: 28,
                            display: "grid",
                            placeItems: "center",
                            borderRadius: 999,
                            background: isToday ? "rgba(59,130,246,0.15)" : "transparent",
                            border: isToday
                              ? "1px solid rgba(59,130,246,0.35)"
                              : "1px solid transparent",
                          }}
                        >
                          {d.getDate()}
                        </div>
                      </div>

                      {/* bar stack */}
                      <div style={{ height: barStackH, position: "relative" }}>
                        {startSegmentsHere.map((seg) => {
                          const tag = tags.find((t) => t.id === seg.ev.tagId);
                          const isDraft = seg.ev.id === DRAFT_ID;

                          const extraPx =
                            seg.span * (CELL_PADDING * 2) +
                            (seg.span - 1) * GRID_GAP -
                            (BAR_INSET_L + BAR_INSET_R);

                          const width =
                            seg.span === 1
                              ? `calc(100% + ${extraPx}px)`
                              : `calc(${seg.span * 100}% + ${extraPx}px)`;

                          const left = -(CELL_PADDING - BAR_INSET_L);

                          return (
                            <div
                              key={`${seg.ev.id}-${weekIndex}-${seg.startCol}-${seg.span}-${seg.lane}`}
                              title={seg.ev.title}
                              onMouseDown={(e) => {
                                // draft도 드래그 방해하지 않게
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (isDraft) return;
                                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                                openDetail(rect, seg.ev);
                              }}
                              style={{
                                position: "absolute",
                                left,
                                top: seg.lane * LANE_H,
                                height: BAR_H,
                                width,
                                borderRadius: 999,
                                background: tag?.color ?? "#111",
                                opacity: isDraft ? 0.78 : 1,
                                color: "white",
                                fontSize: 12,
                                fontWeight: 800,
                                padding: "0 8px",
                                display: "flex",
                                alignItems: "center",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                // ✅ 구글처럼 “작성중” 느낌: 살짝 떠있는 shadow
                                boxShadow: isDraft
                                  ? "0 6px 14px rgba(0,0,0,0.16)"
                                  : "0 1px 0 rgba(0,0,0,0.08)",
                                outline: isDraft ? "1px solid rgba(255,255,255,0.45)" : "none",
                                zIndex: isDraft ? 50 : 10,
                                pointerEvents: "auto",
                                cursor: isDraft ? "default" : "pointer",
                              }}
                            >
                              {seg.ev.title}
                            </div>
                          );
                        })}

                        {/* +N more */}
                        {hiddenCount > 0 && (
                          <button
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                              openMore(rect, d, hiddenList);
                            }}
                            style={{
                              position: "absolute",
                              left: -(CELL_PADDING - BAR_INSET_L),
                              top: lanesVisibleCount * LANE_H,
                              width: `calc(100% + ${
                                CELL_PADDING * 2 - (BAR_INSET_L + BAR_INSET_R)
                              }px)`,
                              height: BAR_H,
                              border: "none",
                              borderRadius: 999,
                              background: "rgba(0,0,0,0.16)",
                              color: "rgba(0,0,0,0.85)",
                              fontSize: 12,
                              fontWeight: 900,
                              padding: "0 10px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "flex-start",
                              overflow: "hidden",
                              whiteSpace: "nowrap",
                              textOverflow: "ellipsis",
                              cursor: "pointer",
                              zIndex: 9,
                            }}
                            title="숨겨진 일정 보기"
                          >
                            +{hiddenCount} more
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
        선택됨: {start && end ? `${fmt(start)} ~ ${fmt(end)}` : "-"}
      </div>

      {/* ✅ 새 일정 Popover */}
      {createOpen && createAnchorRect && (
        <div
          ref={createPopoverRef}
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: "fixed",
            top: createAnchorRect.bottom + 8,
            left: smartPopoverLeft(createAnchorRect, POPOVER_W),
            width: POPOVER_W,
            maxWidth: "calc(100vw - 24px)",
            boxSizing: "border-box",
            background: "white",
            border: "1px solid rgba(0,0,0,0.12)",
            borderRadius: 14,
            boxShadow: "0 12px 40px rgba(0,0,0,0.12)",
            padding: 12,
            zIndex: 9999,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <div style={{ fontWeight: 900 }}>새 일정</div>
            <button
              onClick={() => setCreateOpen(false)}
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontSize: 16,
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>

          <div style={{ marginTop: 10, display: "grid", gap: 12 }}>
            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.75 }}>제목</div>
              <input
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                placeholder="Event title"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(0,0,0,0.12)",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={{ display: "grid", gap: 6 }}>
                <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.75 }}>시작</div>
                <input
                  type="date"
                  value={createStart}
                  onChange={(e) => setCreateStart(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid rgba(0,0,0,0.12)",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ display: "grid", gap: 6 }}>
                <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.75 }}>종료</div>
                <input
                  type="date"
                  value={createEnd}
                  onChange={(e) => setCreateEnd(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid rgba(0,0,0,0.12)",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.75 }}>태그</div>
              <select
                value={createTagId}
                onChange={(e) => setCreateTagId(e.target.value)}
                disabled={tags.length === 0}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(0,0,0,0.12)",
                  outline: "none",
                  boxSizing: "border-box",
                  opacity: tags.length === 0 ? 0.6 : 1,
                }}
              >
                {tags.length === 0 ? (
                  <option value="">태그가 없어요</option>
                ) : (
                  tags.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <div
                style={{
                  minHeight: 16,
                  fontSize: 12,
                  fontWeight: 900,
                  color: "rgba(239,68,68,0.95)",
                  opacity: createDateInvalid ? 1 : 0,
                  transition: "opacity 120ms ease",
                  whiteSpace: "nowrap",
                }}
              >
                날짜를 다시 확인해 주세요
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setCreateOpen(false);
                  }}
                  style={miniBtn}
                >
                  취소
                </button>

                <button
                  disabled={tags.length === 0 || createDateInvalid}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    if (tags.length === 0) return;
                    if (!createStart || !createEnd) return;
                    if (createDateInvalid) return;

                    const s = fromInputDate(createStart);
                    const ee = fromInputDate(createEnd);

                    // ✅ 제목 비어도 저장 가능 (구글처럼)
                    const title = createTitle.trim() || "(제목 없음)";

                    onCreateEvent({
                      id: crypto.randomUUID(),
                      title,
                      start: s,
                      end: ee,
                      tagId: createTagId,
                    });

                    setCreateOpen(false);
                  }}
                  style={{
                    ...miniBtn,
                    background: "rgba(59,130,246,0.12)",
                    opacity: tags.length === 0 || createDateInvalid ? 0.45 : 1,
                    cursor: tags.length === 0 || createDateInvalid ? "not-allowed" : "pointer",
                  }}
                >
                  저장
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* +N more 리스트 Popover */}
      {moreOpen && moreAnchorRect && moreDate && (
        <div
          ref={morePopoverRef}
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: "fixed",
            top: moreAnchorRect.bottom + 8,
            left: smartPopoverLeft(moreAnchorRect, POPOVER_W),
            width: POPOVER_W,
            maxWidth: "calc(100vw - 24px)",
            boxSizing: "border-box",
            background: "white",
            border: "1px solid rgba(0,0,0,0.12)",
            borderRadius: 14,
            boxShadow: "0 12px 40px rgba(0,0,0,0.12)",
            padding: 12,
            zIndex: 9999,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <div style={{ fontWeight: 900 }}>
              {fmt(moreDate)} · 숨겨진 일정 {moreItems.length}개
            </div>
            <button
              onClick={() => setMoreOpen(false)}
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontSize: 16,
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>

          <div
            style={{
              marginTop: 10,
              maxHeight: 260,
              overflow: "auto",
              display: "grid",
              gap: 8,
            }}
          >
            {moreItems.map((ev) => {
              const tag = tags.find((t) => t.id === ev.tagId);
              return (
                <div
                  key={ev.id}
                  style={{
                    border: "1px solid rgba(0,0,0,0.10)",
                    borderRadius: 12,
                    padding: 10,
                    display: "grid",
                    gap: 6,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 999,
                        background: tag?.color ?? "#111",
                        display: "inline-block",
                      }}
                    />
                    <div style={{ fontWeight: 900, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {ev.title}
                    </div>
                  </div>

                  <div style={{ fontSize: 12, opacity: 0.75 }}>
                    {fmt(clampToDay(ev.start))} ~ {fmt(clampToDay(ev.end))}
                  </div>

                  {(onUpdateEvent || onDeleteEvent) && (
                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      {onUpdateEvent && (
                        <button
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            // (여긴 기존대로 유지)
                            const nextTitle = window.prompt("제목 수정", ev.title);
                            if (nextTitle == null) return;
                            const trimmed = nextTitle.trim();
                            if (!trimmed) return;
                            onUpdateEvent({ ...ev, title: trimmed });
                          }}
                          style={miniBtn}
                        >
                          수정
                        </button>
                      )}
                      {onDeleteEvent && (
                        <button
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!window.confirm("삭제할까?")) return;
                            onDeleteEvent(ev.id);
                          }}
                          style={{ ...miniBtn, background: "rgba(239,68,68,0.12)" }}
                        >
                          삭제
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {moreItems.length === 0 && <div style={{ fontSize: 12, opacity: 0.75 }}>숨겨진 일정이 없어요.</div>}
          </div>

          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
            ※ 이 목록은 “MAX_LANES 초과로 숨겨진 일정”만 보여줘.
          </div>
        </div>
      )}

      {/* 일정 상세 Popover */}
      {detailOpen && detailAnchorRect && detailEvent && (
        <div
          ref={detailPopoverRef}
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: "fixed",
            top: detailAnchorRect.bottom + 8,
            left: smartPopoverLeft(detailAnchorRect, POPOVER_W),
            width: POPOVER_W,
            maxWidth: "calc(100vw - 24px)",
            boxSizing: "border-box",
            background: "white",
            border: "1px solid rgba(0,0,0,0.12)",
            borderRadius: 14,
            boxShadow: "0 12px 40px rgba(0,0,0,0.12)",
            padding: 12,
            zIndex: 9999,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <div style={{ fontWeight: 900 }}>일정</div>
            <button
              onClick={() => setDetailOpen(false)}
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                fontSize: 16,
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>

          {detailEditing ? (
            <div style={{ marginTop: 10, display: "grid", gap: 12 }}>
              <div style={{ display: "grid", gap: 6 }}>
                <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.75 }}>제목</div>
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid rgba(0,0,0,0.12)",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div style={{ display: "grid", gap: 6 }}>
                  <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.75 }}>시작</div>
                  <input
                    type="date"
                    value={editStart}
                    onChange={(e) => setEditStart(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: "1px solid rgba(0,0,0,0.12)",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div style={{ display: "grid", gap: 6 }}>
                  <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.75 }}>종료</div>
                  <input
                    type="date"
                    value={editEnd}
                    onChange={(e) => setEditEnd(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: "1px solid rgba(0,0,0,0.12)",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gap: 6 }}>
                <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.75 }}>태그</div>
                <select
                  value={editTagId}
                  onChange={(e) => setEditTagId(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid rgba(0,0,0,0.12)",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                >
                  {tags.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    minHeight: 16,
                    fontSize: 12,
                    fontWeight: 900,
                    color: "rgba(239,68,68,0.95)",
                    opacity: editDateInvalid ? 1 : 0,
                    transition: "opacity 120ms ease",
                    whiteSpace: "nowrap",
                  }}
                >
                  날짜를 다시 확인해 주세요
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setEditTitle(detailEvent.title);
                      setEditStart(toInputDate(detailEvent.start));
                      setEditEnd(toInputDate(detailEvent.end));
                      setEditTagId(detailEvent.tagId);
                      setDetailEditing(false);
                    }}
                    style={miniBtn}
                  >
                    취소
                  </button>

                  <button
                    disabled={editDateInvalid}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!onUpdateEvent) return;
                      if (editDateInvalid) return;

                      const s = fromInputDate(editStart);
                      const ee = fromInputDate(editEnd);

                      // ✅ 수정도 제목 비어도 허용
                      const title = editTitle.trim() || "(제목 없음)";

                      const next: CalendarEvent = {
                        ...detailEvent,
                        title,
                        start: s,
                        end: ee,
                        tagId: editTagId || detailEvent.tagId,
                      };

                      onUpdateEvent(next);
                      setDetailEvent(next);
                      setDetailEditing(false);
                    }}
                    style={{
                      ...miniBtn,
                      background: "rgba(59,130,246,0.12)",
                      opacity: editDateInvalid ? 0.45 : 1,
                      cursor: editDateInvalid ? "not-allowed" : "pointer",
                    }}
                  >
                    저장
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              {(() => {
                const tag = tags.find((t) => t.id === detailEvent.tagId);
                return (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 999,
                          background: tag?.color ?? "#111",
                          display: "inline-block",
                        }}
                      />
                      <div style={{ fontWeight: 900, fontSize: 14 }}>{detailEvent.title}</div>
                    </div>

                    <div style={{ fontSize: 12, opacity: 0.75 }}>
                      기간: {fmt(clampToDay(detailEvent.start))} ~ {fmt(clampToDay(detailEvent.end))}
                    </div>

                    <div style={{ fontSize: 12, opacity: 0.75 }}>태그: {tag?.name ?? "(없음)"}</div>

                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      {onUpdateEvent && (
                        <button
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDetailEditing(true);
                          }}
                          style={miniBtn}
                        >
                          수정
                        </button>
                      )}
                      {onDeleteEvent && (
                        <button
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!window.confirm("삭제할까?")) return;
                            onDeleteEvent(detailEvent.id);
                            setDetailOpen(false);
                          }}
                          style={{ ...miniBtn, background: "rgba(239,68,68,0.12)" }}
                        >
                          삭제
                        </button>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const miniBtn: React.CSSProperties = {
  border: "1px solid rgba(0,0,0,0.12)",
  background: "white",
  borderRadius: 10,
  padding: "6px 10px",
  cursor: "pointer",
  fontWeight: 900,
  fontSize: 12,
};
