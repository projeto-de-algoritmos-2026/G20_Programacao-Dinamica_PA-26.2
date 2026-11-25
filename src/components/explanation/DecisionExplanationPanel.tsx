import type {
  AlignmentPenalties,
  CalculationStep,
  StepOperationType,
  TransitionCandidate,
} from '../../types/alignment';

interface DecisionExplanationPanelProps {
  step: CalculationStep | null;
  penalties: AlignmentPenalties;
  totalSteps: number;
}

const PHASE_LABEL: Record<CalculationStep['phase'], string> = {
  'base-origin': 'Caso-base • Origem',
  'base-col': 'Caso-base • Primeira coluna',
  'base-row': 'Caso-base • Primeira linha',
  recurrence: 'Recorrência • Célula interna',
};

function getOperationMeta(
  operation: StepOperationType,
  charX: string | null,
  charY: string | null,
): { label: string; detail: string; badgeClass: string } {
  switch (operation) {
    case 'origin':
      return {
        label: 'Origem (ε ↔ ε)',
        detail: 'Duas subcadeias vazias têm custo zero.',
        badgeClass: 'border-sky-500/40 bg-sky-500/15 text-sky-200',
      };
    case 'match':
      return {
        label: 'Correspondência (Match)',
        detail: `Alinha ${charX} com ${charY} sem penalidade (α = 0).`,
        badgeClass: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200',
      };
    case 'mismatch':
      return {
        label: 'Diferença (Mismatch)',
        detail: `Substitui ${charX} por ${charY} pagando penalidade α.`,
        badgeClass: 'border-amber-500/40 bg-amber-500/15 text-amber-200',
      };
    case 'gap-y':
      return {
        label: 'Lacuna em Y (Gap)',
        detail: `Deixa ${charX} sem par (${charX} ↔ -) pagando δ.`,
        badgeClass: 'border-rose-500/40 bg-rose-500/15 text-rose-200',
      };
    case 'gap-x':
      return {
        label: 'Lacuna em X (Gap)',
        detail: `Deixa ${charY} sem par (- ↔ ${charY}) pagando δ.`,
        badgeClass: 'border-rose-500/40 bg-rose-500/15 text-rose-200',
      };
  }
}

