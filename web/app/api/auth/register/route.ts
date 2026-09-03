import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const sql = neon(process.env.DATABASE_URL!);

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derivedKey}`;
}

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
    const { username, email, password } = await req.json();

    if (!username || !email || !password) {
      return NextResponse.json({ error: "Username, email, and password are required" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedUsername = username.trim();

    // Check if email already exists
    const existingEmail = (await sql`
      SELECT id FROM users WHERE email = ${normalizedEmail} LIMIT 1
    `) as unknown as Array<{ id: string }>;

    if (existingEmail.length > 0) {
      return NextResponse.json({ error: "Email is already registered" }, { status: 409 });
    }

    // Check if username already exists
    const existingUser = (await sql`
      SELECT id FROM users WHERE telegram_username = ${normalizedUsername} LIMIT 1
    `) as unknown as Array<{ id: string }>;

    if (existingUser.length > 0) {
      return NextResponse.json({ error: "Username is already taken" }, { status: 409 });
    }

    const passwordHash = hashPassword(password);
    const token = generateToken();
    const placeholderTelegramId = -Math.floor(Math.random() * 2147483647) - 1;

    const inserted = (await sql`
      INSERT INTO users (telegram_id, telegram_username, email, password_hash, session_token, name, role, description, goals, challenges, offers)
      VALUES (${placeholderTelegramId}, ${normalizedUsername}, ${normalizedEmail}, ${passwordHash}, ${token}, ${normalizedUsername}, 'Other', '', '', '', '')
      RETURNING id, telegram_username, email, name
    `) as unknown as Array<{ id: string; telegram_username: string; email: string; name: string }>;

    const user = inserted[0];
    if (!user) {
      return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
    }

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, username: user.telegram_username, email: user.email, name: user.name },
    });

    response.cookies.set("session_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

    return response;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    console.error("[auth/register]", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
