import type { CalendarEvent } from "@/components/calendar/MonthGrid";
import { fetchKoreanHolidays } from "@/lib/holidays"; // 너가 이미 만든 fetch 함수 경로로 맞춰

function ymdToDate(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export async function getHolidayEvents(year: number): Promise<CalendarEvent[]> {
  const list = await fetchKoreanHolidays(year);

  return list.map((h) => {
    const day = ymdToDate(h.date);
    return {
      id: `holiday-${h.date}`,
      title: h.localName ?? h.name ?? "Holiday",
      start: day,
      end: day,          // ✅ 하루짜리
      tagId: "holiday",  // ✅ 공휴일 태그 고정
    };
  });
}
