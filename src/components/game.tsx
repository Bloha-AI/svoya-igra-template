"use client";

import { useEffect, useState, type CSSProperties } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CircleHelp,
  Flag,
  Fingerprint,
  Globe2,
  History,
  Leaf,
  Lightbulb,
  Maximize,
  Minimize,
  Orbit,
  Pencil,
  Play,
  RotateCcw,
  Settings2,
  Sparkles,
  Undo2,
} from "lucide-react";
import { gameContent, questions } from "@/lib/content";
import { useGame } from "@/lib/use-game";
import type { Team } from "@/lib/game-state";
import { Dialog } from "./dialog";
import { SettingsDialog } from "./settings-dialog";
import { QuestionDialog } from "./question-dialog";
import { Results } from "./results";
import { useWebMCP } from "@/lib/use-webmcp";

const icons = {
  orbit: Orbit,
  leaf: Leaf,
  globe: Globe2,
  lightbulb: Lightbulb,
  fingerprint: Fingerprint,
};
type Modal =
  "start" | "settings" | "reset" | "finish" | "rules" | "history" | null;

export function Game() {
  const { state, dispatch, savedGame, ready, storageError, start, resume } =
    useGame();
  const [modal, setModal] = useState<Modal>(null);
  const [scoreTeam, setScoreTeam] = useState<Team | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [screenMessage, setScreenMessage] = useState("");
  const completed = Object.keys(state.completed).length;
  const choosingTeam = state.teams.find(
    (team) => team.id === state.choosingTeamId,
  );
  const pendingQuestion = state.current && !state.current.visible;
  useWebMCP(state, dispatch);

  useEffect(() => {
    const change = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", change);
    const undo = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      )
        return;
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "z" &&
        !event.shiftKey
      ) {
        event.preventDefault();
        dispatch({ type: "undo" });
      }
    };
    document.addEventListener("keydown", undo);
    return () => {
      document.removeEventListener("fullscreenchange", change);
      document.removeEventListener("keydown", undo);
    };
  }, [dispatch]);

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.documentElement.requestFullscreen)
        await document.documentElement.requestFullscreen();
      else
        setScreenMessage(
          "В этом браузере полный экран недоступен. Используйте увеличение окна.",
        );
    } catch {
      setScreenMessage(
        "Не удалось открыть полный экран. Попробуйте через меню браузера.",
      );
    }
  }

  return (
    <div className={`game-shell ${fullscreen ? "projector" : ""}`}>
      <a className="skip-link" href="#board">
        К игровому табло
      </a>
      <header className="topbar">
        <a href="#board" className="wordmark">
          <span className="brand-mark">
            <Sparkles size={24} />
          </span>
          своя игра<span className="wordmark-dot">.</span>
        </a>
        <div className="header-tools">
          <button
            className="button text-button"
            onClick={() => setModal("rules")}
          >
            <CircleHelp size={18} />
            <span>Как играть</span>
          </button>
          <span className="toolbar-divider" />
          <button
            className="icon-button"
            aria-label="Настройки игры"
            onClick={() => setModal("settings")}
          >
            <Settings2 size={20} />
          </button>
          <button
            className="icon-button"
            onClick={toggleFullscreen}
            aria-label={fullscreen ? "Выйти из полного экрана" : "Полный экран"}
          >
            {fullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
          </button>
        </div>
      </header>
      <main id="board" tabIndex={-1}>
        <section className="game-heading">
          <div>
            <div className="eyebrow">
              <span className="tag">{gameContent.audience}</span>
              <span>{gameContent.roundName}</span>
            </div>
            <h1>
              {gameContent.title}
              <span className="title-star" aria-hidden="true">
                ✳
              </span>
            </h1>
            <p>{gameContent.subtitle}</p>
          </div>
          {state.status === "setup" ? (
            <button
              disabled={!ready}
              className="button primary start-button"
              onClick={() => setModal(savedGame ? "reset" : "start")}
            >
              <Play size={19} fill="currentColor" />
              Начать игру
            </button>
          ) : state.status === "playing" ? (
            <div className="turn-indicator">
              <span>Выбирает вопрос</span>
              <strong>
                <span className="turn-dot" />
                {choosingTeam?.name}
              </strong>
            </div>
          ) : (
            <span className="finished-badge">
              <Flag size={18} />
              Игра завершена
            </span>
          )}
        </section>
        {savedGame && (
          <div className="resume-banner">
            <div>
              <strong>Есть сохранённая игра</strong>
              <span>
                {Object.keys(savedGame.completed).length} из {questions.length}{" "}
                вопросов · {savedGame.teams.length} команды
              </span>
            </div>
            <button className="button primary" onClick={resume}>
              {savedGame.status === "finished"
                ? "Открыть результаты"
                : "Продолжить"}
              <ArrowRight size={17} />
            </button>
          </div>
        )}
        {storageError && (
          <p className="notice">
            Сохранение в этом браузере недоступно. Не закрывайте вкладку до
            конца игры.
          </p>
        )}
        {screenMessage && (
          <p className="notice" role="status">
            {screenMessage}
          </p>
        )}
        {state.status === "finished" ? (
          <Results
            state={state}
            onNewGame={() => setModal("reset")}
            onUndo={() => dispatch({ type: "undo" })}
          />
        ) : (
          <>
            {pendingQuestion && (
              <div className="resume-banner compact">
                <span>Текущий вопрос ещё открыт</span>
                <button
                  className="button"
                  onClick={() =>
                    dispatch({ type: "open", id: state.current!.id })
                  }
                >
                  Вернуться к вопросу
                  <ArrowRight size={17} />
                </button>
              </div>
            )}
            <section className="board-panel" aria-label="Игровое табло">
              <div className="board-meta">
                <span>
                  {state.status === "setup"
                    ? "ВЫБИРАЙТЕ ТЕМУ И СТОИМОСТЬ"
                    : "КАЖДЫЙ ВОПРОС — НОВАЯ ВОЗМОЖНОСТЬ"}
                </span>
                <span>
                  {completed} / {questions.length}{" "}
                  <span className="muted">вопросов</span>
                </span>
              </div>
              <div
                className="board-scroll"
                role="region"
                aria-label="Темы и вопросы. На узком экране прокручивайте вправо."
                tabIndex={0}
              >
                <div className="board-grid">
                  {gameContent.categories.map((category, index) => {
                    const Icon =
                      icons[category.icon as keyof typeof icons] || Sparkles;
                    return (
                      <div
                        className="board-row"
                        key={category.id}
                        style={{
                          gridTemplateColumns: `minmax(190px, 1.55fr) repeat(${category.questions.length}, minmax(76px, 1fr))`,
                        }}
                      >
                        <div className="category">
                          <Icon size={23} />
                          <span>{category.title}</span>
                          <span className="category-index">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                        </div>
                        {category.questions.map((q) => {
                          const done = Object.hasOwn(state.completed, q.id);
                          const active = state.current?.id === q.id;
                          return (
                            <button
                              className={`question-cell ${done ? "played" : ""} ${active ? "active-cell" : ""}`}
                              key={q.id}
                              disabled={
                                state.status !== "playing" ||
                                done ||
                                (!!state.current && !active)
                              }
                              aria-label={`${category.title}, ${q.value} баллов${done ? ", разыгран" : active ? ", текущий вопрос" : ""}`}
                              onClick={() =>
                                dispatch({ type: "open", id: q.id })
                              }
                            >
                              {done ? <Check size={26} /> : q.value}
                              {!done && (
                                <ArrowUpRight
                                  className="cell-arrow"
                                  size={18}
                                />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="board-foot">
                <span>
                  <span className="tiny-square" />
                  {state.status === "setup"
                    ? "От простого к сложному"
                    : state.settings.penalty
                      ? "За ошибку снимается стоимость вопроса"
                      : "Играем без штрафов"}
                </span>
                <span
                  className="board-progress"
                  aria-label={`Разыграно ${completed} из ${questions.length} вопросов`}
                >
                  <span
                    style={{
                      width: `${(completed / questions.length) * 100}%`,
                    }}
                  />
                </span>
              </div>
            </section>
            <section className="teams-section" aria-label="Счёт команд">
              <div className="section-label">
                КОМАНДЫ
                <span>
                  {state.status === "setup"
                    ? "Имена можно изменить перед стартом"
                    : "Нажмите на команду, чтобы передать ей выбор"}
                </span>
              </div>
              <div
                className="teams-grid"
                style={
                  {
                    "--team-columns": Math.min(3, state.teams.length),
                  } as CSSProperties
                }
              >
                {state.teams.map((team, i) => (
                  <div
                    key={team.id}
                    className={`team-card team-${i} ${state.status === "playing" && state.choosingTeamId === team.id ? "has-turn" : ""}`}
                  >
                    <button
                      className="team-turn-button"
                      disabled={state.status !== "playing"}
                      onClick={() =>
                        dispatch({ type: "chooseTurn", id: team.id })
                      }
                      aria-label={`Передать выбор команде ${team.name}`}
                      aria-pressed={
                        state.status === "playing" &&
                        state.choosingTeamId === team.id
                      }
                    >
                      <span className="team-number">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="team-name">
                        {team.name}
                        <span>
                          {state.status === "playing" &&
                          state.choosingTeamId === team.id
                            ? "Выбирает вопрос"
                            : `Команда ${i + 1}`}
                        </span>
                      </span>
                    </button>
                    <button
                      className="team-score"
                      disabled={state.status !== "playing"}
                      onClick={() => setScoreTeam(team)}
                      aria-label={`Изменить счёт команды ${team.name}: ${team.score} баллов`}
                    >
                      <strong>{team.score.toLocaleString("ru-RU")}</strong>
                      <span>
                        баллов <Pencil size={10} />
                      </span>
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
        {state.status !== "setup" && (
          <div className="host-toolbar">
            <div>
              <button
                className="button text-button"
                disabled={!state.history.length}
                onClick={() => dispatch({ type: "undo" })}
              >
                <Undo2 size={18} />
                Отменить ход
              </button>
              <button
                className="button text-button"
                onClick={() => setModal("history")}
              >
                <History size={18} />
                <span>История</span>
              </button>
            </div>
            <div>
              {state.status === "playing" && (
                <button
                  className="button text-button"
                  onClick={() => setModal("finish")}
                >
                  <Flag size={17} />
                  Завершить
                </button>
              )}
              <button
                className="button text-button"
                onClick={() => setModal("reset")}
              >
                <RotateCcw size={17} />
                <span>Новая игра</span>
              </button>
            </div>
          </div>
        )}
        <div className="sr-only" role="status" aria-live="polite">
          {state.notice}
        </div>
      </main>
      <footer className="footer">
        <span>Игра для любопытных</span>
        <span>Ведущий управляет игрой с одного устройства</span>
      </footer>
      {(modal === "start" || modal === "settings") && (
        <SettingsDialog
          key={modal}
          state={state}
          newGame={modal === "start"}
          onClose={() => setModal(null)}
          onSubmit={(names, settings) => {
            if (modal === "start") start(names, settings);
            else dispatch({ type: "configure", names, settings });
            setModal(null);
          }}
        />
      )}
      {modal === "reset" && (
        <Dialog title="Начать новую игру?" onClose={() => setModal(null)}>
          <p className="dialog-intro">
            Счёт и разыгранные вопросы текущей партии будут сброшены после
            старта новой. Набор вопросов останется прежним.
          </p>
          <div className="dialog-actions">
            <button className="button" onClick={() => setModal(null)}>
              Продолжить текущую
            </button>
            <button
              className="button primary"
              onClick={() => setModal("start")}
            >
              <RotateCcw size={18} />
              Настроить новую
            </button>
          </div>
        </Dialog>
      )}
      {modal === "finish" && (
        <Dialog title="Подведём итоги?" onClose={() => setModal(null)}>
          <p className="dialog-intro">
            Разыграно {completed} из {questions.length} вопросов. Можно
            закончить сейчас и показать итоговый счёт. Если передумаете —
            отмените завершение.
          </p>
          <div className="dialog-actions">
            <button className="button" onClick={() => setModal(null)}>
              Ещё поиграем
            </button>
            <button
              className="button primary"
              onClick={() => {
                dispatch({ type: "finish" });
                setModal(null);
              }}
            >
              <Flag size={18} />
              Показать результаты
            </button>
          </div>
        </Dialog>
      )}
      {modal === "rules" && (
        <Dialog
          title="Сначала правила, потом рекорды"
          onClose={() => setModal(null)}
        >
          <ol className="rules-list">
            <li>
              <strong>Соберите 2–6 команд.</strong>
              <p>
                Придумайте названия. Учитель открывает игру на своём устройстве
                и показывает экран классу.
              </p>
            </li>
            <li>
              <strong>Выберите тему и цену.</strong>
              <p>
                Чем дороже вопрос, тем сложнее задание. Команда называет клетку,
                ведущий открывает её.
              </p>
            </li>
            <li>
              <strong>Ответьте вслух.</strong>
              <p>
                Ведущий выбирает отвечающую команду, при желании запускает
                таймер и отмечает «Верно» или «Неверно». После ошибки может
                ответить другая команда.
              </p>
            </li>
            <li>
              <strong>Заработайте баллы.</strong>
              <p>
                Верный ответ приносит стоимость вопроса. Штраф за ошибку можно
                отключить. Право следующего выбора получает правильно ответившая
                команда.
              </p>
            </li>
            <li>
              <strong>Узнайте ответ и идите дальше.</strong>
              <p>
                После показа ответа новые попытки закрыты. Разыгранная клетка
                гаснет. Побеждает команда с наибольшим счётом; равные результаты
                — ничья.
              </p>
            </li>
          </ol>
          <div className="rule-note">
            <strong>Ведущему на заметку</strong>
            <p>
              Счёт можно поправить, нажав на число у команды. Последнее действие
              отменяется кнопкой или Ctrl/⌘ + Z. Вопрос можно временно закрыть:
              он останется на табло. При уходе со вкладки таймер встаёт на
              паузу.
            </p>
            <p>
              Партия сохраняется только в этом браузере. Одинаковая ссылка на
              нескольких устройствах открывает независимые игры.
            </p>
          </div>
          <div className="dialog-actions">
            <button className="button primary" onClick={() => setModal(null)}>
              Всё понятно
              <Check size={18} />
            </button>
          </div>
        </Dialog>
      )}
      {modal === "history" && (
        <Dialog title="История партии" onClose={() => setModal(null)}>
          {state.history.length ? (
            <ol className="history-list">
              {state.history.toReversed().map((entry, i) => (
                <li key={`${state.history.length - i}-${entry.label}`}>
                  <span>
                    {String(state.history.length - i).padStart(2, "0")}
                  </span>
                  {entry.label}
                </li>
              ))}
            </ol>
          ) : (
            <p className="dialog-intro">
              Здесь появятся ходы и изменения счёта.
            </p>
          )}
          <p className="muted small">
            Сохраняются последние 60 действий. Отменить можно последнее.
          </p>
        </Dialog>
      )}
      {scoreTeam && (
        <ScoreDialog
          team={scoreTeam}
          onClose={() => setScoreTeam(null)}
          onSave={(score) => {
            dispatch({ type: "setScore", id: scoreTeam.id, score });
            setScoreTeam(null);
          }}
        />
      )}
      {state.current?.visible && state.status === "playing" && (
        <QuestionDialog
          state={state}
          dispatch={dispatch}
          onClose={() => dispatch({ type: "hide" })}
        />
      )}
    </div>
  );
}

function ScoreDialog({
  team,
  onClose,
  onSave,
}: {
  team: Team;
  onClose: () => void;
  onSave: (score: number) => void;
}) {
  const [score, setScore] = useState(String(team.score));
  const valid =
    score.trim() !== "" &&
    Number.isSafeInteger(Number(score)) &&
    Math.abs(Number(score)) <= 1000000;
  return (
    <Dialog title={`Счёт: ${team.name}`} onClose={onClose}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (valid) onSave(Number(score));
        }}
      >
        <p className="dialog-intro">
          Укажите новый счёт команды. Исправление появится в истории, и его
          можно будет отменить.
        </p>
        <label className="score-input-label">
          Баллы
          <input
            className="score-input"
            type="number"
            min={-1000000}
            max={1000000}
            step={1}
            required
            value={score}
            onChange={(event) => setScore(event.target.value)}
          />
        </label>
        <div className="dialog-actions">
          <button className="button" type="button" onClick={onClose}>
            Отмена
          </button>
          <button className="button primary" disabled={!valid}>
            <Check size={18} />
            Сохранить счёт
          </button>
        </div>
      </form>
    </Dialog>
  );
}
