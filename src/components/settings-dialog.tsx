"use client";

import { useState } from "react";
import { Minus, Plus, Play, Save } from "lucide-react";
import { Dialog } from "./dialog";
import type { GameState, Settings } from "@/lib/game-state";

export function SettingsDialog({
  state,
  newGame,
  onClose,
  onSubmit,
}: {
  state: GameState;
  newGame: boolean;
  onClose: () => void;
  onSubmit: (names: string[], settings: Settings) => void;
}) {
  const [names, setNames] = useState(state.teams.map((team) => team.name));
  const [settings, setSettings] = useState(state.settings);
  const canChangeCount = newGame || state.status === "setup";
  return (
    <Dialog
      title={newGame ? "Собираем команды" : "Настройки игры"}
      onClose={onClose}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(names, settings);
        }}
      >
        <p className="dialog-intro">
          Ведущий читает вопросы и отмечает ответы. Команды отвечают вслух.
        </p>
        <div className="setting-heading">
          <label>
            Команды <span className="muted">{names.length} из 6</span>
          </label>
          {canChangeCount && (
            <div className="stepper">
              <button
                type="button"
                className="icon-button"
                disabled={names.length <= 2}
                aria-label="Убрать команду"
                onClick={() => setNames(names.slice(0, -1))}
              >
                <Minus size={17} />
              </button>
              <button
                type="button"
                className="icon-button"
                disabled={names.length >= 6}
                aria-label="Добавить команду"
                onClick={() =>
                  setNames([...names, `Команда ${names.length + 1}`])
                }
              >
                <Plus size={17} />
              </button>
            </div>
          )}
        </div>
        <div className="team-inputs">
          {names.map((name, index) => (
            <label key={index} className={`team-input team-${index}`}>
              <span className="team-number">0{index + 1}</span>
              <input
                required
                maxLength={32}
                aria-label={`Название команды ${index + 1}`}
                value={name}
                onChange={(event) =>
                  setNames(
                    names.map((item, i) =>
                      i === index ? event.target.value : item,
                    ),
                  )
                }
              />
            </label>
          ))}
        </div>
        <label className="setting-row">
          <span>
            <strong>Штраф за неверный ответ</strong>
            <small>
              Снимать стоимость вопроса. Счёт может быть отрицательным.
            </small>
          </span>
          <input
            type="checkbox"
            checked={settings.penalty}
            onChange={(event) =>
              setSettings({ ...settings, penalty: event.target.checked })
            }
          />
        </label>
        <label className="setting-row">
          <span>
            <strong>Время на вопрос</strong>
            <small>Таймер запускает ведущий.</small>
          </span>
          <select
            aria-label="Время на вопрос"
            value={settings.timerSeconds}
            onChange={(event) =>
              setSettings({
                ...settings,
                timerSeconds: Number(event.target.value),
              })
            }
          >
            {[
              0,
              15,
              20,
              30,
              45,
              60,
              90,
              120,
              ...(![0, 15, 20, 30, 45, 60, 90, 120].includes(
                settings.timerSeconds,
              )
                ? [settings.timerSeconds]
                : []),
            ].map((time) => (
              <option key={time} value={time}>
                {time === 0 ? "Без таймера" : `${time} секунд`}
              </option>
            ))}
          </select>
        </label>
        <label className="setting-row">
          <span>
            <strong>Звуковой сигнал</strong>
            <small>Тихий сигнал, когда время закончилось.</small>
          </span>
          <input
            type="checkbox"
            checked={settings.sound}
            onChange={(event) =>
              setSettings({ ...settings, sound: event.target.checked })
            }
          />
        </label>
        <div className="dialog-actions">
          <button type="button" className="button" onClick={onClose}>
            Отмена
          </button>
          <button
            className="button primary"
            disabled={names.some((name) => !name.trim())}
          >
            {newGame ? <Play size={18} /> : <Save size={18} />}
            {newGame ? "Начать игру" : "Сохранить"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
