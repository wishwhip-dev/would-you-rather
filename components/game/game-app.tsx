"use client";

/**
 * The main play surface: one question at a time, two big tap targets, a reveal with the
 * device's previous-vote percentages, streak tracking, skip, shuffle and keyboard control.
 *
 * Vote flow: the prior tallies are read BEFORE the new vote is written, so the reveal shows
 * what previous players on this device picked and a first-ever answer can be told apart from
 * a 100/0 split. A synchronous ref lock makes a double tap or an A-then-B tap record one vote.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getQuestion,
  QUESTION_COUNT,
  QUESTIONS,
  shuffleArray,
  shuffleQuestionIds,
} from "@/lib/data/questions";
import {
  getStreak,
  getTallies,
  incrementStreak,
  recordVote,
  resetStreak,
  type Tallies,
} from "@/lib/data/game";
import type { VoteChoice } from "@/lib/db";
import { useStorageStatus, useStoredQuery } from "@/lib/storage/react";
import { database } from "@/lib/db";
import { StatsView } from "@/components/game/stats-view";

type View =
  | { kind: "choice" }
  | { kind: "reveal"; questionId: string; choice: VoteChoice; prior: Tallies };

export function GameApp() {
  const storageStatus = useStorageStatus(database);
  // Deterministic first render: the server and the client's hydration pass must show the same
  // first question, so the deck starts in pool order and is only shuffled after interaction.
  const [deck, setDeck] = useState<string[]>(() => QUESTIONS.map((question) => question.id));
  const [deckPos, setDeckPos] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [view, setView] = useState<View>({ kind: "choice" });
  /** Synchronous guard: once true, further choice input is ignored until the next question. */
  const lockRef = useRef(false);

  const { data: streak, isLoading: streakLoading } = useStoredQuery(database, getStreak);

  const questionId = deck[deckPos] ?? QUESTIONS[0]!.id;
  const question = getQuestion(questionId);

  /** Advance to the next question; reshuffle the full deck when the pool is exhausted. */
  const advance = useCallback(() => {
    lockRef.current = false;
    setView({ kind: "choice" });
    const next = deckPos + 1;
    if (next >= deck.length) {
      setDeck(shuffleQuestionIds());
      setDeckPos(0);
      setAnsweredCount(0);
    } else {
      setDeckPos(next);
    }
  }, [deck.length, deckPos]);

  const handleChoose = useCallback(
    async (choice: VoteChoice) => {
      if (view.kind !== "choice" || lockRef.current) return;
      lockRef.current = true;
      const prior = await getTallies(questionId);
      setView({ kind: "reveal", questionId, choice, prior });
      setAnsweredCount((count) => count + 1);
      await recordVote(questionId, choice);
      await incrementStreak();
    },
    [questionId, view.kind],
  );

  const handleSkip = useCallback(() => {
    if (view.kind !== "choice") return;
    advance();
    void resetStreak();
  }, [advance, view.kind]);

  /** Re-randomise the questions still to come this round; never repeats until the pool resets. */
  const handleShuffle = useCallback(() => {
    if (view.kind !== "choice") return;
    const remaining = deck.slice(deckPos + 1);
    if (remaining.length === 0) {
      advance();
      return;
    }
    setDeck([...deck.slice(0, deckPos + 1), ...shuffleArray(remaining)]);
  }, [advance, deck, deckPos, view.kind]);

  /** Keys 1 and 2 pick the first and second option while on the choice screen. */
  useEffect(() => {
    if (view.kind !== "choice") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "1") void handleChoose("a");
      if (event.key === "2") void handleChoose("b");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleChoose, view.kind]);

  /** Reset stats returns the whole game to first-run state, deck included. */
  const handleStatsReset = useCallback(() => {
    setDeck(shuffleQuestionIds());
    setDeckPos(0);
    setAnsweredCount(0);
    lockRef.current = false;
    setView({ kind: "choice" });
  }, []);

  const currentStreak = streak?.current ?? 0;
  const bestStreak = streak?.best ?? 0;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-6">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Party game
          </p>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Would You Rather</h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            Streak: {streakLoading ? "…" : currentStreak}
          </Badge>
          <Badge variant="outline" className="text-xs">
            Best: {streakLoading ? "…" : bestStreak}
          </Badge>
        </div>
      </header>

      {storageStatus === "memory" ? (
        <Alert>
          <AlertTitle>This browser will not keep your data</AlertTitle>
          <AlertDescription>
            Storage was refused here, so votes and streaks last only for this session. Export them
            from the Stats tab if you want to keep a copy.
          </AlertDescription>
        </Alert>
      ) : null}

      <Tabs defaultValue="play">
        <TabsList className="w-full">
          <TabsTrigger value="play" className="flex-1">
            Play
          </TabsTrigger>
          <TabsTrigger value="stats" className="flex-1">
            Stats
          </TabsTrigger>
        </TabsList>

        <TabsContent value="play" className="mt-4">
          {view.kind === "choice" ? (
            <ChoiceView
              question={question}
              answeredCount={answeredCount}
              onChoose={handleChoose}
              onSkip={handleSkip}
              onShuffle={handleShuffle}
            />
          ) : (
            <RevealView
              questionId={view.questionId}
              choice={view.choice}
              prior={view.prior}
              onNext={advance}
            />
          )}
        </TabsContent>

        <TabsContent value="stats" className="mt-4">
          <StatsView onReset={handleStatsReset} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

