export interface Quote {
  text: string;
  author: string;
}

export const STUDY_QUOTES: Quote[] = [
  { text: "Focus is a muscle. The more you practice single-tasking, the stronger it becomes.", author: "Cal Newport" },
  { text: "Small disciplines repeated with consistency every day lead to great achievements.", author: "John C. Maxwell" },
  { text: "You don't have to be extreme, just consistent.", author: "James Clear" },
  { text: "Action precedes motivation. Start for just five minutes, and momentum takes over.", author: "Atomic Habits" },
  { text: "Deep work is the ability to focus without distraction on a cognitively demanding task.", author: "Cal Newport" },
  { text: "Quality of work is time spent multiplied by intensity of focus.", author: "Deep Work" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "It is not that we have a short time to live, but that we waste a lot of it.", author: "Seneca" },
  { text: "Your future is created by what you do today, not tomorrow.", author: "Robert Kiyosaki" },
  { text: "Live as if you were to die tomorrow. Learn as if you were to live forever.", author: "Mahatma Gandhi" },
  { text: "The master has failed more times than the beginner has even tried.", author: "Stephen McCranie" },
  { text: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier" },
  { text: "Concentrate all your thoughts upon the work in hand. The sun's rays do not burn until brought to a focus.", author: "Alexander Graham Bell" },
  { text: "Discipline is choosing between what you want now and what you want most.", author: "Abraham Lincoln" },
  { text: "One can have no smaller or greater mastery than mastery of oneself.", author: "Leonardo da Vinci" },
  { text: "Simplicity boils down to two steps: Identify the essential. Eliminate the rest.", author: "Leo Babauta" },
  { text: "Energy flows where attention goes.", author: "Tony Robbins" },
  { text: "The ability to perform deep work is becoming increasingly rare at exactly the same time it is becoming increasingly valuable in our economy.", author: "Cal Newport" }
];

export function getRandomQuote(): Quote {
  const index = Math.floor(Math.random() * STUDY_QUOTES.length);
  return STUDY_QUOTES[index];
}
