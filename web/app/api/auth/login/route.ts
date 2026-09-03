import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const sql = neon(process.env.DATABASE_URL!);

function verifyPassword(password: string, hash: string): boolean {
  const [salt, key] = hash.split(":");
  const derivedKey = scryptSync(password, salt, 64).toString("hex");
  return timingSafeEqual(Buffer.from(key), Buffer.from(derivedKey));
}

function generateToken(): string {
  return randomBytes(48).toString("hex");
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const rows = (await sql`
      SELECT id, telegram_username, email, name, password_hash FROM users WHERE email = ${normalizedEmail} LIMIT 1
    `) as unknown as Array<{ id: string; telegram_username: string; email: string; name: string; password_hash: string }>;

    if (rows.length === 0) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const user = rows[0];
    if (!verifyPassword(password, user.password_hash)) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const token = generateToken();
    await sql`UPDATE users SET session_token = ${token} WHERE id = ${user.id}`;

    return NextResponse.json({
      success: true,
      user: { id: user.id, username: user.telegram_username, email: user.email, name: user.name },
      token,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    console.error("[auth/login]", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
