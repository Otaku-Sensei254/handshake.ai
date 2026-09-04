import cron from 'node-cron';
import { config } from '../config';
import {
  getAllUsersWithEmbeddings,
  findCandidates,
  pairAlreadyProcessed,
  createMatch,
  getUserById,
  updateMatch,
  getDb,
} from '../db/supabase';
import { runAgentNegotiation } from '../agents/negotiation';
import {
  sendMatchNotification,
  sendMatchNotificationToUser,
  initiateCallsForMatch,
} from '../bot/notifications';
import { User } from '../types';

let isRunning = false;

// Get users who joined a specific event section
async function getEventSectionUsers(eventId: string, sectionId: string): Promise<User[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT u.* FROM users u
    JOIN user_event_responses uer ON u.id = uer.user_id
    WHERE uer.event_id = ${eventId} AND uer.section_id = ${sectionId}
    AND u.goal_embedding IS NOT NULL AND u.challenge_embedding IS NOT NULL
  `;
  return rows as unknown as User[];
}

// Get all section IDs for an event
async function getEventSectionIds(eventId: string): Promise<string[]> {
  const sql = getDb();
  const rows = await sql`SELECT id FROM event_sections WHERE event_id = ${eventId}` as Array<{ id: string }>;
  return rows.map(r => r.id);
}

export async function runMatchingCycle(): Promise<void> {
  if (isRunning) {
    console.log('[Matching] Cycle already in progress, skipping');
    return;
  }
  isRunning = true;
  console.log('[Matching] Starting matching cycle');

  try {
    const users = await getAllUsersWithEmbeddings();
    console.log(`[Matching] Found ${users.length} users with embeddings`);

    if (users.length < 2) {
      console.log('[Matching] Not enough users, skipping');
      return;
    }

    // Get events with sections for section-aware matching
    const sql = getDb();
    const sectionEvents = (await sql`
      SELECT id, match_scope FROM events WHERE match_scope = 'section'
    `) as any[];

    let matchesFound = 0;

    // Section-aware matching for events with sections
    for (const event of sectionEvents) {
      const sectionIds = await getEventSectionIds(event.id);
      for (const sectionId of sectionIds) {
        const sectionUsers = await getEventSectionUsers(event.id, sectionId);
        if (sectionUsers.length < 2) continue;

        console.log(`[Matching] Section ${sectionId}: ${sectionUsers.length} users`);

        for (const userA of sectionUsers) {
          if (!userA.goal_embedding) continue;

          const candidates = await findCandidates(
            userA.goal_embedding,
            userA.id,
            config.matching.similarityThreshold,
            config.matching.candidateCount
          );

          // Filter candidates to only those in the same section
          const sectionUserIds = new Set(sectionUsers.map(u => u.id));
          const filteredCandidates = candidates.filter(c => sectionUserIds.has(c.user_id));

          for (const candidate of filteredCandidates) {
            const userB = await getUserById(candidate.user_id);
            if (!userB) continue;

            const alreadyProcessed = await pairAlreadyProcessed(userA.id, userB.id);
            if (alreadyProcessed) continue;

            console.log(
              `[Matching] Running agent negotiation (section): ${userA.name} <-> ${userB.name} (similarity: ${candidate.similarity.toFixed(3)})`
            );

            try {
              const result = await runAgentNegotiation(userA, userB);

              const status =
                result.agentAScore > config.matching.scoreThreshold &&
                result.agentBScore > config.matching.scoreThreshold
                  ? 'pending_consent'
                  : 'rejected';

              const match = await createMatch({
                user_a_id: userA.id,
                user_b_id: userB.id,
                similarity_score: candidate.similarity,
                agent_a_score: result.agentAScore,
                agent_b_score: result.agentBScore,
                transcript: result.transcript,
                rationale: result.rationale,
                conversation_starter: result.conversationStarter,
                collaboration_opportunities: result.collaborationOpportunities,
                shared_tech_stack: result.sharedTechStack,
                status,
                user_a_consent: false,
                user_b_consent: false,
              });

              if (status === 'pending_consent') {
                matchesFound++;
                console.log(
                  `[Matching] HIGH-VALUE MATCH (section): ${userA.name} <-> ${userB.name}`
                );

                const aConsent = userA.accept_all_matches === true;
                const bConsent = userB.accept_all_matches === true;

                if (aConsent || bConsent) {
                  await updateMatch(match.id, {
                    user_a_consent: aConsent,
                    user_b_consent: bConsent,
                  });
                }

                if (aConsent && bConsent) {
                  await updateMatch(match.id, { status: 'calling' });
                  await initiateCallsForMatch(match);
                } else if (aConsent) {
                  await sendMatchNotificationToUser(match, userB, userA, 'b');
                } else if (bConsent) {
                  await sendMatchNotificationToUser(match, userA, userB, 'a');
                } else {
                  await sendMatchNotification(match, userA, userB);
                }
              }
            } catch (err) {
              console.error(
                `[Matching] Error negotiating ${userA.name} <-> ${userB.name}:`,
                err
              );
            }

            await new Promise((r) => setTimeout(r, 1000));
          }
        }
      }
    }

    // Global matching for users not in section-scoped events
    for (const userA of users) {
      if (!userA.goal_embedding) continue;

      const candidates = await findCandidates(
        userA.goal_embedding,
        userA.id,
        config.matching.similarityThreshold,
        config.matching.candidateCount
      );

      for (const candidate of candidates) {
        const userB = await getUserById(candidate.user_id);
        if (!userB) continue;

        const alreadyProcessed = await pairAlreadyProcessed(userA.id, userB.id);
        if (alreadyProcessed) continue;

        console.log(
          `[Matching] Running agent negotiation: ${userA.name} <-> ${userB.name} (similarity: ${candidate.similarity.toFixed(3)})`
        );

        try {
          const result = await runAgentNegotiation(userA, userB);

          const status =
            result.agentAScore > config.matching.scoreThreshold &&
            result.agentBScore > config.matching.scoreThreshold
              ? 'pending_consent'
              : 'rejected';

          const match = await createMatch({
            user_a_id: userA.id,
            user_b_id: userB.id,
            similarity_score: candidate.similarity,
            agent_a_score: result.agentAScore,
            agent_b_score: result.agentBScore,
            transcript: result.transcript,
            rationale: result.rationale,
            conversation_starter: result.conversationStarter,
            collaboration_opportunities: result.collaborationOpportunities,
            shared_tech_stack: result.sharedTechStack,
            status,
            user_a_consent: false,
            user_b_consent: false,
          });

          if (status === 'pending_consent') {
            matchesFound++;
            console.log(
              `[Matching] HIGH-VALUE MATCH: ${userA.name} <-> ${userB.name} (A: ${result.agentAScore.toFixed(2)}, B: ${result.agentBScore.toFixed(2)})`
            );

            const aConsent = userA.accept_all_matches === true;
            const bConsent = userB.accept_all_matches === true;

            if (aConsent || bConsent) {
              await updateMatch(match.id, {
                user_a_consent: aConsent,
                user_b_consent: bConsent,
              });
            }

            if (aConsent && bConsent) {
              await updateMatch(match.id, { status: 'calling' });
              await initiateCallsForMatch(match);
            } else if (aConsent) {
              await sendMatchNotificationToUser(match, userB, userA, 'b');
            } else if (bConsent) {
              await sendMatchNotificationToUser(match, userA, userB, 'a');
            } else {
              await sendMatchNotification(match, userA, userB);
            }
          } else {
            console.log(
              `[Matching] Rejected: ${userA.name} <-> ${userB.name} (A: ${result.agentAScore.toFixed(2)}, B: ${result.agentBScore.toFixed(2)})`
            );
          }
        } catch (err) {
          console.error(
            `[Matching] Error negotiating ${userA.name} <-> ${userB.name}:`,
            err
          );
        }

        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    console.log(`[Matching] Cycle complete. ${matchesFound} new matches found.`);
  } catch (err) {
    console.error('[Matching] Cycle error:', err);
  } finally {
    isRunning = false;
  }
}

export function startMatchingScheduler(): void {
  const schedule = config.matching.cronSchedule;
  console.log(`[Matching] Scheduler starting with cron: ${schedule}`);

  cron.schedule(schedule, () => {
    runMatchingCycle().catch((err) =>
      console.error('[Matching] Unhandled error in matching cycle:', err)
    );
  });
}
