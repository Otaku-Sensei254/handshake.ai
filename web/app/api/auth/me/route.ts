import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("session_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const rows = (await sql`
      SELECT id, telegram_username, email, name FROM users WHERE session_token = ${token} LIMIT 1
    `) as unknown as Array<{ id: string; telegram_username: string; email: string; name: string }>;

    if (rows.length === 0) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const user = rows[0];
    return NextResponse.json({
      user: { id: user.id, username: user.telegram_username, email: user.email, name: user.name },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
