/**
 * The built-in question pool for Would You Rather.
 *
 * The game component renders purely from this module: ids and option text here are the single
 * source of truth for both the play screen and the stats table. Every option string across the
 * pool is unique, so a question can never be confused with another.
 */

export type WouldYouRatherQuestion = {
  id: string;
  optionA: string;
  optionB: string;
};

export const QUESTIONS: WouldYouRatherQuestion[] = [
  { id: "q01", optionA: "Talk like a pirate every day for a year", optionB: "Walk backwards everywhere you go for a year" },
  { id: "q02", optionA: "Have spaghetti for hair that regrows every night", optionB: "Have sweat that smells like maple syrup" },
  { id: "q03", optionA: "Only be able to whisper for a month", optionB: "Only be able to shout for a month" },
  { id: "q04", optionA: "Ride a giraffe to work every day", optionB: "Ride a giant tortoise to work every day" },
  { id: "q05", optionA: "Have a permanent clown nose", optionB: "Have shoes that squeak with every step" },
  { id: "q06", optionA: "Sneeze every time someone says your name", optionB: "Yawn every time someone claps" },
  { id: "q07", optionA: "Only eat foods that are blue", optionB: "Only eat foods shaped like triangles" },
  { id: "q08", optionA: "Have a pet dinosaur the size of a chihuahua", optionB: "Have a chihuahua the size of a dinosaur" },
  { id: "q09", optionA: "Live in a house made of jelly", optionB: "Live in a house made of cardboard" },
  { id: "q10", optionA: "Have fingers for toes", optionB: "Have toes for fingers" },
  { id: "q11", optionA: "Always smell like a skunk and never notice", optionB: "Always smell a skunk that nobody else can" },
  { id: "q12", optionA: "Be mildly famous for something embarrassing", optionB: "Be completely unknown but secretly amazing" },
  { id: "q13", optionA: "Sing instead of speak whenever you order food", optionB: "Dance instead of walk whenever you enter a shop" },
  { id: "q14", optionA: "Have every elevator announcement read in your voice", optionB: "Start every phone call with a kazoo solo" },
  { id: "q15", optionA: "Only use a spoon for every meal", optionB: "Only use a fork for every meal" },
  { id: "q16", optionA: "Have a rewind button for your own day", optionB: "Have a pause button for everyone else" },
  { id: "q17", optionA: "Wear a superhero costume to every wedding", optionB: "Wear a wedding dress to every superhero movie" },
  { id: "q18", optionA: "Communicate only in emoji for a week", optionB: "Communicate only in interpretive dance for a week" },
  { id: "q19", optionA: "Have internet stuck at dial-up speed forever", optionB: "Have a phone battery that lasts only two hours" },
  { id: "q20", optionA: "Be chased by a slow-moving zombie for a week", optionB: "Be chased by a very determined goose for a week" },
  { id: "q21", optionA: "Have a laugh that sounds like a car alarm", optionB: "Have a sneeze that sounds like a firework" },
  { id: "q22", optionA: "Know the answer to every trivia question", optionB: "Win every coin flip for the rest of your life" },
  { id: "q23", optionA: "Eat birthday-cake-flavoured toothpaste", optionB: "Brush your teeth with frosting" },
  { id: "q24", optionA: "Have everything you touch turn slightly sticky", optionB: "Have everything you sit on turn slightly cold" },
  { id: "q25", optionA: "Give a speech to 10,000 people while in pajamas", optionB: "Give a speech to 10 people wearing a chicken costume" },
  { id: "q26", optionA: "Have a theme song play whenever you enter a room", optionB: "Have dramatic slow-motion rain follow you outside" },
  { id: "q27", optionA: "Talk to animals, but they are all rude", optionB: "Fly, but only one metre off the ground" },
  { id: "q28", optionA: "Wear flippers as shoes for a year", optionB: "Wear a foam finger as a glove for a year" },
  { id: "q29", optionA: "Have every text autocorrect to Shakespearean English", optionB: "Have every email end with a knock-knock joke" },
  { id: "q30", optionA: "Always find a parking spot right at the entrance", optionB: "Always catch every green light but never drink hot coffee" },
  { id: "q31", optionA: "Be the world's best karaoke singer, but only sing polka", optionB: "Be the world's best dancer, but only on ice" },
  { id: "q32", optionA: "Have a pigeon photobomb every photo you take", optionB: "Have your shadow wave at everyone you pass" },
  { id: "q33", optionA: "Move like a ninja, but only indoors", optionB: "Sprint like a cheetah, but only on sand" },
  { id: "q34", optionA: "High-five everyone you meet", optionB: "Bow to every dog you pass" },
  { id: "q35", optionA: "Live where it is always hot and sunny", optionB: "Live where it is always freezing and snowy" },
  { id: "q36", optionA: "Have a robot vacuum that gossips about you", optionB: "Have a smart fridge that judges your snacks" },
  { id: "q37", optionA: "Win the lottery but wear a wetsuit for a year", optionB: "Inherit a castle with a singing friendly ghost" },
  { id: "q38", optionA: "Never get stuck in traffic again", optionB: "Never wait in a queue again" },
  { id: "q39", optionA: "Pause time, but you cannot move while paused", optionB: "Teleport, but only to places you have been sitting" },
  { id: "q40", optionA: "Have your laugh played on the radio once a month", optionB: "Have your sneeze used as a movie sound effect" },
];

export const QUESTION_COUNT = QUESTIONS.length;

export function getQuestion(id: string): WouldYouRatherQuestion {
  const question = QUESTIONS.find((entry) => entry.id === id);
  if (!question) throw new Error(`Unknown question id: ${id}`);
  return question;
}

/** Fisher–Yates shuffle returning a new array; used to build and rebuild the round deck. */
export function shuffleQuestionIds(): string[] {
  const ids = QUESTIONS.map((question) => question.id);
  for (let i = ids.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j]!, ids[i]!];
  }
  return ids;
}
