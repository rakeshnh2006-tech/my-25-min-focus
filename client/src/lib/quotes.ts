export interface Quote {
  text: string;
  author: string;
}

export const STUDY_QUOTES: Quote[] = [
  { text: "Focus is a muscle. The more you practice single-tasking, the stronger it becomes.", author: "Cal Newport" },
  { text: "Small disciplines repeated with consistency every day lead to great achievements.", author: "John C. Maxwell" },
  { text: "You don't have to be extreme, just consistent.", author: "Anonymous" },
  { text: "Action precedes motivation. Start for just five minutes, and momentum takes over.", author: "James Clear" },
  { text: "Deep work is the ability to focus without distraction on a cognitively demanding task.", author: "Deep Work" },
  { text: "Quality of work is time spent multiplied by intensity of focus.", author: "Cal Newport" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "It is not that we have a short time to live, but that we waste a lot of it.", author: "Seneca" },
];

export function getRandomQuote(): Quote {
  const index = Math.floor(Math.random() * STUDY_QUOTES.length);
  return STUDY_QUOTES[index];
}
