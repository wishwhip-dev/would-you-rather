# Plan

Goal: A party game: show two absurd-but-harmless 'would you rather' options, tap one, then reveal what percentage of previous players on this device picked each. Include 40 built-in questions, a shuffle, a streak counter, and a 'skip' button. Fun, bold, mobile-first.

1. The 40 'would you rather' questions live in their own data module (lib/data/questions.ts), each with a short id and two option strings written as absurd-but-harmless pairs; all 80 option texts are distinct, no question repeats another, and the game component renders purely from that module
2. The main screen shows one question at a time with the two options as two large, boldly styled tap targets stacked for phone-sized screens, each showing the full option text, plus a small round-progress readout (e.g. '13 of 40 answered this round') that updates as questions are played
3. Tapping either option records that choice in the Dexie database for that question and transitions to a reveal view: two horizontal percentage bars with numeric percentage labels that always total 100 (one vote so far reads 100% / 0%, not 50/50), the more popular side visually distinguished as the winner, and the option you just picked clearly marked
4. Tapping an option twice in quick succession, or tapping both options one after the other, records exactly one vote for that question and shows one reveal, never two
5. When a question has no previous votes on this device, the reveal says so in plain text (e.g. 'You're the first to answer this one!') instead of showing 0% bars as if real data existed
6. A streak counter is visible on the main screen as a live readout of the current streak (consecutive questions answered without skipping) and the best streak achieved on this device; answering a question increments it, skipping resets it to zero, and it never displays a negative number
7. A clearly labelled 'Skip' button moves to the next question without recording any vote and resets the current streak to zero
8. A clearly labelled 'Shuffle' button re-randomises which question comes next, and questions do not repeat until the pool has been exhausted, after which it reshuffles and starts over
9. After the reveal, a 'Next question' button advances to the following question and returns to the choice view
10. The whole main flow — both option buttons, skip, shuffle and next — is operable from the keyboard: every control is a real focusable button with a visible label, and pressing keys 1 and 2 while on the choice screen picks the first and second option
11. A stats view (a tab alongside the game) shows a table of every question with how many times you answered it, which side you picked, and the current percentage split for each side on this device, built on the existing TanStack Table and rendered from the database queries; when nothing has been answered yet it shows a plain 'no votes yet' empty state instead of an empty table
12. A 'Reset stats' control, confirmed through a dialog before acting, clears all recorded votes and streak history on this device and returns the game to its first-run state
13. Reloading the page restores the vote tallies, current streak and best streak, so the percentages shown on the reveal reflect every previous vote on this device
14. The layout works on a phone-sized viewport: no horizontal scrolling, the two option cards and all controls fit and remain comfortable touch targets at 360px width, and the same screen scales up cleanly on desktop

These are the outcomes this task is judged against.