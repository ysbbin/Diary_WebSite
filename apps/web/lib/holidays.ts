// apps/web/lib/holidays.ts
export type Holiday = {
  date: string;      // "YYYY-MM-DD"
  localName: string; // e.g. "설날"
  name: string;      // English name
};

export async function fetchKoreanHolidays(year: number): Promise<Holiday[]> {
  // KR = South Korea
  const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/KR`, {
    // 캐시(원하면 조절)
    next: { revalidate: 60 * 60 * 24 }, // 1 day
  });
  if (!res.ok) return [];
  return res.json();
}
