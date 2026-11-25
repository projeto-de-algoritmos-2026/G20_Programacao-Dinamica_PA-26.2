import {
  SPEED_OPTIONS,
  type PlaybackController,
  type PlaybackStatus,
} from '../../hooks/usePlaybackController';

interface PlaybackControlsProps {
  controller: PlaybackController;
  minCost: number;
  rows: number;
  cols: number;
}

const STATUS_BADGE: Record<
  PlaybackStatus,
  { label: string; className: string }
> = {
  idle: {
    label: 'Pronto para iniciar',
    className: 'border-slate-700 bg-slate-800/80 text-slate-300',
  },
  playing: {
    label: 'Executando automaticamente',
    className: 'border-sky-500/40 bg-sky-500/15 text-sky-300',
  },
  paused: {
    label: 'Pausado (passo a passo)',
    className: 'border-amber-500/40 bg-amber-500/15 text-amber-200',
  },
  completed: {
    label: 'Matriz DP concluída',
    className: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
  },
};

export function PlaybackControls({
  controller,
  minCost,
  rows,
  cols,
}: PlaybackControlsProps) {
  const {
    filledStepCount,
    totalSteps,
    isPlaying,
    status,
    isMatrixComplete,
    canStepBackward,
    canStepForward,
    speedIndex,
    togglePlay,
    stepBackward,
    stepForward,
    reset,
    jumpToEnd,
    seekToFilledCount,
    setSpeedIndex,
  } = controller;

  const badge = STATUS_BADGE[status];
  const progressPercent =
    totalSteps > 0 ? Math.round((filledStepCount / totalSteps) * 100) : 0;

  return (
    <section
      aria-label="Controles de execução passo a passo"
      className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg shadow-slate-950/40"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Grupo de botões de transporte */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Executar / Pausar */}
          <button
            type="button"
            onClick={togglePlay}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              isPlaying
                ? 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                : 'bg-sky-500 text-slate-950 hover:bg-sky-400'
            }`}
          >
            {isPlaying ? (
              <>
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <rect x="6" y="5" width="4" height="14" rx="1" />
                  <rect x="14" y="5" width="4" height="14" rx="1" />
                </svg>
                Pausar
              </>
            ) : (
              <>
                <svg
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <path d="M8 5.14v13.72a1 1 0 0 0 1.53.85l10.6-6.86a1 1 0 0 0 0-1.7L9.53 4.29A1 1 0 0 0 8 5.14Z" />
                </svg>
                {filledStepCount === 0
                  ? 'Iniciar execução'
                  : isMatrixComplete
                    ? 'Executar novamente'
                    : 'Executar automaticamente'}
              </>
            )}
          </button>

          {/* Voltar uma etapa */}
          <button
            type="button"
            onClick={stepBackward}
            disabled={!canStepBackward}
            title="Voltar uma etapa (←)"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-3.5 w-3.5"
              aria-hidden="true"
            >
              <path
                d="M15 18l-6-6 6-6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Voltar
          </button>

          {/* Avançar uma etapa */}
          <button
            type="button"
            onClick={stepForward}
            disabled={!canStepForward}
            title="Avançar uma etapa (→)"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Avançar
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-3.5 w-3.5"
              aria-hidden="true"
            >
              <path
                d="M9 18l6-6-6-6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {/* Reiniciar */}
          <button
            type="button"
            onClick={reset}
            disabled={filledStepCount === 0 && !isPlaying}
            title="Reiniciar matriz (Home)"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:border-slate-500 hover:bg-slate-800 hover:text-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-3.5 w-3.5"
              aria-hidden="true"
            >
              <path
                d="M3 12a9 9 0 1 0 3-6.7L3 8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path d="M3 3v5h5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Reiniciar
          </button>

          {/* Preencher tudo */}
          <button
            type="button"
            onClick={jumpToEnd}
            disabled={isMatrixComplete}
            title="Ir para o final do preenchimento"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:border-slate-500 hover:bg-slate-800 hover:text-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Ir ao fim
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="h-3.5 w-3.5"
              aria-hidden="true"
            >
              <path
                d="M5 6l6 6-6 6M13 6l6 6-6 6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        {/* Controle de velocidade */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-400">Velocidade:</span>
          <div
            role="group"
            aria-label="Selecionar velocidade de execução"
            className="inline-flex rounded-lg border border-slate-800 bg-slate-950/80 p-0.5"
          >
            {SPEED_OPTIONS.map((option, idx) => {
              const isSelected = idx === speedIndex;
              return (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => setSpeedIndex(idx)}
                  className={`rounded-md px-2.5 py-1 font-mono text-xs transition-colors ${
                    isSelected
                      ? 'bg-sky-500/20 font-semibold text-sky-300'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Barra de progresso determinística + status */}
      <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-slate-800/80 pt-3.5">
        <div className="flex flex-1 items-center gap-3 min-w-[220px]">
          <input
            type="range"
            min={0}
            max={totalSteps}
            value={filledStepCount}
            onChange={(e) => seekToFilledCount(Number(e.target.value))}
            aria-label="Posição da etapa de cálculo"
            className="h-1.5 flex-1 cursor-pointer appearance-none rounded-lg bg-slate-800 accent-sky-400"
          />
          <span className="font-mono text-xs text-slate-300 whitespace-nowrap">
            {filledStepCount}/{totalSteps}{' '}
            <span className="text-slate-500">({progressPercent}%)</span>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${badge.className}`}
          >
            {badge.label}
          </span>

          {isMatrixComplete && (
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 font-mono text-xs font-semibold text-emerald-300">
              M[{rows}][{cols}] = {minCost}
            </span>
          )}
        </div>
      </div>

      <p className="mt-2 text-[11px] text-slate-500">
        Atalhos: <span className="font-mono text-slate-400">Espaço</span>{' '}
        (executar/pausar) •{' '}
        <span className="font-mono text-slate-400">← / →</span> (voltar/avançar)
        • <span className="font-mono text-slate-400">Home</span> (reiniciar)
      </p>
    </section>
  );
}
