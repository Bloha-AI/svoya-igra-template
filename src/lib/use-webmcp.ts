"use client";

import { useEffect, useLayoutEffect, useRef, type Dispatch } from "react";
import { flushSync } from "react-dom";
import { findQuestion, gameContent } from "./content";
import { gameReducer, type Action, type GameState } from "./game-state";

type Tool = {
  name: string;
  description: string;
  inputSchema: object;
  annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
  execute(input: unknown): unknown;
};
type ToolContext = {
  registerTool(
    tool: Tool,
    options?: { signal: AbortSignal },
  ): void | Promise<void>;
};

// Progressive enhancement: no requests, remote SDKs, or dependency on browser support.
export function useWebMCP(state: GameState, dispatch: Dispatch<Action>) {
  const latest = useRef(state);
  useLayoutEffect(() => {
    latest.current = state;
  }, [state]);
  useEffect(() => {
    const context = (document as Document & { modelContext?: ToolContext })
      .modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const readState = () => {
      const game = latest.current;
      const current = game.current;
      const question = current ? findQuestion(current.id) : null;
      return {
        title: gameContent.title,
        status: game.status,
        teams: game.teams,
        completedQuestionIds: Object.keys(game.completed),
        categories: gameContent.categories.map((c) => ({
          title: c.title,
          questions: c.questions.map((q) => ({ id: q.id, value: q.value })),
        })),
        currentQuestion:
          current && question
            ? {
                id: current.id,
                question: question.question,
                ...(current.revealed ? { answer: question.answer } : {}),
                selectedTeamId: current.selectedTeamId,
                resolved: current.resolved,
              }
            : null,
      };
    };
    const apply = (action: Action) => {
      if (gameReducer(latest.current, action) === latest.current)
        throw new Error("Action is not available in the current game state.");
      flushSync(() => dispatch(action));
      return readState();
    };
    const emptySchema = {
      type: "object",
      properties: {},
      additionalProperties: false,
    };
    const objectInput = (input: unknown): Record<string, unknown> => {
      if (!input || typeof input !== "object" || Array.isArray(input))
        throw new Error("Expected an object.");
      return input as Record<string, unknown>;
    };
    const tools: Tool[] = [
      {
        name: "read_game_state",
        description:
          "Read the classroom quiz board and scores. Hidden answers are omitted.",
        inputSchema: emptySchema,
        annotations: { readOnlyHint: true, untrustedContentHint: true },
        execute: () => readState(),
      },
      {
        name: "open_question",
        description:
          "Open an available question in an already started game. Does not change scores.",
        inputSchema: {
          type: "object",
          properties: { questionId: { type: "string" } },
          required: ["questionId"],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: true },
        execute(input) {
          const data = objectInput(input);
          if (
            Object.keys(data).length !== 1 ||
            typeof data.questionId !== "string" ||
            !findQuestion(data.questionId)
          )
            throw new Error("Unknown question id.");
          return apply({ type: "open", id: data.questionId });
        },
      },
      {
        name: "select_answering_team",
        description:
          "Select which team is answering the current question, as the teacher does in the interface.",
        inputSchema: {
          type: "object",
          properties: { teamId: { type: "string" } },
          required: ["teamId"],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: true },
        execute(input) {
          const data = objectInput(input);
          if (Object.keys(data).length !== 1 || typeof data.teamId !== "string")
            throw new Error("Expected teamId.");
          return apply({ type: "selectTeam", id: data.teamId });
        },
      },
      {
        name: "record_answer_result",
        description:
          "Mark the selected team's answer correct or incorrect and update the score according to the current game rules. Requires a selected answering team.",
        inputSchema: {
          type: "object",
          properties: { correct: { type: "boolean" } },
          required: ["correct"],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: true },
        execute(input) {
          const data = objectInput(input);
          if (
            Object.keys(data).length !== 1 ||
            typeof data.correct !== "boolean"
          )
            throw new Error("Expected boolean correct.");
          return apply({ type: "judge", correct: data.correct });
        },
      },
    ];
    for (const tool of tools) {
      try {
        void Promise.resolve(
          context.registerTool(tool, { signal: lifecycle.signal }),
        ).catch(() => {});
      } catch {
        /* Unsupported implementations must not break the classroom game. */
      }
    }
    return () => lifecycle.abort();
  }, [dispatch]);
}
