import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.API_BASE_URL ?? "http://localhost:4000";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const cookie = req.headers.get("cookie") ?? "";
  const body = await req.text();

  const res = await fetch(`${API_BASE}/events/${params.id}`, {
    method: "PATCH",
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

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const cookie = req.headers.get("cookie") ?? "";

  const res = await fetch(`${API_BASE}/events/${params.id}`, {
    method: "DELETE",
    headers: { cookie },
  });

  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
  });
}
