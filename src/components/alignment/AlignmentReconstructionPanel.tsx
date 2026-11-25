import type { TracebackController } from '../../hooks/useTracebackController';
import type {
  AlignmentOperationItem,
  AlignmentOperationType,
  SequenceAlignmentResult,
  TransitionDirection,
} from '../../types/alignment';

interface AlignmentReconstructionPanelProps {
  result: SequenceAlignmentResult;
  isMatrixComplete: boolean;
  traceback: TracebackController;
  onJumpToMatrixEnd: () => void;
}

const DIRECTION_TEXT: Record<TransitionDirection, string> = {
  diagonal: 'diagonal (↖)',
  up: 'cima (↑)',
  left: 'esquerda (←)',
};

function getOperationStyles(type: AlignmentOperationType): {
  cardClass: string;
  symbol: string;
  symbolClass: string;
  label: string;
} {
  switch (type) {
    case 'match':
      return {
        cardClass: 'border-emerald-500/50 bg-emerald-500/10',
        symbol: '|',
        symbolClass: 'text-emerald-400',
        label: 'Correspondência',
      };
    case 'mismatch':
      return {
        cardClass: 'border-amber-500/50 bg-amber-500/10',
        symbol: '≠',
        symbolClass: 'text-amber-300',
        label: 'Diferença',
      };
    case 'gap-x':
      return {
        cardClass: 'border-rose-500/50 bg-rose-500/10',
        symbol: '·',
        symbolClass: 'text-rose-400',
        label: 'Lacuna em X',
      };
    case 'gap-y':
      return {
        cardClass: 'border-rose-500/50 bg-rose-500/10',
        symbol: '·',
        symbolClass: 'text-rose-400',
        label: 'Lacuna em Y',
      };
  }
}

function AlignmentColumn({
  operation,
  isRevealed,
  isCurrent,
}: {
  operation: AlignmentOperationItem;
  isRevealed: boolean;
  isCurrent: boolean;
}) {
  if (!isRevealed) {
    return (
      <div className="flex w-12 flex-col items-center justify-between rounded-lg border border-dashed border-slate-800 bg-slate-950/40 py-2 font-mono text-xs text-slate-600">
        <span>·</span>
        <span className="my-1 text-[10px]">…</span>
        <span>·</span>
        <span className="mt-1 text-[10px]">—</span>
      </div>
    );
  }

  const styles = getOperationStyles(operation.type);

  return (
    <div
      title={`${styles.label}: ${operation.charX} ↔ ${operation.charY} (custo +${operation.cost})`}
      className={`flex w-12 flex-col items-center justify-between rounded-lg border py-2 font-mono transition-all duration-150 ${
        styles.cardClass
      } ${isCurrent ? 'ring-2 ring-fuchsia-400 shadow-md shadow-fuchsia-500/20' : ''}`}
    >
      <span
        className={`text-sm font-bold ${
          operation.type === 'gap-x' ? 'text-rose-400' : 'text-slate-100'
        }`}
      >
        {operation.charX}
      </span>

      <span className={`my-0.5 text-xs font-bold ${styles.symbolClass}`}>
        {styles.symbol}
      </span>

      <span
        className={`text-sm font-bold ${
          operation.type === 'gap-y' ? 'text-rose-400' : 'text-slate-100'
        }`}
      >
        {operation.charY}
      </span>

      <span className="mt-1 rounded bg-slate-950/70 px-1.5 py-0.5 text-[10px] text-slate-300">
        +{operation.cost}
      </span>
    </div>
  );
}

