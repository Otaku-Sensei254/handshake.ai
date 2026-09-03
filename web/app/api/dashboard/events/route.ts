import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get("session_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userRows = (await sql`
      SELECT id FROM users WHERE session_token = ${token} LIMIT 1
    `) as unknown as Array<{ id: string }>;

    if (userRows.length === 0) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const userId = userRows[0].id;

    const events = (await sql`
      SELECT 
        e.id,
        e.code,
        e.name,
        e.organizer_name,
        e.match_scope,
        e.created_at,
        uer.section_id,
        es.name as section_name,
        es.code as section_code
      FROM user_event_responses uer
      JOIN events e ON uer.event_id = e.id
      LEFT JOIN event_sections es ON uer.section_id = es.id
      WHERE uer.user_id = ${userId}
      ORDER BY uer.created_at DESC
    `) as unknown as Array<{
      id: string;
      code: string;
      name: string;
      organizer_name: string;
      match_scope: string;
      created_at: string;
      section_id?: string;
      section_name?: string;
      section_code?: string;
    }>;

    return NextResponse.json({ events });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