function CandidateCard({
  title,
  arrow,
  formulaLeft,
  candidate,
}: {
  title: string;
  arrow: string;
  formulaLeft: string;
  candidate: TransitionCandidate;
}) {
  const isChosen = candidate.isChosen;
  const isTie = candidate.isOptimal && !candidate.isChosen;

  let cardStyle = 'border-slate-800 bg-slate-950/60 text-slate-300';
  if (isChosen) {
    if (candidate.operation === 'match') {
      cardStyle =
        'border-emerald-400/70 bg-emerald-500/10 text-emerald-100 ring-1 ring-emerald-400/30';
    } else if (candidate.operation === 'mismatch') {
      cardStyle =
        'border-amber-400/70 bg-amber-500/10 text-amber-100 ring-1 ring-amber-400/30';
    } else {
      cardStyle =
        'border-rose-400/70 bg-rose-500/10 text-rose-100 ring-1 ring-rose-400/30';
    }
  } else if (isTie) {
    cardStyle = 'border-violet-400/50 bg-violet-500/10 text-violet-100';
  }

  return (
    <div className={`rounded-lg border p-3 transition-colors ${cardStyle}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold">
          <span className="mr-1.5 font-mono">{arrow}</span>
          {title}
        </span>

        <div className="flex items-center gap-1.5">
          {isChosen && (
            <span className="rounded bg-slate-950/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
              Escolhido
            </span>
          )}
          {isTie && (
            <span className="rounded bg-violet-950/80 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-200">
              Empate ótimo
            </span>
          )}
        </div>
      </div>

      <div className="mt-2 flex items-baseline justify-between gap-2 font-mono text-xs">
        <span className="text-slate-400">
          {formulaLeft} = {candidate.previousCost} + {candidate.transitionCost}
        </span>
        <span className="text-sm font-bold">{candidate.totalCost}</span>
      </div>
    </div>
  );
}

export function DecisionExplanationPanel({
  step,
  penalties,
  totalSteps,
}: DecisionExplanationPanelProps) {
  if (!step) {
    return (
      <aside
        aria-label="Explicação das decisões"
        className="rounded-xl border border-slate-800 bg-slate-900/60 p-5"
      >
        <h2 className="text-base font-semibold text-slate-100">
          Explicação da Decisão
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Nenhuma célula selecionada no momento. Inicie o algoritmo ou clique em
          uma célula calculada da matriz para inspecionar o cálculo de{' '}
          <span className="font-mono text-slate-200">M[i][j]</span>.
        </p>
      </aside>
    );
  }

  const opMeta = getOperationMeta(step.operation, step.charX, step.charY);
  const hasTie = step.optimalDirections.length > 1;

  return (
    <aside
      aria-labelledby="decision-panel-title"
      className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg shadow-slate-950/40"
    >
      {/* Cabeçalho da célula atual */}
      <div className="border-b border-slate-800/80 pb-3.5">
        <div className="flex items-center justify-between gap-2">
          <h2
            id="decision-panel-title"
            className="text-base font-semibold text-slate-100"
          >
            Explicação da Decisão
          </h2>
          <span className="rounded-md border border-slate-700 bg-slate-950/80 px-2 py-0.5 font-mono text-[11px] text-slate-300">
            Etapa {step.stepIndex + 1}/{totalSteps}
          </span>
        </div>
        <p className="mt-1 text-xs text-sky-300">{PHASE_LABEL[step.phase]}</p>
      </div>

      {/* Índices e caracteres considerados */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-2.5 text-center">
          <p className="text-[11px] text-slate-400">Célula</p>
          <p className="mt-0.5 font-mono text-sm font-semibold text-sky-300">
            M[{step.row}][{step.col}]
          </p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-2.5 text-center">
          <p className="text-[11px] text-slate-400">
            {step.row > 0 ? `X[${step.row - 1}]` : 'X (i=0)'}
          </p>
          <p className="mt-0.5 font-mono text-sm font-semibold text-slate-100">
            {step.charX ?? 'ε'}
          </p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-2.5 text-center">
          <p className="text-[11px] text-slate-400">
            {step.col > 0 ? `Y[${step.col - 1}]` : 'Y (j=0)'}
          </p>
          <p className="mt-0.5 font-mono text-sm font-semibold text-slate-100">
            {step.charY ?? 'ε'}
          </p>
        </div>
      </div>

      {/* Três candidatos (recorrência) ou fórmula do caso-base */}
      {step.candidates ? (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-slate-300">
              Candidatos da recorrência
            </span>
            <span className="font-mono text-[11px] text-slate-400">
              α({step.charX},{step.charY}) ={' '}
              {step.charX === step.charY ? 0 : penalties.mismatchPenalty} • δ ={' '}
              {penalties.gapPenalty}
            </span>
          </div>

          <CandidateCard
            title={
              step.candidates.diagonal.operation === 'match'
                ? 'Diagonal (Correspondência)'
                : 'Diagonal (Diferença)'
            }
            arrow="↖"
            formulaLeft={`M[${step.row - 1}][${step.col - 1}] + α`}
            candidate={step.candidates.diagonal}
          />
          <CandidateCard
            title="Cima (Lacuna em Y)"
            arrow="↑"
            formulaLeft={`M[${step.row - 1}][${step.col}] + δ`}
            candidate={step.candidates.up}
          />
          <CandidateCard
            title="Esquerda (Lacuna em X)"
            arrow="←"
            formulaLeft={`M[${step.row}][${step.col - 1}] + δ`}
            candidate={step.candidates.left}
          />
        </div>
      ) : (
        <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3.5">
          <p className="text-xs font-medium text-slate-300">
            Fórmula do caso-base
          </p>
          <p className="mt-1.5 font-mono text-sm text-sky-300">
            {step.phase === 'base-origin' && 'M[0][0] = 0'}
            {step.phase === 'base-col' &&
              `M[${step.row}][0] = ${step.row} × δ = ${step.row} × ${penalties.gapPenalty} = ${step.value}`}
            {step.phase === 'base-row' &&
              `M[0][${step.col}] = ${step.col} × δ = ${step.col} × ${penalties.gapPenalty} = ${step.value}`}
          </p>
          <p className="mt-1.5 text-xs text-slate-400">
            {step.phase === 'base-origin'
              ? 'Alinhar duas sequências vazias não requer operações.'
              : step.phase === 'base-col'
                ? `Alinhar os ${step.row} primeiros caracteres de X com a sequência vazia exige ${step.row} lacuna(s) em Y.`
                : `Alinhar a sequência vazia com os ${step.col} primeiros caracteres de Y exige ${step.col} lacuna(s) em X.`}
          </p>
        </div>
      )}

      {/* Menor custo escolhido + operação */}
      <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-3.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-slate-400">
            Menor custo escolhido
          </span>
          <span className="font-mono text-base font-bold text-sky-300">
            M[{step.row}][{step.col}] = {step.value}
          </span>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <span
            className={`rounded-md border px-2 py-0.5 text-xs font-medium ${opMeta.badgeClass}`}
          >
            {opMeta.label}
          </span>
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
          {opMeta.detail}
        </p>

        {hasTie && (
          <p className="mt-2.5 rounded-md border border-violet-500/30 bg-violet-500/10 px-2.5 py-1.5 text-[11px] leading-relaxed text-violet-200">
            <strong>Empate ótimo detectado:</strong> mais de um candidato atingiu
            o custo mínimo ({step.value}). Pela regra determinística (
            <span className="font-mono">diagonal &gt; cima &gt; esquerda</span>),
            a transição selecionada foi{' '}
            <span className="font-mono">
              {step.chosenDirection === 'diagonal'
                ? 'diagonal'
                : step.chosenDirection === 'up'
                  ? 'cima'
                  : 'esquerda'}
            </span>
            .
          </p>
        )}
      </div>
    </aside>
  );
}
