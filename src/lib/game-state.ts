import {
  contentVersion,
  findQuestion,
  gameContent,
  questions,
} from "./content";

export type Team = { id: string; name: string; score: number };
export type Settings = {
  penalty: boolean;
  timerSeconds: number;
  sound: boolean;
};
export type CurrentQuestion = {
  id: string;
  selectedTeamId: string | null;
  attemptedTeamIds: string[];
  revealed: boolean;
  resolved: boolean;
  visible: boolean;
  remainingMs: number;
  running: boolean;
};
export type Snapshot = {
  status: "setup" | "playing" | "finished";
  teams: Team[];
  settings: Settings;
  completed: Record<string, string | null>;
  current: CurrentQuestion | null;
  choosingTeamId: string;
};
export type HistoryEntry = { label: string; before: Snapshot };
export type GameState = Snapshot & { history: HistoryEntry[]; notice: string };
export type Action =
  | { type: "start"; names: string[]; settings: Settings }
  | { type: "configure"; names: string[]; settings: Settings }
  | { type: "open"; id: string }
  | { type: "hide" }
  | { type: "selectTeam"; id: string }
  | { type: "chooseTurn"; id: string }
  | { type: "reveal" }
  | { type: "judge"; correct: boolean }
  | { type: "skip" }
  | { type: "setScore"; id: string; score: number }
  | { type: "timer"; running: boolean }
  | { type: "resetTimer" }
  | { type: "tick"; elapsedMs: number }
  | { type: "finish" }
  | { type: "undo" }
  | { type: "restore"; state: GameState };

export function initialState(names = gameContent.defaultTeams): GameState {
  return {
    status: "setup",
    teams: names.map((name, i) => ({ id: `team-${i + 1}`, name, score: 0 })),
    settings: {
      penalty: true,
      timerSeconds: gameContent.timerSeconds,
      sound: false,
    },
    completed: {},
    current: null,
    choosingTeamId: "team-1",
    history: [],
    notice: "",
  };
}

function validSettings(settings: Settings) {
  return (
    typeof settings.penalty === "boolean" &&
    typeof settings.sound === "boolean" &&
    Number.isInteger(settings.timerSeconds) &&
    settings.timerSeconds >= 0 &&
    settings.timerSeconds <= 300
  );
}
function validNames(names: string[]) {
  return (
    names.length >= 2 &&
    names.length <= 6 &&
    names.every(
      (name) =>
        typeof name === "string" &&
        name.trim().length > 0 &&
        name.trim().length <= 32,
    )
  );
}
function snapshot(state: GameState): Snapshot {
  return structuredClone({
    status: state.status,
    teams: state.teams,
    settings: state.settings,
    completed: state.completed,
    current: state.current,
    choosingTeamId: state.choosingTeamId,
  });
}
function record(
  state: GameState,
  patch: Partial<Snapshot>,
  label: string,
): GameState {
  return {
    ...state,
    ...patch,
    notice: label,
    history: [...state.history, { label, before: snapshot(state) }].slice(-60),
  };
}
function pauseCurrent(current: CurrentQuestion | null) {
  return current ? { ...current, running: false } : null;
}

