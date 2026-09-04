import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { generateGeminiEmbedding, generateGeminiText } from "@/lib/gemini";
import {
  getEventByCode,
  getEventSections,
  getEventPrompts,
  getUserByTelegramUsername,
  upsertUser,
  updateUser,
  saveUserEventResponses,
} from "@/lib/db";

const sql = neon(process.env.DATABASE_URL!);

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get("code");
    if (!code) {
      return NextResponse.json({ error: "Event code is required" }, { status: 400 });
    }

    const event = await getEventByCode(code);
    if (!event) {
      return NextResponse.json({ error: `Event ${code} not found` }, { status: 404 });
    }

    const [sections, prompts] = await Promise.all([
      getEventSections(event.id),
      getEventPrompts(event.id),
    ]);

    return NextResponse.json({
      event: {
        id: event.id,
        code: event.code,
        name: event.name,
        match_scope: event.match_scope,
      },
      sections,
      prompts,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

async function fetchGitHubSummary(username: string): Promise<string> {
  try {
    const [userRes, reposRes] = await Promise.all([
      fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, {
        headers: { "User-Agent": "handshake-ai" },
      }),
      fetch(
        `https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=stars&per_page=5&type=owner`,
        { headers: { "User-Agent": "handshake-ai" } }
      ),
    ]);
    if (!userRes.ok) return "";
    const user = await userRes.json();
    const repos = reposRes.ok ? await reposRes.json() : [];
    const langs: Record<string, number> = {};
    for (const r of repos) if (!r.fork && r.language) langs[r.language] = (langs[r.language] ?? 0) + 1;
    const topLangs = Object.entries(langs).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([l]) => l);
    const topRepos = repos.filter((r: { fork: boolean }) => !r.fork).slice(0, 3)
      .map((r: { name: string; description: string; stargazers_count: number }) =>
        `${r.name} (${r.stargazers_count}⭐): ${r.description ?? ""}`
      ).join("; ");
    return `GitHub @${username}: ${user.bio ?? ""}. Languages: ${topLangs.join(", ")}. Repos: ${topRepos}`;
  } catch {
    return "";
  }
}