export function AlignmentReconstructionPanel({
  result,
  isMatrixComplete,
  traceback,
  onJumpToMatrixEnd,
}: AlignmentReconstructionPanelProps) {
  const { alignment } = result;
  const {
    revealedCount,
    totalTracebackSteps,
    isTracebackActive,
    isPlaying,
    isComplete,
    canStepBackward,
    canStepForward,
    currentStep,
    togglePlay,
    stepBackward,
    stepForward,
    reset,
    showAll,
  } = traceback;

  // Antes de completar a matriz, mantém o foco no preenchimento DP
  if (!isMatrixComplete) {
    return (
      <section
        aria-label="Reconstrução do alinhamento ótimo"
        className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-dashed border-slate-800 bg-slate-900/40 p-5"
      >
        <div>
          <h2 className="text-sm font-semibold text-slate-200">
            Reconstrução do Alinhamento Ótimo (Traceback)
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Complete o preenchimento da matriz até a célula{' '}
            <span className="font-mono text-slate-200">
              M[{result.rows}][{result.cols}]
            </span>{' '}
            para traçar o caminho ótimo e reconstruir o alinhamento passo a
            passo.
          </p>
        </div>

        <button
          type="button"
          onClick={onJumpToMatrixEnd}
          className="rounded-lg border border-fuchsia-500/40 bg-fuchsia-500/10 px-3.5 py-2 text-xs font-semibold text-fuchsia-200 transition-colors hover:border-fuchsia-400 hover:bg-fuchsia-500/20"
        >
          Concluir matriz e reconstruir
        </button>
      </section>
    );
  }

  // Índices de operações já reveladas (traceback constrói da direita para a esquerda)
  const firstRevealedOperationIndex =
    alignment.operations.length - revealedCount;
  const currentOperationIndex = currentStep?.operation.alignmentIndex ?? -1;

  return (
    <section
      aria-labelledby="reconstruction-panel-title"
      className="rounded-xl border border-fuchsia-500/30 bg-slate-900/70 p-6 shadow-lg shadow-slate-950/40"
    >
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2
              id="reconstruction-panel-title"
              className="text-base font-semibold text-slate-100"
            >
              Reconstrução do Alinhamento Ótimo
            </h2>
            <span className="rounded-full border border-fuchsia-400/40 bg-fuchsia-500/15 px-2.5 py-0.5 text-[11px] font-medium text-fuchsia-200">
              Traceback de ({result.rows}, {result.cols}) → (0, 0)
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Percorre a matriz preenchida em sentido inverso, destacando em{' '}
            <span className="font-medium text-fuchsia-300">fúcsia</span> o
            caminho ótimo e montando o alinhamento da direita para a esquerda.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-3 py-1.5 font-mono text-sm font-bold text-emerald-200">
            Custo total = {alignment.totalCost}
          </span>
        </div>
      </div>

      {/* Controles passo a passo da reconstrução */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={togglePlay}
            disabled={totalTracebackSteps === 0 && isComplete}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-colors ${
              isPlaying
                ? 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                : 'bg-fuchsia-500 text-slate-950 hover:bg-fuchsia-400'
            } disabled:cursor-not-allowed disabled:opacity-40`}
          >
            {isPlaying ? 'Pausar reconstrução' : isComplete ? 'Reconstruir novamente' : 'Reconstruir passo a passo'}
          </button>

          <button
            type="button"
            onClick={stepBackward}
            disabled={!canStepBackward}
            className="rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ← Passo anterior
          </button>

          <button
            type="button"
            onClick={stepForward}
            disabled={!canStepForward}
            className="rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Próximo passo →
          </button>

          <button
            type="button"
            onClick={showAll}
            disabled={isComplete}
            className="rounded-lg border border-fuchsia-500/40 bg-fuchsia-500/10 px-3 py-2 text-xs font-medium text-fuchsia-200 transition-colors hover:border-fuchsia-400 hover:bg-fuchsia-500/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Mostrar alinhamento completo
          </button>

          <button
            type="button"
            onClick={reset}
            disabled={!isTracebackActive}
            className="rounded-lg border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:border-slate-500 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Limpar trilha
          </button>
        </div>

        <span className="font-mono text-xs text-slate-300">
          Passos de reconstrução: {revealedCount}/{totalTracebackSteps}
        </span>
      </div>

      {/* Explicação do passo atual do traceback */}
      {currentStep ? (
        <div className="mt-4 rounded-lg border border-fuchsia-500/30 bg-fuchsia-500/10 px-4 py-2.5 text-xs text-fuchsia-100">
          <strong>
            Passo {currentStep.tracebackIndex + 1}/{totalTracebackSteps}:
          </strong>{' '}
          retrocede de{' '}
          <span className="font-mono">
            M[{currentStep.current.row}][{currentStep.current.col}]
          </span>{' '}
          para{' '}
          <span className="font-mono">
            M[{currentStep.previous.row}][{currentStep.previous.col}]
          </span>{' '}
          via <span className="font-semibold">{DIRECTION_TEXT[currentStep.direction]}</span>{' '}
          →{' '}
          <span className="font-mono">
            {currentStep.operation.charX} ↔ {currentStep.operation.charY}
          </span>{' '}
          (custo <span className="font-mono">+{currentStep.operation.cost}</span>).
        </div>
      ) : (
        <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/60 px-4 py-2.5 text-xs text-slate-400">
          {totalTracebackSteps === 0
            ? 'Ambas as sequências são vazias (ε): o alinhamento ótimo não contém operações e possui custo total 0.'
            : 'Clique em "Reconstruir passo a passo", "Próximo passo" ou "Mostrar alinhamento completo" para destacar o caminho ótimo na matriz.'}
        </div>
      )}

      {/* Alinhamento visual coluna a coluna */}
      <div className="mt-5">
        {alignment.operations.length > 0 ? (
          <div className="overflow-x-auto pb-2">
            <div className="inline-flex items-stretch gap-2">
              {/* Rótulos laterais das linhas do alinhamento */}
              <div className="mr-1 flex flex-col justify-between py-2 font-mono text-xs text-slate-400">
                <span className="font-semibold text-slate-200">X&apos;</span>
                <span className="text-[10px]">op</span>
                <span className="font-semibold text-slate-200">Y&apos;</span>
                <span className="text-[10px]">custo</span>
              </div>

              {alignment.operations.map((op) => {
                const isRevealed =
                  isTracebackActive &&
                  op.alignmentIndex >= firstRevealedOperationIndex;
                return (
                  <AlignmentColumn
                    key={op.alignmentIndex}
                    operation={op}
                    isRevealed={isRevealed}
                    isCurrent={op.alignmentIndex === currentOperationIndex}
                  />
                );
              })}
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-4 font-mono text-xs text-slate-300">
            X&apos; = ε • Y&apos; = ε • Custo total = 0
          </div>
        )}
      </div>

      {/* Resumo de métricas do alinhamento ótimo */}
      <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-800/80 pt-4 sm:grid-cols-4">
        <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-3">
          <p className="text-xs text-emerald-300/90">Correspondências</p>
          <p className="mt-1 font-mono text-lg font-bold text-emerald-300">
            {alignment.summary.matches}
          </p>
        </div>

        <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-3">
          <p className="text-xs text-amber-300/90">Diferenças (α)</p>
          <p className="mt-1 font-mono text-lg font-bold text-amber-300">
            {alignment.summary.mismatches}
          </p>
        </div>

        <div className="rounded-lg border border-rose-500/25 bg-rose-500/5 p-3">
          <p className="text-xs text-rose-300/90">Lacunas (δ)</p>
          <p className="mt-1 font-mono text-lg font-bold text-rose-300">
            {alignment.summary.totalGaps}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            {alignment.summary.gapsInX} em X • {alignment.summary.gapsInY} em Y
          </p>
        </div>

        <div className="rounded-lg border border-fuchsia-500/25 bg-fuchsia-500/5 p-3">
          <p className="text-xs text-fuchsia-300/90">Custo total ótimo</p>
          <p className="mt-1 font-mono text-lg font-bold text-fuchsia-200">
            {alignment.totalCost}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            Comprimento: {alignment.summary.alignmentLength}
          </p>
        </div>
      </div>

      {/* Aviso quando existem múltiplos alinhamentos ótimos */}
      {alignment.hasMultipleOptimalAlignments && (
        <div className="mt-4 rounded-lg border border-violet-500/30 bg-violet-500/10 px-4 py-2.5 text-xs text-violet-200">
          <strong>Múltiplos alinhamentos ótimos existem</strong> com custo{' '}
          <span className="font-mono">{alignment.totalCost}</span>. O alinhamento
          exibido acima é determinado pela regra de desempate{' '}
          <span className="font-mono">diagonal &gt; cima &gt; esquerda</span>.
        </div>
      )}
    </section>
  );
}
