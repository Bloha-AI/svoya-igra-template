import assert from "node:assert/strict";
import test from "node:test";
import { gameContent, questions, validateContent } from "../src/lib/content";
import {
  gameReducer,
  initialState,
  parseSavedGame,
  rankedTeams,
  serializeGame,
  type GameState,
  type Action,
} from "../src/lib/game-state";

const first = questions[0];
function playing(penalty = true): GameState {
  return gameReducer(initialState(), {
    type: "start",
    names: ["Альфа", "Бета", "Гамма"],
    settings: { penalty, timerSeconds: 30, sound: false },
  });
}
function apply(state: GameState, ...actions: Action[]): GameState {
  return actions.reduce(gameReducer, state);
}
function withQuestion(penalty = true) {
  return gameReducer(playing(penalty), { type: "open", id: first.id });
}

test("the default content is complete and structurally valid", () => {
  assert.deepEqual(validateContent(gameContent), []);
  assert.ok(questions.length > 0);
  const invalid = structuredClone(gameContent);
  invalid.categories[0].questions[0].answer = "";
  assert.ok(
    validateContent(invalid).some((message) =>
      message.includes("Incomplete question"),
    ),
  );
});

test("an answer cannot score before a team is selected", () => {
  const game = withQuestion();
  assert.equal(gameReducer(game, { type: "judge", correct: true }), game);
  assert.equal(game.current?.revealed, false);
});

test("correct answers score exactly once and pass the next choice to the winner", () => {
  const game = apply(
    withQuestion(),
    { type: "selectTeam", id: "team-2" },
    { type: "judge", correct: true },
  );
  assert.equal(game.teams[1].score, first.value);
  assert.equal(game.choosingTeamId, "team-2");
  assert.equal(game.completed[first.id], "team-2");
  assert.equal(game.current?.revealed, true);
  assert.equal(gameReducer(game, { type: "judge", correct: true }), game);
  const closed = gameReducer(game, { type: "hide" });
  assert.equal(gameReducer(closed, { type: "open", id: first.id }), closed);
});

test("a wrong answer penalizes once, blocks that team, and permits an opponent", () => {
  const wrong = apply(
    withQuestion(),
    { type: "selectTeam", id: "team-1" },
    { type: "judge", correct: false },
  );
  assert.equal(wrong.teams[0].score, -first.value);
  assert.equal(wrong.current?.resolved, false);
  assert.equal(wrong.current?.revealed, false);
  assert.equal(gameReducer(wrong, { type: "selectTeam", id: "team-1" }), wrong);
  assert.equal(gameReducer(wrong, { type: "judge", correct: false }), wrong);
  const correct = apply(
    wrong,
    { type: "selectTeam", id: "team-2" },
    { type: "judge", correct: true },
  );
  assert.equal(correct.teams[0].score, -first.value);
  assert.equal(correct.teams[1].score, first.value);
});

test("school mode does not subtract points for mistakes", () => {
  const game = apply(
    withQuestion(false),
    { type: "selectTeam", id: "team-1" },
    { type: "judge", correct: false },
  );
  assert.equal(game.teams[0].score, 0);
  assert.deepEqual(game.current?.attemptedTeamIds, ["team-1"]);
});

test("revealing the answer changes no scores and locks new attempts", () => {
  const game = apply(withQuestion(), { type: "reveal" });
  assert.deepEqual(
    game.teams.map((team) => team.score),
    [0, 0, 0],
  );
  assert.equal(gameReducer(game, { type: "selectTeam", id: "team-1" }), game);
  assert.equal(gameReducer(game, { type: "judge", correct: true }), game);
});

test("the teacher can judge an answer selected before reveal, but opponents cannot answer afterwards", () => {
  const game = apply(
    withQuestion(),
    { type: "selectTeam", id: "team-1" },
    { type: "reveal" },
    { type: "judge", correct: false },
  );
  assert.equal(game.teams[0].score, -first.value);
  assert.equal(game.current?.resolved, true);
  assert.equal(game.completed[first.id], null);
  assert.equal(gameReducer(game, { type: "selectTeam", id: "team-2" }), game);
});

test("all teams answering incorrectly ends and reveals the question", () => {
  let game = withQuestion();
  for (const id of ["team-1", "team-2", "team-3"])
    game = apply(
      game,
      { type: "selectTeam", id },
      { type: "judge", correct: false },
    );
  assert.equal(game.current?.resolved, true);
  assert.equal(game.current?.revealed, true);
  assert.equal(game.completed[first.id], null);
});

test("temporarily returning to the board preserves attempts and pauses the question", () => {
  const game = apply(
    withQuestion(),
    { type: "timer", running: true },
    { type: "tick", elapsedMs: 2100 },
    { type: "hide" },
  );
  assert.equal(game.current?.visible, false);
  assert.equal(game.current?.running, false);
  assert.equal(game.current?.remainingMs, 27900);
  assert.deepEqual(game.completed, {});
  if (questions[1])
    assert.equal(
      gameReducer(game, { type: "open", id: questions[1].id }),
      game,
    );
  assert.equal(
    gameReducer(game, { type: "open", id: first.id }).current?.visible,
    true,
  );
});

