import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Game } from "../src/components/game";
import { QuestionDialog } from "../src/components/question-dialog";
import { Results } from "../src/components/results";
import { questions } from "../src/lib/content";
import { gameReducer, initialState } from "../src/lib/game-state";

test("the initial server-rendered surface contains the real board and start control", () => {
  const html = renderToStaticMarkup(createElement(Game));
  assert.ok(html.includes("Игровое табло"));
  assert.ok(html.includes("Начать игру"));
  assert.equal(
    (html.match(/class="question-cell/g) || []).length,
    questions.length,
  );
  assert.ok(!html.includes('class="answer-panel"'));
});

test("the question dialog omits the answer panel until explicitly revealed", () => {
  let state = initialState();
  state = gameReducer(state, {
    type: "start",
    names: ["Первая", "Вторая"],
    settings: state.settings,
  });
  state = gameReducer(state, { type: "open", id: questions[0].id });
  const render = () =>
    renderToStaticMarkup(
      createElement(QuestionDialog, { state, dispatch() {}, onClose() {} }),
    );
  assert.ok(!render().includes('class="answer-panel"'));
  state = gameReducer(state, { type: "reveal" });
  assert.ok(render().includes('class="answer-panel"'));
  assert.ok(render().includes("ПРАВИЛЬНЫЙ ОТВЕТ"));
});

test("tied scores render a draw instead of inventing a single winner", () => {
  const state = { ...initialState(), status: "finished" as const };
  const html = renderToStaticMarkup(
    createElement(Results, { state, onNewGame() {}, onUndo() {} }),
  );
  assert.ok(html.includes("Достойная ничья"));
});
