"use client";

/**
 * Stats tab: every question with how many times it was answered on this device, which side was
 * picked last, and the current percentage split per side. Built on TanStack Table over live
 * database queries. Includes the confirmed "Reset stats" control and file export/import.
 */
import { useMemo, useRef, useState } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { database, type VoteChoice, type VoteRecord } from "@/lib/db";
import { clearAllStats, listVotes } from "@/lib/data/game";
import { getQuestion, QUESTION_COUNT } from "@/lib/data/questions";
import { useDatabaseTransfer, useStoredQuery } from "@/lib/storage/react";

export type StatsRow = {
  questionId: string;
  label: string;
  answered: number;
  lastPick: VoteChoice | null;
  percentA: number;
  percentB: number;
  votesA: number;
  votesB: number;
};

function buildRows(votes: VoteRecord[]): StatsRow[] {
  const byQuestion = new Map<string, VoteRecord[]>();
  for (const vote of votes) {
    const bucket = byQuestion.get(vote.questionId);
    if (bucket) bucket.push(vote);
    else byQuestion.set(vote.questionId, [vote]);
  }
  const rows: StatsRow[] = [];
  for (const [questionId, entries] of byQuestion) {
    const question = getQuestion(questionId);
    const votesA = entries.filter((entry) => entry.choice === "a").length;
    const votesB = entries.length - votesA;
    const last = entries[entries.length - 1]!;
    rows.push({
      questionId,
      label: `${question.optionA}  vs  ${question.optionB}`,
      answered: entries.length,
      lastPick: last.choice,
      percentA: Math.round((votesA / entries.length) * 100),
      percentB: 100 - Math.round((votesA / entries.length) * 100),
      votesA,
      votesB,
    });
  }
  return rows;
}

const columnHelper = createColumnHelper<StatsRow>();

export function StatsView({ onReset }: { onReset: () => void }) {
  const { data: votes, isLoading } = useStoredQuery(database, listVotes);
  const [sorting, setSorting] = useState<SortingState>([{ id: "answered", desc: true }]);
  const { exportToFile, importFromFile, state: transferState } = useDatabaseTransfer(database);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const rows = useMemo(() => (votes ? buildRows(votes) : []), [votes]);

  const columns = useMemo(
    () => [
      columnHelper.accessor("label", {
        header: "Question",
        cell: (info) => <span className="font-medium">{info.getValue()}</span>,
      }),
      columnHelper.accessor("answered", {
        header: "Times answered",
        cell: (info) => <span className="tabular-nums">{info.getValue()}</span>,
      }),
      columnHelper.accessor("lastPick", {
        header: "Your last pick",
        cell: (info) => {
          const pick = info.getValue();
          if (!pick) return <span className="text-muted-foreground">—</span>;
          const question = getQuestion(info.row.original.questionId);
          return (
            <Badge variant="secondary" className="max-w-40 truncate text-[10px]">
              {pick === "a" ? question.optionA : question.optionB}
            </Badge>
          );
        },
      }),
      columnHelper.accessor("percentA", {
        header: "Option A split",
        cell: (info) => (
          <span className="tabular-nums">
            {info.getValue()}% / {info.row.original.percentB}%
          </span>
        ),
      }),
    ],
    [],
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const handleConfirmReset = async () => {
    await clearAllStats();
    onReset();
    setConfirmOpen(false);
  };

  if (isLoading) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Loading stats…</p>;
  }

  const totalVotes = votes?.length ?? 0;

  return (
    <div className="flex flex-col gap-4">
      {totalVotes === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="font-semibold">No votes yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Answer a question in the Play tab and your stats will appear here.
          </p>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {totalVotes} {totalVotes === 1 ? "vote" : "votes"} across {rows.length} of{" "}
            {QUESTION_COUNT} questions, recorded on this device only.
          </p>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        onClick={header.column.getToggleSortingHandler()}
                        className="cursor-pointer select-none whitespace-nowrap"
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="align-top">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">Reset stats</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Reset all stats?</DialogTitle>
              <DialogDescription>
                This clears every recorded vote and your streak history on this device. The game
                returns to its first-run state. This cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setConfirmOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => void handleConfirmReset()}>
                Reset everything
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Button variant="ghost" onClick={() => void exportToFile()}>
          Export data
        </Button>
        <Button variant="ghost" onClick={() => fileInputRef.current?.click()}>
          Import data
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void importFromFile(file, "replace");
            event.target.value = "";
          }}
        />
      </div>
      {transferState.kind === "error" ? (
        <p className="text-sm font-medium text-destructive">{transferState.message}</p>
      ) : null}
      {transferState.kind === "imported" ? (
        <p className="text-sm font-medium text-muted-foreground">
          Import complete: {transferState.result.imported} rows applied.
        </p>
      ) : null}
    </div>
  );
}