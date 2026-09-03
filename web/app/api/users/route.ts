import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const isProd = process.env.NODE_ENV === 'production' || !!process.env.VERCEL;
const sql = neon(process.env.DATABASE_URL!);

export async function GET() {
  try {
    const users = await sql`
      SELECT id, name, role, description, telegram_username
      FROM users
      ORDER BY name
    `;
    return NextResponse.json({ users });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
