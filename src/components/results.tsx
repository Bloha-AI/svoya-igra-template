import { ArrowRight, RotateCcw, Trophy, Undo2 } from "lucide-react";
import { rankedTeams, type GameState } from "@/lib/game-state";
import { questions } from "@/lib/content";

export function Results({
  state,
  onNewGame,
  onUndo,
}: {
  state: GameState;
  onNewGame: () => void;
  onUndo: () => void;
}) {
  const ranking = rankedTeams(state.teams);
  const winners = ranking.filter((team) => team.place === 1);
  const correct = Object.values(state.completed).filter(
    (winner) => winner !== null,
  ).length;
  return (
    <section className="results">
      <div className="result-decoration" aria-hidden="true">
        ✳
      </div>
      <div className="trophy-icon">
        <Trophy size={36} />
      </div>
      <p className="eyebrow">ВОТ ЭТО ИГРА!</p>
      <h2>
        {winners.length > 1 ? (
          "Достойная ничья"
        ) : (
          <>
            Победа за командой
            <br />
            <span>«{winners[0].name}»</span>
          </>
        )}
      </h2>
      <p className="result-summary">
        Разыграно {Object.keys(state.completed).length} из {questions.length}{" "}
        вопросов · {correct} верных ответов
      </p>
      <div className="ranking">
        {ranking.map((team) => (
          <div
            className={`ranking-row ${team.place === 1 ? "winner" : ""}`}
            key={team.id}
          >
            <span className="rank-number">
              {team.place === 1 ? (
                <Trophy size={22} />
              ) : (
                String(team.place).padStart(2, "0")
              )}
            </span>
            <span>{team.name}</span>
            <strong>
              {team.score.toLocaleString("ru-RU")}
              <small>баллов</small>
            </strong>
          </div>
        ))}
      </div>
      <div className="result-actions">
        <button className="button primary" onClick={onNewGame}>
          <RotateCcw size={18} />
          Сыграть ещё раз
          <ArrowRight size={18} />
        </button>
        {state.history.length > 0 && (
          <button className="button text-button" onClick={onUndo}>
            <Undo2 size={17} />
            Отменить последнее действие
          </button>
        )}
      </div>
    </section>
  );
}
