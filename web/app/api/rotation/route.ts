import { NextRequest, NextResponse } from "next/server";
import { getRotation, setRotation } from "@/lib/rotation";

export async function GET() {
  const inRotation = await getRotation();
  return NextResponse.json({ inRotation });
}

export async function PUT(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const slugs = (body as { inRotation?: unknown }).inRotation;
  if (!Array.isArray(slugs) || !slugs.every((s) => typeof s === "string")) {
    return NextResponse.json(
      { error: "inRotation must be an array of map slugs" },
      { status: 400 },
    );
  }

  const inRotation = await setRotation(slugs as string[]);
  return NextResponse.json({ inRotation });
}
