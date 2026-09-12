import data from "@/data/game.json";

export type Question = {
  id: string;
  value: number;
  question: string;
  answer: string;
  explanation: string;
  acceptedAnswers?: string[];
  source?: string;
};
export type Category = {
  id: string;
  title: string;
  icon?: string;
  questions: Question[];
};
export type GameContent = {
  id: string;
  title: string;
  subtitle: string;
  audience: string;
  roundName: string;
  timerSeconds: number;
  defaultTeams: string[];
  categories: Category[];
};

export function validateContent(content: GameContent): string[] {
  const errors: string[] = [];
  for (const field of ["id", "title", "audience", "roundName"] as const) {
    if (!content[field]?.trim()) errors.push(`Missing ${field}`);
  }
  if (
    !Number.isInteger(content.timerSeconds) ||
    content.timerSeconds < 0 ||
    content.timerSeconds > 300
  )
    errors.push("timerSeconds must be an integer from 0 to 300");
  if (
    content.defaultTeams.length < 2 ||
    content.defaultTeams.length > 6 ||
    content.defaultTeams.some((name) => !name.trim() || name.length > 32)
  )
    errors.push("Provide 2–6 team names, 1–32 characters each");
  if (content.categories.length < 1 || content.categories.length > 8)
    errors.push("Provide 1–8 categories");
  const ids = new Set<string>();
  const categoryIds = new Set<string>();
  for (const category of content.categories) {
    if (!category.id?.trim() || categoryIds.has(category.id))
      errors.push(`Invalid category id: ${category.id}`);
    categoryIds.add(category.id);
    if (!category.title.trim())
      errors.push(`Missing category title: ${category.id}`);
    if (category.questions.length < 1 || category.questions.length > 8)
      errors.push(`Provide 1–8 questions in ${category.id}`);
    let previous = 0;
    for (const question of category.questions) {
      if (!question.id.trim() || ids.has(question.id))
        errors.push(`Duplicate or empty question id: ${question.id}`);
      ids.add(question.id);
      if (
        !Number.isSafeInteger(question.value) ||
        question.value <= previous ||
        question.value > 10000
      )
        errors.push(`Values must increase from 1 to 10000: ${question.id}`);
      previous = question.value;
      if (
        !question.question.trim() ||
        !question.answer.trim() ||
        !question.explanation.trim()
      )
        errors.push(`Incomplete question: ${question.id}`);
      if (question.source && !/^https:\/\//.test(question.source))
        errors.push(`Source must use HTTPS: ${question.id}`);
    }
  }
  return errors;
}

export const gameContent: GameContent = data;
export const questions = gameContent.categories.flatMap(
  (category) => category.questions,
);
export function findQuestion(id: string) {
  return questions.find((question) => question.id === id);
}
export function categoryFor(id: string) {
  return gameContent.categories.find((category) =>
    category.questions.some((q) => q.id === id),
  );
}

// Content changes invalidate old sessions even if a template editor forgets to change id.
function fingerprint(value: string): string {
  let hash = 2166136261;
  for (const character of value)
    hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return (hash >>> 0).toString(36);
}
export const contentVersion = fingerprint(JSON.stringify(data));
