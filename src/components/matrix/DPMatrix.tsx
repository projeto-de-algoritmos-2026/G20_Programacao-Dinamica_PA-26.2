import { useMemo } from 'react';
import type {
  CalculationStep,
  GridCoordinate,
  SequenceAlignmentResult,
  StepOperationType,
  TracebackStep,
  TransitionDirection,
} from '../../types/alignment';

interface DPMatrixProps {
  result: SequenceAlignmentResult;
  /** Quantidade de etapas já preenchidas (0..result.steps.length). */
  filledStepCount: number;
  /** Etapa atualmente em foco/processamento. */
  activeStep: CalculationStep | null;
  /** Permite clicar em células já calculadas para inspecionar a decisão. */
  onSelectCell?: (coord: GridCoordinate) => void;
  /** Passos revelados da reconstrução ótima (Fase 7). */
  tracebackSteps?: readonly TracebackStep[];
  /** Célula atual do ponteiro de retrocesso na reconstrução. */
  tracebackCurrentCoord?: GridCoordinate | null;
  /** Indica se a visualização do caminho ótimo está ativa. */
  isTracebackActive?: boolean;
}

const DIRECTION_ARROW: Record<TransitionDirection, string> = {
  diagonal: '↖',
  up: '↑',
  left: '←',
};

function getOperationStrokeColor(operation: StepOperationType): string {
  switch (operation) {
    case 'match':
      return '#34d399'; // emerald-400
    case 'mismatch':
      return '#fbbf24'; // amber-400
    case 'gap-x':
    case 'gap-y':
      return '#fb7185'; // rose-400
    default:
      return '#38bdf8'; // sky-400
  }
}

function getOperationBadgeClass(operation: StepOperationType): string {
  switch (operation) {
    case 'match':
      return 'text-emerald-400';
    case 'mismatch':
      return 'text-amber-300';
    case 'gap-x':
    case 'gap-y':
      return 'text-rose-400';
    default:
      return 'text-sky-300';
  }
}

function getCellSize(totalCols: number): number {
  if (totalCols <= 8) return 60;
  if (totalCols <= 12) return 52;
  return 44;
}

interface ArrowSegment {
  id: string;
  from: GridCoordinate;
  to: GridCoordinate;
  isChosen: boolean;
  isOptimal: boolean;
  color: string;
}

