/**
 * This application's database.
 *
 * The reusable half of the setup is in `lib/storage/` and is not edited. This file is the half
 * that describes the product: which tables exist, what is indexed, how the schema has changed over
 * time, and what a first visit starts with.
 *
 * `votes` holds one row per recorded choice, so the reveal percentages, the per-question stats and
 * the "which side you picked" history all read from the same rows. `state` is a keyed single-row
 * table holding the streak counters for this device. No seed is needed: a first run is an empty
 * scoreboard, and the UI renders that state deliberately.
 */
import { defineDatabase } from "@/lib/storage/database";

export type VoteChoice = "a" | "b";

export type VoteRecord = {
  id: string;
  /** Question id from `lib/data/questions.ts`. Indexed, because tallies group on it. */
  questionId: string;
  choice: VoteChoice;
  /** Epoch millis the vote was recorded. */
  answeredAt: number;
};

export type StreakState = {
  key: "streak";
  /** Consecutive questions answered without a skip. Never negative. */
  currentStreak: number;
  /** Best streak ever reached on this device. */
  bestStreak: number;
};

/** Ids are generated here so the data layer never depends on an auto-increment round trip. */
export function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export const database = defineDatabase<{ votes: VoteRecord; state: StreakState }>({
  // Part of the origin's storage identity. Renaming it does not migrate anything — it points the
  // application at a different, empty database and abandons the old one in place. That is exactly
  // what you want on a first build, and never what you want afterwards.
  name: "would-you-rather",
  versions: [
    // Only the primary key and the properties queried on. `choice` and `answeredAt` are stored but
    // never used as indexes, so they stay out of the string.
    { version: 1, stores: { votes: "id, questionId", state: "key" } },
  ],
});
