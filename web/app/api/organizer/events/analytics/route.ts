import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "") || req.cookies.get("organizer_token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const organizerRows = (await sql`
      SELECT id FROM organizers WHERE session_token = ${token} LIMIT 1
    `) as unknown as Array<{ id: string }>;

    if (organizerRows.length === 0) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    const organizerId = organizerRows[0].id;

    const events = (await sql`
      SELECT 
        e.id,
        e.code,
        e.name,
        e.match_scope,
        e.created_at,
        COUNT(DISTINCT uer.user_id) as total_joins,
        COUNT(DISTINCT CASE WHEN uer.section_id IS NOT NULL THEN uer.user_id END) as section_joins
      FROM events e
      LEFT JOIN user_event_responses uer ON e.id = uer.event_id
      WHERE e.organizer_id = ${organizerId}
      GROUP BY e.id, e.code, e.name, e.match_scope, e.created_at
      ORDER BY e.created_at DESC
    `) as unknown as Array<{
      id: string;
      code: string;
      name: string;
      match_scope: string;
      created_at: string;
      total_joins: number;
      section_joins: number;
    }>;

    // Get section breakdown for each event
    const eventsWithSections = await Promise.all(
      events.map(async (e) => {
        const sections = (await sql`
          SELECT 
            es.id,
            es.name,
            es.code,
            COUNT(DISTINCT uer.user_id) as count
          FROM event_sections es
          LEFT JOIN user_event_responses uer ON es.id = uer.section_id AND uer.event_id = ${e.id}
          WHERE es.event_id = ${e.id}
          GROUP BY es.id, es.name, es.code
          ORDER BY es.created_at ASC
        `) as unknown as Array<{ id: string; name: string; code: string; count: number }>;

        return { ...e, sections };
      })
    );

    return NextResponse.json({ events: eventsWithSections });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