export function gameReducer(state: GameState, action: Action): GameState {
  if (action.type === "restore")
    return {
      ...action.state,
      current: pauseCurrent(action.state.current),
      notice: "Игра восстановлена. Таймер на паузе.",
    };
  if (action.type === "start") {
    if (!validNames(action.names) || !validSettings(action.settings))
      return state;
    return {
      ...initialState(action.names.map((name) => name.trim())),
      status: "playing",
      settings: action.settings,
      notice: "Игра началась. Выберите тему и стоимость вопроса.",
    };
  }
  if (action.type === "undo") {
    const entry = state.history.at(-1);
    if (!entry) return state;
    return {
      ...entry.before,
      current: pauseCurrent(entry.before.current),
      history: state.history.slice(0, -1),
      notice: `Отменено: ${entry.label}`,
    };
  }
  if (action.type === "configure") {
    if (
      !validNames(action.names) ||
      !validSettings(action.settings) ||
      (state.status !== "setup" && action.names.length !== state.teams.length)
    )
      return state;
    const teams = action.names.map((name, i) => ({
      id: `team-${i + 1}`,
      name: name.trim(),
      score: state.teams[i]?.score ?? 0,
    }));
    return record(
      state,
      { teams, settings: action.settings },
      "Настройки сохранены",
    );
  }
  if (state.status !== "playing") return state;
  const current = state.current;
  switch (action.type) {
    case "open": {
      if (!findQuestion(action.id)) return state;
      if (current)
        return current.id === action.id
          ? { ...state, current: { ...current, visible: true } }
          : state;
      if (Object.hasOwn(state.completed, action.id)) return state;
      return record(
        state,
        {
          current: {
            id: action.id,
            selectedTeamId: null,
            attemptedTeamIds: [],
            revealed: false,
            resolved: false,
            visible: true,
            remainingMs: state.settings.timerSeconds * 1000,
            running: false,
          },
        },
        `Открыт вопрос за ${findQuestion(action.id)!.value}`,
      );
    }
    case "hide": {
      if (!current) return state;
      const allDone = Object.keys(state.completed).length === questions.length;
      return {
        ...state,
        current: current.resolved
          ? null
          : { ...current, visible: false, running: false },
        status: allDone && current.resolved ? "finished" : "playing",
      };
    }
    case "selectTeam": {
      if (
        !current ||
        current.resolved ||
        current.revealed ||
        (state.settings.timerSeconds > 0 && current.remainingMs <= 0) ||
        current.attemptedTeamIds.includes(action.id) ||
        !state.teams.some((t) => t.id === action.id)
      )
        return state;
      return {
        ...state,
        current: { ...current, selectedTeamId: action.id, running: false },
      };
    }
    case "chooseTurn":
      return state.teams.some((t) => t.id === action.id)
        ? record(
            state,
            { choosingTeamId: action.id },
            "Право выбора передано другой команде",
          )
        : state;
    case "reveal":
      return current && !current.revealed
        ? record(
            state,
            { current: { ...current, revealed: true, running: false } },
            "Ответ открыт",
          )
        : state;
    case "judge": {
      if (
        !current ||
        current.resolved ||
        !current.selectedTeamId ||
        current.attemptedTeamIds.includes(current.selectedTeamId)
      )
        return state;
      const question = findQuestion(current.id);
      const team = state.teams.find((t) => t.id === current.selectedTeamId);
      if (!question || !team) return state;
      const delta = action.correct
        ? question.value
        : state.settings.penalty
          ? -question.value
          : 0;
      const attemptedTeamIds = [...current.attemptedTeamIds, team.id];
      const resolved =
        action.correct ||
        current.revealed ||
        attemptedTeamIds.length === state.teams.length;
      return record(
        state,
        {
          teams: state.teams.map((t) =>
            t.id === team.id ? { ...t, score: t.score + delta } : t,
          ),
          choosingTeamId: action.correct ? team.id : state.choosingTeamId,
          completed: resolved
            ? {
                ...state.completed,
                [current.id]: action.correct ? team.id : null,
              }
            : state.completed,
          current: {
            ...current,
            selectedTeamId: null,
            attemptedTeamIds,
            resolved,
            revealed: resolved || current.revealed,
            running: false,
          },
        },
        `${team.name}: ${action.correct ? "верно" : "неверно"}, ${delta > 0 ? "+" : ""}${delta} баллов`,
      );
    }
    case "skip":
      return current && !current.resolved
        ? record(
            state,
            {
              completed: { ...state.completed, [current.id]: null },
              current: {
                ...current,
                resolved: true,
                revealed: true,
                selectedTeamId: null,
                running: false,
              },
            },
            "Вопрос завершён без начисления",
          )
        : state;
    case "setScore": {
      const team = state.teams.find((t) => t.id === action.id);
      if (
        !team ||
        !Number.isSafeInteger(action.score) ||
        Math.abs(action.score) > 1000000 ||
        action.score === team.score
      )
        return state;
      return record(
        state,
        {
          teams: state.teams.map((t) =>
            t.id === action.id ? { ...t, score: action.score } : t,
          ),
        },
        `${team.name}: счёт изменён на ${action.score}`,
      );
    }
    case "timer":
      return current &&
        !current.revealed &&
        !current.resolved &&
        current.remainingMs > 0 &&
        state.settings.timerSeconds > 0
        ? { ...state, current: { ...current, running: action.running } }
        : state;
    case "resetTimer":
      return current && !current.resolved && !current.revealed
        ? {
            ...state,
            current: {
              ...current,
              remainingMs: state.settings.timerSeconds * 1000,
              running: false,
            },
          }
        : state;
    case "tick": {
      if (
        !current?.running ||
        !Number.isFinite(action.elapsedMs) ||
        action.elapsedMs <= 0
      )
        return state;
      const remainingMs = Math.max(0, current.remainingMs - action.elapsedMs);
      return {
        ...state,
        current: { ...current, remainingMs, running: remainingMs > 0 },
        notice:
          remainingMs === 0
            ? "Время вышло. Решение принимает ведущий."
            : state.notice,
      };
    }
    case "finish":
      return record(
        state,
        { status: "finished", current: pauseCurrent(current) },
        "Игра завершена",
      );
    default:
      return state;
  }
}

