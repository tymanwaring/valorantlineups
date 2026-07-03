import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, adminAuthEnabled, sessionTokenFor } from "@/lib/auth";

export async function POST(req: NextRequest) {
  if (!adminAuthEnabled()) {
    // Nothing to log into; treat as already open.
    return NextResponse.json({ ok: true, disabled: true });
  }

  let password = "";
  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const body = await req.json().catch(() => ({}));
    password = String(body?.password ?? "");
  } else {
    const form = await req.formData();
    password = String(form.get("password") ?? "");
  }

  if (!password || password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const token = await sessionTokenFor(password);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
  return res;
}
