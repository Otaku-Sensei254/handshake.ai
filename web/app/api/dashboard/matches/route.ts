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

    const matches = (await sql`
      SELECT 
        m.id,
        m.status,
        m.similarity_score,
        m.conversation_starter,
        m.user_a_consent,
        m.user_b_consent,
        ua.name as user_a_name,
        ua.telegram_username as user_a_username,
        ub.name as user_b_name,
        ub.telegram_username as user_b_username,
        CASE 
          WHEN m.user_a_id = ${userId} THEN ub.name
          ELSE ua.name
        END as matched_with_name,
        CASE 
          WHEN m.user_a_id = ${userId} THEN ub.telegram_username
          ELSE ua.telegram_username
        END as matched_with_username
      FROM matches m
      JOIN users ua ON m.user_a_id = ua.id
      JOIN users ub ON m.user_b_id = ub.id
      WHERE m.user_a_id = ${userId} OR m.user_b_id = ${userId}
      ORDER BY m.created_at DESC
    `) as unknown as Array<{
      id: string;
      status: string;
      similarity_score: number;
      conversation_starter: string;
      user_a_consent: boolean;
      user_b_consent: boolean;
      matched_with_name: string;
      matched_with_username?: string;
    }>;

    return NextResponse.json({ matches });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
