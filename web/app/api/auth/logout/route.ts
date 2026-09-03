import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get("session_token")?.value;
    if (token) {
      await sql`UPDATE users SET session_token = NULL WHERE session_token = ${token}`;
    }

    const response = NextResponse.json({ success: true });
    response.cookies.delete("session_token");
    return response;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
