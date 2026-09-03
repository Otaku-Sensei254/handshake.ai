import { getDb } from './supabase';

async function migrate() {
  const sql = getDb();
  console.log('🔄 Running database migrations...');

  try {
    await sql`CREATE EXTENSION IF NOT EXISTS vector`;
    await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;
    console.log('✅ Extensions enabled (vector, pgcrypto)');
    // 1. Create events table
    await sql`
      CREATE TABLE IF NOT EXISTS events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        organizer_name TEXT NOT NULL,
        organizer_id UUID,
        ai_insights TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;
    console.log('✅ Created events table');

    // 1b. Add missing columns to events if table already existed
    await sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS organizer_id UUID`;
    await sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS ai_insights TEXT`;

    // 2. Create organizers table
    await sql`
      CREATE TABLE IF NOT EXISTS organizers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        session_token TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;
    console.log('✅ Created organizers table');

    // 2b. Create users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        telegram_id BIGINT,
        telegram_username TEXT,
        phone_number TEXT,
        wallet_address TEXT,
        accept_all_matches BOOLEAN NOT NULL DEFAULT false,
        name TEXT,
        role TEXT,
        description TEXT,
        goals TEXT,
        challenges TEXT,
        offers TEXT,
        enrichments JSONB DEFAULT '{"websites": []}'::jsonb,
        goal_embedding vector(1536),
        challenge_embedding vector(1536),
        email TEXT,
        password_hash TEXT,
        session_token TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;
    console.log('✅ Created users table');

    // 2c. Add auth columns if table already existed without them
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS session_token TEXT`;
    await sql`ALTER TABLE users ALTER COLUMN telegram_id DROP NOT NULL`;
    console.log('✅ Added auth columns to users table');

    // 2c. Create onboarding_sessions table
    await sql`
      CREATE TABLE IF NOT EXISTS onboarding_sessions (
        telegram_id BIGINT PRIMARY KEY,
        session JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;
    console.log('✅ Created onboarding_sessions table');

    // 3. Create event_prompts table
    await sql`
      CREATE TABLE IF NOT EXISTS event_prompts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        prompt_text TEXT NOT NULL,
        order_index INT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;
    console.log('✅ Created event_prompts table');

    // 4. Create user_event_responses table
    await sql`
      CREATE TABLE IF NOT EXISTS user_event_responses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        responses JSONB NOT NULL DEFAULT '[]',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE(user_id, event_id)
      )
    `;
    console.log('✅ Created user_event_responses table');

    // 5. Create matches table
    await sql`
      CREATE TABLE IF NOT EXISTS matches (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_a_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        user_b_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        similarity_score FLOAT,
        agent_a_score FLOAT,
        agent_b_score FLOAT,
        transcript JSONB DEFAULT '[]'::jsonb,
        rationale TEXT,
        conversation_starter TEXT,
        collaboration_opportunities JSONB DEFAULT '[]'::jsonb,
        shared_tech_stack JSONB DEFAULT '[]'::jsonb,
        status TEXT NOT NULL DEFAULT 'negotiating',
        user_a_consent BOOLEAN DEFAULT false,
        user_b_consent BOOLEAN DEFAULT false,
        user_a_feedback INT,
        user_b_feedback INT,
        tx_hash TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE(user_a_id, user_b_id)
      )
    `;
    console.log('✅ Created matches table');

    // 6. Add match_scope to events
    await sql`ALTER TABLE events ADD COLUMN IF NOT EXISTS match_scope TEXT NOT NULL DEFAULT 'event'`;
    console.log('✅ Added match_scope to events');

    // 7. Create event_sections table
    await sql`
      CREATE TABLE IF NOT EXISTS event_sections (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        code TEXT NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE(event_id, code)
      )
    `;
    console.log('✅ Created event_sections table');

    // 8. Add section_id to user_event_responses
    await sql`ALTER TABLE user_event_responses ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES event_sections(id) ON DELETE SET NULL`;
    console.log('✅ Added section_id to user_event_responses');

    console.log('🚀 Migrations completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

migrate();
