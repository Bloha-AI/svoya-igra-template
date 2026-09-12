"use client";

import { useEffect, useRef, type Dispatch } from "react";
import {
  ArrowLeft,
  Check,
  CircleHelp,
  Eye,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  Timer,
  Undo2,
  X,
} from "lucide-react";
import { categoryFor, findQuestion } from "@/lib/content";
import type { Action, GameState } from "@/lib/game-state";
import { Dialog } from "./dialog";

export function QuestionDialog({
  state,
  dispatch,
  onClose,
}: {
  state: GameState;
  dispatch: Dispatch<Action>;
  onClose: () => void;
}) {
  const current = state.current!;
  const question = findQuestion(current.id)!;
  const category = categoryFor(current.id)!;
  const selected = state.teams.find(
    (team) => team.id === current.selectedTeamId,
  );
  const seconds = Math.ceil(current.remainingMs / 1000);
  const expired = state.settings.timerSeconds > 0 && seconds === 0;
  const audio = useRef<AudioContext | null>(null);
  const sounded = useRef(false);
  function unlockAudio() {
    try {
      if (
        state.settings.sound &&
        !audio.current &&
        typeof AudioContext !== "undefined"
      )
        audio.current = new AudioContext();
      void audio.current?.resume().catch(() => {});
    } catch {
      // The timer and scoring remain usable when browser audio is unavailable.
    }
  }
  useEffect(() => {
    if (!expired) {
      sounded.current = false;
      return;
    }
    if (
      !state.settings.sound ||
      sounded.current ||
      !audio.current ||
      audio.current.state !== "running"
    )
      return;
    sounded.current = true;
    const context = audio.current;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = 660;
    gain.gain.setValueAtTime(0.06, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.4);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.4);
  }, [expired, state.settings.sound]);
  useEffect(
    () => () => {
      void audio.current?.close().catch(() => {});
    },
    [],
  );
  useEffect(() => {
    const hotkey = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        event.repeat ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        (target instanceof HTMLElement &&
          ["INPUT", "SELECT", "TEXTAREA", "BUTTON"].includes(target.tagName))
      )
        return;
      if (event.code === "Space") {
        event.preventDefault();
        unlockAudio();
        dispatch({ type: "timer", running: !current.running });
      }
    };
    document.addEventListener("keydown", hotkey);
    return () => document.removeEventListener("keydown", hotkey);
  });
  return (
    <Dialog
      title={`${category.title} · ${question.value} баллов`}
      wide
      onClose={onClose}
    >
      <div className="question-stage">
        <div className="question-kicker">
          <CircleHelp size={17} /> ВОПРОС ЗА <strong>{question.value}</strong>
        </div>
        <p className="question-text">{question.question}</p>
        {current.revealed && (
          <div className="answer-panel">
            <span className="answer-label">
              <Check size={17} /> ПРАВИЛЬНЫЙ ОТВЕТ
            </span>
            <h3>{question.answer}</h3>
            <p>{question.explanation}</p>
            {question.acceptedAnswers && (
              <p className="accepted-answers">
                Также принимается: {question.acceptedAnswers.join("; ")}.
              </p>
            )}
            {question.source && (
              <a
                href={question.source}
                target="_blank"
                rel="noreferrer"
                className="source-link"
              >
                Источник ↗
              </a>
            )}
          </div>
        )}
      </div>
      {!current.resolved && (
        <div className="question-controls">
          {state.settings.timerSeconds > 0 && !current.revealed && (
            <div className={`timer-row ${expired ? "expired" : ""}`}>
              <Timer size={20} />
              <strong aria-label={`Осталось ${seconds} секунд`}>
                {String(Math.floor(seconds / 60)).padStart(2, "0")}:
                {String(seconds % 60).padStart(2, "0")}
              </strong>
              <div className="timer-track" aria-hidden="true">
                <span
                  style={{
                    width: `${Math.min(100, (current.remainingMs / (state.settings.timerSeconds * 1000)) * 100)}%`,
                  }}
                />
              </div>
              <button
                className="icon-button"
                disabled={expired}
                onClick={() => {
                  unlockAudio();
                  dispatch({ type: "timer", running: !current.running });
                }}
                aria-label={
                  current.running ? "Пауза таймера" : "Запустить таймер"
                }
              >
                {current.running ? <Pause size={18} /> : <Play size={18} />}
              </button>
              <button
                className="icon-button"
                onClick={() => dispatch({ type: "resetTimer" })}
                aria-label="Сбросить таймер"
              >
                <RotateCcw size={18} />
              </button>
            </div>
          )}
          {expired && !current.revealed && (
            <p className="timeout-note" role="status">
              Время вышло. Оцените уже выбранную команду или сбросьте таймер для
              новой попытки.
            </p>
          )}
          <div className="answering-heading">
            <span>
              {current.revealed
                ? selected
                  ? "Оцените ответ выбранной команды"
                  : "Ответ открыт — новые попытки закрыты"
                : "Кто отвечает?"}
            </span>
            {!current.revealed && (
              <small>Выберите команду перед проверкой ответа</small>
            )}
          </div>
          <div className="answering-teams">
            {state.teams.map((team, index) => {
              const attempted = current.attemptedTeamIds.includes(team.id);
              return (
                <button
                  key={team.id}
                  className={`answering-team team-${index} ${current.selectedTeamId === team.id ? "selected" : ""}`}
                  aria-pressed={current.selectedTeamId === team.id}
                  disabled={current.revealed || attempted || expired}
                  onClick={() => dispatch({ type: "selectTeam", id: team.id })}
                >
                  <span className="team-dot" />
                  {team.name}
                  {attempted ? (
                    <X size={16} aria-label="Уже отвечали" />
                  ) : current.selectedTeamId === team.id ? (
                    <Check size={17} />
                  ) : null}
                </button>
              );
            })}
          </div>
          <div className="judging-actions">
            <button
              className="button correct"
              disabled={!selected}
              onClick={() => dispatch({ type: "judge", correct: true })}
            >
              <Check size={19} />
              Верно <span>+{question.value}</span>
            </button>
            <button
              className="button incorrect"
              disabled={!selected}
              onClick={() => dispatch({ type: "judge", correct: false })}
            >
              <X size={19} />
              Неверно{" "}
              <span>{state.settings.penalty ? `−${question.value}` : "0"}</span>
            </button>
            {!current.revealed && (
              <button
                className="button reveal"
                onClick={() => dispatch({ type: "reveal" })}
              >
                <Eye size={18} />
                Показать ответ
              </button>
            )}
          </div>
        </div>
      )}
      <div className="question-bottom">
        <button
          className="button text-button"
          disabled={!state.history.length}
          onClick={() => dispatch({ type: "undo" })}
        >
          <Undo2 size={17} />
          Отменить действие
        </button>
        <button className="button text-button" onClick={onClose}>
          <ArrowLeft size={17} />
          {current.resolved ? "К табло" : "Вернуться позже"}
        </button>
        {current.resolved ? (
          <span className="resolved-label">
            <Check size={18} />
            Вопрос разыгран
          </span>
        ) : (
          <button
            className="button text-button"
            onClick={() => dispatch({ type: "skip" })}
          >
            Завершить без ответа
            <SkipForward size={17} />
          </button>
        )}
      </div>
    </Dialog>
  );
}