export function DPMatrix({
  result,
  filledStepCount,
  activeStep,
  onSelectCell,
  tracebackSteps = [],
  tracebackCurrentCoord = null,
  isTracebackActive = false,
}: DPMatrixProps) {
  const totalRows = result.rows + 1;
  const totalCols = result.cols + 1;
  const cellSize = getCellSize(totalCols);
  const gap = 6;

  // Mapeia coordenadas já preenchidas -> CalculationStep correspondente
  const filledMap = useMemo(() => {
    const map = new Map<string, CalculationStep>();
    const limit = Math.min(filledStepCount, result.steps.length);
    for (let idx = 0; idx < limit; idx += 1) {
      const step = result.steps[idx];
      map.set(`${step.row},${step.col}`, step);
    }
    return map;
  }, [result.steps, filledStepCount]);

  // Conjunto de células que fazem parte do caminho ótimo já revelado no traceback
  const tracebackCellKeys = useMemo(() => {
    const set = new Set<string>();
    if (!isTracebackActive) return set;

    // Inclui sempre o ponto inicial (m, n) quando a reconstrução está ativa
    set.add(`${result.rows},${result.cols}`);
    for (const step of tracebackSteps) {
      set.add(`${step.current.row},${step.current.col}`);
      set.add(`${step.previous.row},${step.previous.col}`);
    }
    return set;
  }, [isTracebackActive, tracebackSteps, result.rows, result.cols]);

  // Identifica predecessores da célula ativa (ocultos enquanto o traceback está em foco)
  const predecessorInfo = useMemo(() => {
    const map = new Map<
      string,
      { direction: TransitionDirection; isChosen: boolean; isOptimal: boolean }
    >();

    if (!activeStep || isTracebackActive) return map;

    if (activeStep.candidates) {
      const list = [
        activeStep.candidates.diagonal,
        activeStep.candidates.up,
        activeStep.candidates.left,
      ];
      for (const candidate of list) {
        map.set(`${candidate.from.row},${candidate.from.col}`, {
          direction: candidate.direction,
          isChosen: candidate.isChosen,
          isOptimal: candidate.isOptimal,
        });
      }
    } else if (activeStep.phase === 'base-col' && activeStep.row > 0) {
      map.set(`${activeStep.row - 1},0`, {
        direction: 'up',
        isChosen: true,
        isOptimal: true,
      });
    } else if (activeStep.phase === 'base-row' && activeStep.col > 0) {
      map.set(`0,${activeStep.col - 1}`, {
        direction: 'left',
        isChosen: true,
        isOptimal: true,
      });
    }

    return map;
  }, [activeStep, isTracebackActive]);

  // Segmentos SVG das setas da recorrência durante o preenchimento
  const arrowSegments = useMemo<ArrowSegment[]>(() => {
    if (!activeStep || isTracebackActive) return [];

    const to: GridCoordinate = { row: activeStep.row, col: activeStep.col };

    if (activeStep.candidates) {
      return [
        activeStep.candidates.diagonal,
        activeStep.candidates.up,
        activeStep.candidates.left,
      ].map((candidate) => ({
        id: `${candidate.direction}-${to.row}-${to.col}`,
        from: candidate.from,
        to,
        isChosen: candidate.isChosen,
        isOptimal: candidate.isOptimal,
        color: candidate.isChosen
          ? getOperationStrokeColor(candidate.operation)
          : candidate.isOptimal
            ? '#a78bfa'
            : '#64748b',
      }));
    }

    if (activeStep.phase === 'base-col' && activeStep.row > 0) {
      return [
        {
          id: `base-col-${to.row}`,
          from: { row: activeStep.row - 1, col: 0 },
          to,
          isChosen: true,
          isOptimal: true,
          color: '#fb7185',
        },
      ];
    }

    if (activeStep.phase === 'base-row' && activeStep.col > 0) {
      return [
        {
          id: `base-row-${to.col}`,
          from: { row: 0, col: activeStep.col - 1 },
          to,
          isChosen: true,
          isOptimal: true,
          color: '#fb7185',
        },
      ];
    }

    return [];
  }, [activeStep, isTracebackActive]);

  const gridWidth = totalCols * cellSize + (totalCols - 1) * gap;
  const gridHeight = totalRows * cellSize + (totalRows - 1) * gap;

  const cellCenter = (coord: GridCoordinate) => ({
    x: coord.col * (cellSize + gap) + cellSize / 2,
    y: coord.row * (cellSize + gap) + cellSize / 2,
  });

  const highlightedHeaderRow = isTracebackActive
    ? tracebackCurrentCoord?.row ?? null
    : activeStep?.row ?? null;
  const highlightedHeaderCol = isTracebackActive
    ? tracebackCurrentCoord?.col ?? null
    : activeStep?.col ?? null;

  return (
    <section
      aria-labelledby="dp-matrix-title"
      className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 shadow-lg shadow-slate-950/40"
    >
      {/* Cabeçalho e legenda */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2
              id="dp-matrix-title"
              className="text-base font-semibold text-slate-100"
            >
              Matriz de Programação Dinâmica{' '}
              <span className="font-mono text-sky-300">M[i][j]</span>
            </h2>
            {isTracebackActive && (
              <span className="rounded-full border border-fuchsia-400/40 bg-fuchsia-500/15 px-2.5 py-0.5 text-[11px] font-medium text-fuchsia-200">
                Modo reconstrução
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Dimensão{' '}
            <span className="font-mono text-slate-200">
              ({result.rows + 1}) × ({result.cols + 1})
            </span>{' '}
            • Clique em qualquer célula calculada para inspecionar os três
            candidatos da recorrência.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-300">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded border border-sky-400 bg-sky-500/30" />
            Célula ativa (DP)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded border border-fuchsia-400 bg-fuchsia-500/30" />
            Caminho ótimo (reconstrução)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded border border-emerald-400 bg-emerald-500/20" />
            Correspondência
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded border border-amber-400 bg-amber-500/20" />
            Diferença (α)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded border border-rose-400 bg-rose-500/20" />
            Lacuna (δ)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded border border-slate-600 bg-slate-800/90" />
            Caso-base
          </span>
        </div>
      </div>

      {/* Área rolável da matriz */}
      <div className="mt-5 overflow-x-auto pb-2">
        <div className="inline-block min-w-fit">
          {/* Rótulo do eixo Y (colunas) */}
          <div className="mb-1 flex items-center pl-[66px]">
            <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
              Sequência Y (j = 0..{result.cols})
            </span>
          </div>

          <div className="flex items-start">
            {/* Cabeçalhos das linhas (eixo X) */}
            <div className="mr-2 flex flex-col">
              {/* Canto superior esquerdo */}
              <div
                style={{ width: 58, height: 42 }}
                className="mb-1.5 flex items-center justify-center rounded-md border border-slate-800/80 bg-slate-950/60 font-mono text-[11px] text-slate-400"
              >
                X \ Y
              </div>

              {/* Linhas i = 0..m */}
              <div className="flex flex-col" style={{ gap }}>
                {Array.from({ length: totalRows }, (_, i) => {
                  const isActiveRow = highlightedHeaderRow === i;
                  const charLabel = i === 0 ? 'ε' : result.sequenceX[i - 1];
                  return (
                    <div
                      key={`row-header-${i}`}
                      style={{ width: 58, height: cellSize }}
                      className={`flex flex-col items-center justify-center rounded-md border font-mono transition-colors ${
                        isActiveRow
                          ? isTracebackActive
                            ? 'border-fuchsia-400/70 bg-fuchsia-500/15 text-fuchsia-200'
                            : 'border-sky-400/70 bg-sky-500/15 text-sky-200'
                          : i === 0
                            ? 'border-slate-800 bg-slate-950/70 text-slate-400'
                            : 'border-slate-800/80 bg-slate-900/80 text-slate-200'
                      }`}
                    >
                      <span className="text-sm font-semibold leading-none">
                        {charLabel}
                      </span>
                      <span className="mt-1 text-[10px] text-slate-500">
                        i={i}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Colunas + Grade de células com overlay SVG */}
            <div>
              {/* Cabeçalhos das colunas j = 0..n */}
              <div className="mb-1.5 flex" style={{ gap }}>
                {Array.from({ length: totalCols }, (_, j) => {
                  const isActiveCol = highlightedHeaderCol === j;
                  const charLabel = j === 0 ? 'ε' : result.sequenceY[j - 1];
                  return (
                    <div
                      key={`col-header-${j}`}
                      style={{ width: cellSize, height: 42 }}
                      className={`flex flex-col items-center justify-center rounded-md border font-mono transition-colors ${
                        isActiveCol
                          ? isTracebackActive
                            ? 'border-fuchsia-400/70 bg-fuchsia-500/15 text-fuchsia-200'
                            : 'border-sky-400/70 bg-sky-500/15 text-sky-200'
                          : j === 0
                            ? 'border-slate-800 bg-slate-950/70 text-slate-400'
                            : 'border-slate-800/80 bg-slate-900/80 text-slate-200'
                      }`}
                    >
                      <span className="text-sm font-semibold leading-none">
                        {charLabel}
                      </span>
                      <span className="mt-0.5 text-[10px] text-slate-500">
                        j={j}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Grade de células (m+1) × (n+1) + Setas SVG */}
              <div
                className="relative"
                style={{ width: gridWidth, height: gridHeight }}
              >
                <div
                  className="grid"
                  style={{
                    gridTemplateColumns: `repeat(${totalCols}, ${cellSize}px)`,
                    gridTemplateRows: `repeat(${totalRows}, ${cellSize}px)`,
                    gap,
                  }}
                >
                  {Array.from({ length: totalRows }, (_, i) =>
                    Array.from({ length: totalCols }, (_, j) => {
                      const key = `${i},${j}`;
                      const step = filledMap.get(key);
                      const isFilled = step !== undefined;
                      const isBaseCase = i === 0 || j === 0;
                      const isActive =
                        !isTracebackActive &&
                        activeStep !== null &&
                        activeStep.row === i &&
                        activeStep.col === j;
                      const isTracebackCurrent =
                        isTracebackActive &&
                        tracebackCurrentCoord !== null &&
                        tracebackCurrentCoord.row === i &&
                        tracebackCurrentCoord.col === j;
                      const isOnTracebackPath = tracebackCellKeys.has(key);
                      const predecessor = predecessorInfo.get(key);

                      let cellStyle =
                        'border-slate-800/80 bg-slate-950/50 text-slate-600';

                      if (isTracebackCurrent) {
                        cellStyle =
                          'border-fuchsia-300 bg-fuchsia-500/30 text-fuchsia-50 ring-2 ring-fuchsia-400 shadow-md shadow-fuchsia-500/25 z-10';
                      } else if (isOnTracebackPath) {
                        cellStyle =
                          'border-fuchsia-400/80 bg-fuchsia-500/15 text-fuchsia-100 ring-1 ring-fuchsia-400/35';
                      } else if (isActive) {
                        cellStyle =
                          'border-sky-400 bg-sky-500/20 text-sky-100 ring-2 ring-sky-400/50 shadow-md shadow-sky-500/20 z-10';
                      } else if (predecessor) {
                        if (predecessor.isChosen) {
                          const op = activeStep?.operation ?? 'origin';
                          if (op === 'match') {
                            cellStyle =
                              'border-emerald-400 bg-emerald-500/15 text-emerald-100 ring-1 ring-emerald-400/40';
                          } else if (op === 'mismatch') {
                            cellStyle =
                              'border-amber-400 bg-amber-500/15 text-amber-100 ring-1 ring-amber-400/40';
                          } else {
                            cellStyle =
                              'border-rose-400 bg-rose-500/15 text-rose-100 ring-1 ring-rose-400/40';
                          }
                        } else if (predecessor.isOptimal) {
                          cellStyle =
                            'border-violet-400/80 bg-violet-500/15 text-violet-100';
                        } else {
                          cellStyle =
                            'border-slate-500 bg-slate-800/80 text-slate-200 border-dashed';
                        }
                      } else if (isFilled) {
                        cellStyle = isTracebackActive
                          ? isBaseCase
                            ? 'border-slate-800 bg-slate-900/50 text-slate-500 hover:border-slate-600 hover:text-slate-300'
                            : 'border-slate-800/70 bg-slate-950/60 text-slate-500 hover:border-slate-600 hover:text-slate-300'
                          : isBaseCase
                            ? 'border-slate-700/90 bg-slate-800/70 text-slate-200 hover:border-slate-500'
                            : 'border-slate-800 bg-slate-900/90 text-slate-100 hover:border-slate-600';
                      }

                      const arrowSymbol =
                        step && step.chosenDirection !== 'origin'
                          ? DIRECTION_ARROW[step.chosenDirection]
                          : null;

                      return (
                        <button
                          key={key}
                          type="button"
                          disabled={!isFilled || !onSelectCell}
                          onClick={() =>
                            isFilled && onSelectCell?.({ row: i, col: j })
                          }
                          aria-label={`Célula M[${i}][${j}]${
                            isFilled ? `, valor ${step.value}` : ', não calculada'
                          }${isOnTracebackPath ? ', no caminho ótimo' : ''}`}
                          className={`relative flex flex-col items-center justify-center rounded-lg border font-mono transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 disabled:cursor-default ${cellStyle}`}
                        >
                          {/* Símbolo discreto da direção ótima da célula */}
                          {isFilled && arrowSymbol && (
                            <span
                              aria-hidden="true"
                              className={`absolute left-1 top-0.5 text-[10px] leading-none ${
                                isOnTracebackPath
                                  ? 'text-fuchsia-200'
                                  : isActive
                                    ? 'text-sky-200'
                                    : getOperationBadgeClass(step.operation)
                              }`}
                            >
                              {arrowSymbol}
                            </span>
                          )}

                          {/* Rótulo do papel da célula predecessora da recorrência */}
                          {predecessor && (
                            <span
                              aria-hidden="true"
                              className="absolute right-1 top-0.5 text-[9px] font-sans font-medium uppercase tracking-tight opacity-85"
                            >
                              {predecessor.direction === 'diagonal'
                                ? 'diag'
                                : predecessor.direction === 'up'
                                  ? 'cima'
                                  : 'esq'}
                            </span>
                          )}

                          {/* Valor numérico M[i][j] */}
                          <span
                            className={`font-semibold leading-none ${
                              cellSize <= 44 ? 'text-xs' : 'text-sm'
                            }`}
                          >
                            {isFilled ? step.value : '·'}
                          </span>
                        </button>
                      );
                    }),
                  )}
                </div>

                {/* Camada SVG com setas da recorrência durante o preenchimento */}
                {arrowSegments.length > 0 && (
                  <svg
                    aria-hidden="true"
                    width={gridWidth}
                    height={gridHeight}
                    viewBox={`0 0 ${gridWidth} ${gridHeight}`}
                    className="pointer-events-none absolute inset-0 z-20 overflow-visible"
                  >
                    <defs>
                      {arrowSegments.map((seg) => (
                        <marker
                          key={`marker-${seg.id}`}
                          id={`arrow-${seg.id}`}
                          markerWidth="7"
                          markerHeight="7"
                          refX="6"
                          refY="3.5"
                          orient="auto"
                        >
                          <path
                            d="M 0 0.5 L 6.5 3.5 L 0 6.5 z"
                            fill={seg.color}
                            fillOpacity={seg.isChosen ? 0.95 : 0.65}
                          />
                        </marker>
                      ))}
                    </defs>

                    {arrowSegments.map((seg) => {
                      const p1 = cellCenter(seg.from);
                      const p2 = cellCenter(seg.to);
                      const dx = p2.x - p1.x;
                      const dy = p2.y - p1.y;
                      const dist = Math.hypot(dx, dy) || 1;
                      const ux = dx / dist;
                      const uy = dy / dist;

                      const startOffset = cellSize * 0.34;
                      const endOffset = cellSize * 0.38;

                      const x1 = p1.x + ux * startOffset;
                      const y1 = p1.y + uy * startOffset;
                      const x2 = p2.x - ux * endOffset;
                      const y2 = p2.y - uy * endOffset;

                      return (
                        <line
                          key={seg.id}
                          x1={x1}
                          y1={y1}
                          x2={x2}
                          y2={y2}
                          stroke={seg.color}
                          strokeWidth={seg.isChosen ? 2.6 : 1.6}
                          strokeDasharray={seg.isChosen ? undefined : '4 3'}
                          strokeOpacity={seg.isChosen ? 0.95 : 0.65}
                          strokeLinecap="round"
                          markerEnd={`url(#arrow-${seg.id})`}
                        />
                      );
                    })}
                  </svg>
                )}

                {/* Camada SVG dedicada ao caminho ótimo de reconstrução (traceback) */}
                {isTracebackActive && tracebackSteps.length > 0 && (
                  <svg
                    aria-hidden="true"
                    width={gridWidth}
                    height={gridHeight}
                    viewBox={`0 0 ${gridWidth} ${gridHeight}`}
                    className="pointer-events-none absolute inset-0 z-30 overflow-visible"
                  >
                    <defs>
                      <marker
                        id="traceback-arrow-head"
                        markerWidth="7"
                        markerHeight="7"
                        refX="6"
                        refY="3.5"
                        orient="auto"
                      >
                        <path
                          d="M 0 0.5 L 6.5 3.5 L 0 6.5 z"
                          fill="#e879f9"
                        />
                      </marker>
                    </defs>

                    {tracebackSteps.map((tbStep, idx) => {
                      const p1 = cellCenter(tbStep.current);
                      const p2 = cellCenter(tbStep.previous);
                      const dx = p2.x - p1.x;
                      const dy = p2.y - p1.y;
                      const dist = Math.hypot(dx, dy) || 1;
                      const ux = dx / dist;
                      const uy = dy / dist;

                      const startOffset = cellSize * 0.34;
                      const endOffset = cellSize * 0.38;

                      const x1 = p1.x + ux * startOffset;
                      const y1 = p1.y + uy * startOffset;
                      const x2 = p2.x - ux * endOffset;
                      const y2 = p2.y - uy * endOffset;
                      const isLatest = idx === tracebackSteps.length - 1;

                      return (
                        <line
                          key={`tb-${tbStep.tracebackIndex}`}
                          x1={x1}
                          y1={y1}
                          x2={x2}
                          y2={y2}
                          stroke={isLatest ? '#f0abfc' : '#e879f9'}
                          strokeWidth={isLatest ? 3.2 : 2.6}
                          strokeOpacity={0.95}
                          strokeLinecap="round"
                          markerEnd="url(#traceback-arrow-head)"
                        />
                      );
                    })}
                  </svg>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