type ChoiceViewProps = {
  question: ReturnType<typeof getQuestion>;
  answeredCount: number;
  onChoose: (choice: VoteChoice) => void;
  onSkip: () => void;
  onShuffle: () => void;
};

function ChoiceView({ question, answeredCount, onChoose, onSkip, onShuffle }: ChoiceViewProps) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-center text-sm font-semibold text-muted-foreground">
        {answeredCount} of {QUESTION_COUNT} answered this round
      </p>
      <h2 className="text-center text-xl font-extrabold sm:text-2xl">Would you rather…</h2>

      <div className="flex flex-col gap-3">
        <Button
          size="lg"
          className="h-auto whitespace-normal px-4 py-5 text-left text-base font-bold sm:text-lg"
          onClick={() => onChoose("a")}
        >
          <span className="mr-2 rounded bg-primary-foreground/20 px-1.5 py-0.5 text-xs">1</span>
          {question.optionA}
        </Button>
        <Button
          size="lg"
          className="h-auto whitespace-normal px-4 py-5 text-left text-base font-bold sm:text-lg"
          onClick={() => onChoose("b")}
        >
          <span className="mr-2 rounded bg-primary-foreground/20 px-1.5 py-0.5 text-xs">2</span>
          {question.optionB}
        </Button>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onShuffle}>
          Shuffle
        </Button>
        <Button variant="outline" className="flex-1" onClick={onSkip}>
          Skip
        </Button>
      </div>
      <p className="text-center text-xs text-muted-foreground">
        Tip: press 1 or 2 to pick an option. Skipping resets your streak.
      </p>
    </div>
  );
}

type RevealViewProps = {
  questionId: string;
  choice: VoteChoice;
  prior: Tallies;
  onNext: () => void;
};

function RevealView({ questionId, choice, prior, onNext }: RevealViewProps) {
  const question = getQuestion(questionId);
  const total = prior.a + prior.b;
  const percentA = total === 0 ? 0 : Math.round((prior.a / total) * 100);
  const percentB = 100 - percentA;
  const aWins = prior.a > prior.b;
  const bWins = prior.b > prior.a;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-center text-xl font-extrabold sm:text-2xl">Would you rather…</h2>
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          {total === 0 ? (
            <p className="text-center text-sm font-semibold text-muted-foreground">
              You&rsquo;re the first to answer this one! Bars will appear here once other players on
              this device have voted.
            </p>
          ) : (
            <>
              <ResultBar
                label={question.optionA}
                percent={percentA}
                count={prior.a}
                isWinner={aWins}
                isTied={!aWins && !bWins}
                isYourPick={choice === "a"}
                tone="a"
              />
              <ResultBar
                label={question.optionB}
                percent={percentB}
                count={prior.b}
                isWinner={bWins}
                isTied={!aWins && !bWins}
                isYourPick={choice === "b"}
                tone="b"
              />
            </>
          )}
          <p className="text-center text-xs font-medium text-muted-foreground">
            {choice === "a" ? "You picked the first option." : "You picked the second option."}
          </p>
        </CardContent>
      </Card>
      <Button size="lg" onClick={onNext}>
        Next question
      </Button>
    </div>
  );
}

type ResultBarProps = {
  label: string;
  percent: number;
  count: number;
  isWinner: boolean;
  isTied: boolean;
  isYourPick: boolean;
  tone: "a" | "b";
};

function ResultBar({ label, percent, count, isWinner, isTied, isYourPick, tone }: ResultBarProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center justify-between gap-1">
        <p className="text-sm font-semibold">
          {label}
          {isYourPick ? (
            <Badge className="ml-2 align-middle text-[10px]">You picked this</Badge>
          ) : null}
          {isWinner ? (
            <Badge className="ml-2 align-middle text-[10px]">Leader</Badge>
          ) : null}
          {isTied && count > 0 ? (
            <Badge variant="outline" className="ml-2 align-middle text-[10px]">
              Even split
            </Badge>
          ) : null}
        </p>
        <p className="text-sm font-bold tabular-nums">{percent}%</p>
      </div>
      <div
        className="h-4 w-full overflow-hidden rounded-full bg-muted"
        role="img"
        aria-label={`${label}: ${percent}% (${count} ${count === 1 ? "vote" : "votes"})`}
      >
        <div
          className={`h-full rounded-full ${tone === "a" ? "bg-chart-1" : "bg-chart-2"} ${
            isWinner ? "opacity-100" : "opacity-70"
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {count} {count === 1 ? "vote" : "votes"} before yours
      </p>
    </div>
  );
}