/**
 * Data access for the game. Components call these functions, never Dexie directly.
 *
 * Reveal percentages are read BEFORE the new vote is recorded, so the reveal shows what previous
 * players on this device picked, and "you're the first" stays truthful. Stats views read the whole
 * `votes` table live.
 */
import { database, newId, type StreakState, type VoteChoice, type VoteRecord } from "@/lib/db";

const votesTable = async () => (await database.ready()).votes;
const stateTable = async () => (await database.ready()).state;

export type Tallies = { a: number; b: number };

const emptyTallies = (): Tallies => ({ a: 0, b: 0 });

/** All vote rows on this device, oldest first. Used by the stats view. */
export async function listVotes(): Promise<VoteRecord[]> {
  return (await votesTable()).orderBy("id").toArray();
}

/** Prior tallies for one question, before any vote this round is recorded. */
export async function getTallies(questionId: string): Promise<Tallies> {
  const rows = await (await votesTable()).where("questionId").equals(questionId).toArray();
  const tallies = emptyTallies();
  for (const row of rows) {
    if (row.choice === "a") tallies.a += 1;
    else tallies.b += 1;
  }
  return tallies;
}

/** Record exactly one vote for a question. Callers guard against double submission. */
export async function recordVote(questionId: string, choice: VoteChoice): Promise<void> {
  const vote: VoteRecord = { id: newId(), questionId, choice, answeredAt: Date.now() };
  await (await votesTable()).add(vote);
}

const DEFAULT_STREAK: StreakState = { key: "streak", currentStreak: 0, bestStreak: 0 };

async function readStreakRow(): Promise<StreakState> {
  return (await stateTable()).get("streak") ?? DEFAULT_STREAK;
}

export async function getStreak(): Promise<{ current: number; best: number }> {
  const row = await readStreakRow();
  return { current: row.currentStreak, best: row.bestStreak };
}

/** A question was answered: current goes up by one, best follows the peak. Never negative. */
export async function incrementStreak(): Promise<{ current: number; best: number }> {
  const row = await readStreakRow();
  const current = row.currentStreak + 1;
  const best = Math.max(row.bestStreak, current);
  await (await stateTable()).put({ key: "streak", currentStreak: current, bestStreak: best });
  return { current, best };
}

/** A skip: the current streak drops to zero; the best streak is history and stays. */
export async function resetStreak(): Promise<void> {
  const row = await readStreakRow();
  if (row.currentStreak === 0) return;
  await (await stateTable()).put({ key: "streak", currentStreak: 0, bestStreak: row.bestStreak });
}

/** Clear every vote and streak record on this device, returning the game to first-run state. */
export async function clearAllStats(): Promise<void> {
  const db = await database.ready();
  await db.transaction("rw", db.votes, db.state, async () => {
    await db.votes.clear();
    await db.state.clear();
  });
}
