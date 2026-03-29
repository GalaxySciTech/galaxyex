import { NextResponse } from "next/server";
import { demoState } from "@/lib/mock-data";

const API_BASE = process.env.NEXT_PUBLIC_ENGINE_URL ?? "http://localhost:8080";

export async function GET() {
  try {
    const response = await fetch(`${API_BASE}/api/state/demo-user-1`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(demoState);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(demoState);
  }
}
