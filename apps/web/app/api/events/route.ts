import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.API_BASE_URL ?? "http://localhost:4000";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const cookie = req.headers.get("cookie") ?? "";

  const res = await fetch(`${API_BASE}/events${url.search}`, {
    method: "GET",
    headers: { cookie },
    cache: "no-store",
  });

  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
  });
}

export async function POST(req: NextRequest) {
  const cookie = req.headers.get("cookie") ?? "";
  const body = await req.text();

  const res = await fetch(`${API_BASE}/events`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie,
    },
    body,
  });

  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
  });
}