test("timer expiry does not reveal or score and prevents new attempts until reset", () => {
  const game = apply(
    withQuestion(),
    { type: "timer", running: true },
    { type: "tick", elapsedMs: 40000 },
  );
  assert.equal(game.current?.remainingMs, 0);
  assert.equal(game.current?.running, false);
  assert.equal(game.current?.revealed, false);
  assert.equal(gameReducer(game, { type: "selectTeam", id: "team-1" }), game);
  assert.deepEqual(
    game.teams.map((team) => team.score),
    [0, 0, 0],
  );
  assert.equal(
    apply(game, { type: "resetTimer" }, { type: "selectTeam", id: "team-1" })
      .current?.selectedTeamId,
    "team-1",
  );
});

test("undo restores the score, cell, selected team, and paused timer", () => {
  const game = apply(
    withQuestion(),
    { type: "selectTeam", id: "team-2" },
    { type: "judge", correct: true },
    { type: "undo" },
  );
  assert.equal(game.teams[1].score, 0);
  assert.equal(Object.hasOwn(game.completed, first.id), false);
  assert.equal(game.current?.resolved, false);
  assert.equal(game.current?.selectedTeamId, "team-2");
  assert.equal(game.current?.running, false);
});

test("manual corrections are bounded, recorded, and reversible", () => {
  const game = apply(playing(), {
    type: "setScore",
    id: "team-1",
    score: -350,
  });
  assert.equal(game.teams[0].score, -350);
  assert.equal(
    gameReducer(game, { type: "setScore", id: "team-1", score: Number.NaN }),
    game,
  );
  assert.equal(
    gameReducer(game, { type: "setScore", id: "missing", score: 100 }),
    game,
  );
  assert.equal(gameReducer(game, { type: "undo" }).teams[0].score, 0);
});

test("saving and restoring retains a running game's data but pauses its timer", () => {
  const game = apply(
    withQuestion(),
    { type: "timer", running: true },
    { type: "tick", elapsedMs: 5500 },
  );
  const saved = parseSavedGame(serializeGame(game));
  assert.ok(saved);
  assert.equal(saved.current?.remainingMs, 24500);
  assert.equal(saved.current?.running, false);
  assert.deepEqual(saved.teams, game.teams);
  assert.equal(saved.history.length, game.history.length);
});

test("corrupt, incompatible, and structurally invalid saves are rejected", () => {
  assert.equal(parseSavedGame("broken JSON"), null);
  const base = JSON.parse(serializeGame(withQuestion()));
  for (const mutate of [
    (data: typeof base) => {
      data.version = 2;
    },
    (data: typeof base) => {
      data.contentVersion = "different";
    },
    (data: typeof base) => {
      data.state.teams = [];
    },
    (data: typeof base) => {
      data.state.current.id = "missing";
    },
    (data: typeof base) => {
      data.state.current.remainingMs = -100;
    },
    (data: typeof base) => {
      data.state.history[0].before.teams[0].score = "oops";
    },
  ]) {
    const data = structuredClone(base);
    mutate(data);
    assert.equal(parseSavedGame(JSON.stringify(data)), null);
  }
});

test("a full game can complete, show a winner, and restart without stale state", () => {
  let game = playing();
  for (const question of questions)
    game = apply(
      game,
      { type: "open", id: question.id },
      { type: "selectTeam", id: "team-1" },
      { type: "judge", correct: true },
      { type: "hide" },
    );
  assert.equal(game.status, "finished");
  assert.equal(
    game.teams[0].score,
    questions.reduce((sum, question) => sum + question.value, 0),
  );
  assert.equal(rankedTeams(game.teams)[0].id, "team-1");
  assert.ok(parseSavedGame(serializeGame(game)));
  assert.equal(gameReducer(game, { type: "undo" }).status, "playing");
  const restart = gameReducer(game, {
    type: "start",
    names: ["Новые", "Другие"],
    settings: game.settings,
  });
  assert.equal(restart.teams.length, 2);
  assert.deepEqual(restart.completed, {});
  assert.equal(restart.current, null);
  assert.deepEqual(restart.history, []);
});

test("early finish is reversible and shared winning scores receive the same rank", () => {
  const game = gameReducer(playing(), { type: "finish" });
  assert.equal(game.status, "finished");
  assert.equal(gameReducer(game, { type: "undo" }).status, "playing");
  assert.deepEqual(
    rankedTeams(game.teams).map((team) => team.place),
    [1, 1, 1],
  );
});

test("invalid settings and empty team names cannot start a game", () => {
  const state = initialState();
  assert.equal(
    gameReducer(state, {
      type: "start",
      names: ["", "Бета"],
      settings: state.settings,
    }),
    state,
  );
  assert.equal(
    gameReducer(state, {
      type: "start",
      names: ["Альфа", "Бета"],
      settings: { ...state.settings, timerSeconds: -1 },
    }),
    state,
  );
});