export const storageKey = `classroom-quiz:${gameContent.id}:${contentVersion}:v1`;
export function serializeGame(state: GameState): string {
  return JSON.stringify({ version: 1, contentVersion, state });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function validSnapshot(value: unknown): value is Snapshot {
  if (
    !isRecord(value) ||
    !["setup", "playing", "finished"].includes(String(value.status)) ||
    !Array.isArray(value.teams) ||
    !isRecord(value.settings) ||
    !isRecord(value.completed)
  )
    return false;
  if (value.teams.length < 2 || value.teams.length > 6) return false;
  const teamIds: string[] = [];
  for (const team of value.teams) {
    if (
      !isRecord(team) ||
      typeof team.id !== "string" ||
      !/^team-[1-6]$/.test(team.id) ||
      teamIds.includes(team.id) ||
      typeof team.name !== "string" ||
      !team.name.trim() ||
      team.name.length > 32 ||
      !Number.isSafeInteger(team.score) ||
      Math.abs(Number(team.score)) > 2000000
    )
      return false;
    teamIds.push(team.id);
  }
  if (
    !validSettings(value.settings as Settings) ||
    !teamIds.includes(String(value.choosingTeamId))
  )
    return false;
  for (const [id, winner] of Object.entries(value.completed))
    if (
      !findQuestion(id) ||
      (winner !== null && !teamIds.includes(String(winner)))
    )
      return false;
  const current = value.current;
  if (current !== null) {
    if (
      !isRecord(current) ||
      typeof current.id !== "string" ||
      !findQuestion(current.id) ||
      !Array.isArray(current.attemptedTeamIds) ||
      current.attemptedTeamIds.some(
        (id) => typeof id !== "string" || !teamIds.includes(id),
      ) ||
      new Set(current.attemptedTeamIds).size !== current.attemptedTeamIds.length
    )
      return false;
    if (
      current.selectedTeamId !== null &&
      (typeof current.selectedTeamId !== "string" ||
        !teamIds.includes(current.selectedTeamId) ||
        current.attemptedTeamIds.includes(current.selectedTeamId))
    )
      return false;
    if (
      ["revealed", "resolved", "visible", "running"].some(
        (key) => typeof current[key] !== "boolean",
      ) ||
      typeof current.remainingMs !== "number" ||
      !Number.isFinite(current.remainingMs) ||
      current.remainingMs < 0 ||
      current.remainingMs > 300000
    )
      return false;
    if (
      current.resolved !== Object.hasOwn(value.completed, current.id) ||
      (current.resolved && !current.revealed)
    )
      return false;
  }
  return true;
}

export function parseSavedGame(raw: string): GameState | null {
  try {
    if (raw.length > 1000000) return null;
    const data: unknown = JSON.parse(raw);
    if (
      !isRecord(data) ||
      data.version !== 1 ||
      data.contentVersion !== contentVersion ||
      !validSnapshot(data.state)
    )
      return null;
    const saved = data.state as GameState;
    if (
      !Array.isArray(saved.history) ||
      saved.history.length > 60 ||
      !saved.history.every(
        (h: unknown) =>
          isRecord(h) &&
          typeof h.label === "string" &&
          h.label.length <= 250 &&
          validSnapshot(h.before),
      )
    )
      return null;
    return { ...saved, current: pauseCurrent(saved.current), notice: "" };
  } catch {
    return null;
  }
}

export function rankedTeams(teams: Team[]) {
  return [...teams]
    .sort((a, b) => b.score - a.score)
    .map((team, _, sorted) => ({
      ...team,
      place: sorted.findIndex((t) => t.score === team.score) + 1,
    }));
}
