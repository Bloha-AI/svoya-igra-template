import { gameContent, questions, validateContent } from "../src/lib/content";
const errors = validateContent(gameContent);
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(
  `Content valid: ${gameContent.categories.length} categories, ${questions.length} questions.`,
);