async function scrapeWebsite(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; HandshakeAI/1.0)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return "";
    const html = await res.text();
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 2000);

    const summary = await generateGeminiText(
      "",
      [{ role: "user", content: `In 2 sentences, what does this person or company do?\n${text}` }],
      100
    );
    return `Website (${url}): ${summary.trim()}`;
  } catch {
    return "";
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { eventCode, user, sectionId, responses } = body as {
      eventCode: string;
      user: {
        name: string;
        telegram_username: string;
        role: string;
        description: string;
        goals: string;
        challenges: string;
        offers: string;
        phone_number?: string;
        wallet_address?: string;
        github_username?: string;
        website_url?: string;
      };
      sectionId?: string;
      responses: Array<{ prompt_id: string; prompt_text: string; response_text: string }>;
    };

    if (!eventCode || !user?.name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const profileData = {
      name: user.name.trim(),
      telegram_username: (user.telegram_username || '').trim() || undefined,
      role: user.role?.trim() || 'Other',
      description: user.description?.trim() || '',
      goals: user.goals?.trim() || '',
      challenges: user.challenges?.trim() || '',
      offers: user.offers?.trim() || '',
      phone_number: user.phone_number?.trim() || undefined,
    };

    // 1. Look up event
    const event = await getEventByCode(eventCode);
    if (!event) {
      return NextResponse.json({ error: `Event ${eventCode} not found` }, { status: 404 });
    }

    // 2. Validate section if event requires it
    if (event.match_scope === "section") {
      const sections = await getEventSections(event.id);
      if (sections.length > 0 && !sectionId) {
        return NextResponse.json({ error: "Section selection is required for this event" }, { status: 400 });
      }
      if (sectionId && !sections.find((s) => s.id === sectionId)) {
        return NextResponse.json({ error: "Invalid section selected" }, { status: 400 });
      }
    }

    // 3. Find or create user
    let existingUser = await getUserByTelegramUsername(profileData.telegram_username || '');
    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
      // Update existing user profile
      await updateUser(userId, {
        name: profileData.name,
        role: profileData.role,
        description: profileData.description,
        goals: profileData.goals,
        challenges: profileData.challenges,
        offers: profileData.offers,
        phone_number: profileData.phone_number ?? null,
      });
    } else {
      // Gather enrichment context
      const enrichmentParts: string[] = [];
      const enrichments: Record<string, unknown> & { websites: Array<{ url: string; summary: string; fetchedAt: string }> } = { websites: [] };

      if (user.github_username) {
        const summary = await fetchGitHubSummary(user.github_username);
        if (summary) {
          enrichmentParts.push(summary);
          enrichments.github = { username: user.github_username, fetchedAt: new Date().toISOString() };
        }
      }

      if (user.website_url) {
        const summary = await scrapeWebsite(user.website_url);
        if (summary) {
          enrichmentParts.push(summary);
          enrichments.websites.push({
            url: user.website_url,
            summary,
            fetchedAt: new Date().toISOString(),
          });
        }
      }

      // Generate embeddings
      const goalsText = [profileData.goals, ...enrichmentParts].join(". ");
      const challengesText = [profileData.challenges, ...enrichmentParts].join(". ");

      const [goalEmbedding, challengeEmbedding] = await Promise.all([
        generateGeminiEmbedding(goalsText),
        generateGeminiEmbedding(challengesText),
      ]);

      // Create new user with placeholder telegram_id
      const placeholderTelegramId = -(Date.now() % 2147483647);
      const inserted = await sql`
        INSERT INTO users (
          telegram_id, telegram_username, phone_number,
          name, role, description, goals, challenges, offers,
          enrichments, goal_embedding, challenge_embedding
        ) VALUES (
          ${placeholderTelegramId}, ${profileData.telegram_username || null},
          ${profileData.phone_number || null},
          ${profileData.name}, ${profileData.role}, ${profileData.description},
          ${profileData.goals}, ${profileData.challenges}, ${profileData.offers},
          ${JSON.stringify(enrichments)}::jsonb,
          ${JSON.stringify(goalEmbedding)}::vector,
          ${JSON.stringify(challengeEmbedding)}::vector
        )
        RETURNING id
      `;
      userId = (inserted as unknown as Array<{ id: string }>)[0]!.id;
    }

    // 4. Save event responses
    await saveUserEventResponses(userId, event.id, responses, sectionId);

    // 5. If there are responses, enrich profile and regenerate embeddings
    if (responses.length > 0) {
      const currentUser = existingUser ?? await getUserByTelegramUsername(profileData.telegram_username || '');
      if (currentUser) {
        try {
          const enriched = await enrichProfileWithEventResponses(currentUser, responses);
          const { goalEmbedding, challengeEmbedding } = await generateUserEmbeddings(
            String(enriched.goals || ''),
            String(enriched.challenges || '')
          );
          await updateUser(currentUser.id, {
            name: enriched.name,
            role: enriched.role,
            description: enriched.description,
            goals: enriched.goals,
            challenges: enriched.challenges,
            offers: enriched.offers,
            goal_embedding: goalEmbedding,
            challenge_embedding: challengeEmbedding,
          });
        } catch (enrichErr) {
          console.error("[join] Profile enrichment failed:", enrichErr);
        }
      }
    }

    return NextResponse.json({ success: true, userId, eventName: event.name });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    console.error("[join]", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

async function generateUserEmbeddings(goals: string, challenges: string) {
  const [goalEmbedding, challengeEmbedding] = await Promise.all([
    generateGeminiEmbedding(goals),
    generateGeminiEmbedding(challenges),
  ]);
  return { goalEmbedding, challengeEmbedding };
}

async function enrichProfileWithEventResponses(
  currentUser: any,
  responses: Array<{ prompt_id: string; prompt_text: string; response_text: string }>
): Promise<{
  name: string;
  role: string;
  description: string;
  goals: string;
  challenges: string;
  offers: string;
}> {
  const currentProfile = `Current Profile:
Name: ${currentUser.name}
Role: ${currentUser.role}
Working On: ${currentUser.description}
Goals: ${currentUser.goals}
Challenges: ${currentUser.challenges}
Offers: ${currentUser.offers}`;

  const eventResponsesText = responses
    .map((r) => `Q: ${r.prompt_text}\nA: ${r.response_text}`)
    .join('\n\n');

  const userMessage = `${currentProfile}\n\nEvent Responses:\n${eventResponsesText}`;

  const text = await generateGeminiText(
    `You are an expert profile enricher. Given a user's current profile and their responses to event-specific questions, update their profile fields to incorporate the new information. Keep the same structure. Return ONLY valid JSON with these exact keys: name, role, description, goals, challenges, offers. Do NOT wrap in markdown code blocks.`,
    [{ role: "user", content: userMessage }],
    800
  );

  const cleaned = text.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // If enrichment fails, return the original profile unchanged
    return {
      name: currentUser.name,
      role: currentUser.role,
      description: currentUser.description,
      goals: currentUser.goals,
      challenges: currentUser.challenges,
      offers: currentUser.offers,
    };
  }
}
