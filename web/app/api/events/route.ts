import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(req: NextRequest) {
  try {
    const events = (await sql`
      SELECT 
        e.id,
        e.code,
        e.name,
        e.organizer_name,
        e.match_scope,
        e.created_at,
        COUNT(DISTINCT uer.user_id) as total_joins
      FROM events e
      LEFT JOIN user_event_responses uer ON e.id = uer.event_id
      GROUP BY e.id, e.code, e.name, e.organizer_name, e.match_scope, e.created_at
      ORDER BY e.created_at DESC
    `) as unknown as Array<{
      id: string;
      code: string;
      name: string;
      organizer_name: string;
      match_scope: string;
      created_at: string;
      total_joins: number;
    }>;

    // Fetch sections for each event
    const eventsWithSections = await Promise.all(
      events.map(async (e) => {
        const sections = (await sql`
          SELECT id, name, code, description
          FROM event_sections
          WHERE event_id = ${e.id}
          ORDER BY created_at ASC
        `) as unknown as Array<{ id: string; name: string; code: string; description?: string }>;
        return { ...e, sections };
      })
    );

    return NextResponse.json({ events: eventsWithSections });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    console.error("[events] DB error:", err);
    return NextResponse.json({ 
      error: "Unable to load events right now. Please try again later.",
      details: process.env.NODE_ENV === "development" ? msg : undefined
    }, { status: 503 });
  }
}
