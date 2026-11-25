import {
  DEFAULT_PENALTIES,
  type AlignmentPenalties,
  type CalculationStep,
  type RecurrenceCandidates,
  type SequenceAlignmentInput,
  type SequenceAlignmentResult,
  type TransitionCandidate,
  type TransitionDirection,
} from '../types/alignment';
import {
  costsEqual,
  getMismatchCost,
  normalizeCost,
  reconstructAlignment,
} from './reconstructAlignment';

/** Valida e normaliza as penalidades informadas (devem ser finitas e não negativas). */
export function resolvePenalties(
  penalties?: Partial<AlignmentPenalties>,
): AlignmentPenalties {
  const mismatchPenalty =
    penalties?.mismatchPenalty ?? DEFAULT_PENALTIES.mismatchPenalty;
  const gapPenalty = penalties?.gapPenalty ?? DEFAULT_PENALTIES.gapPenalty;

  if (!Number.isFinite(mismatchPenalty) || mismatchPenalty < 0) {
    throw new RangeError(
      'A penalidade de diferença (α) deve ser um número finito e não negativo.',
    );
  }

  if (!Number.isFinite(gapPenalty) || gapPenalty < 0) {
    throw new RangeError(
      'A penalidade de lacuna (δ) deve ser um número finito e não negativo.',
    );
  }

  return {
    mismatchPenalty: normalizeCost(mismatchPenalty),
    gapPenalty: normalizeCost(gapPenalty),
  };
}

/**
 * Executa o algoritmo Sequence Alignment com Programação Dinâmica bottom-up.
 *
 * Casos-base:
 *   M[i][0] = i × δ  (0 ≤ i ≤ m)
 *   M[0][j] = j × δ  (0 ≤ j ≤ n)
 *
 * Recorrência (i > 0, j > 0):
 *   M[i][j] = min(
 *     M[i-1][j-1] + α(X[i-1], Y[j-1]),
 *     M[i-1][j]   + δ,
 *     M[i][j-1]   + δ
 *   )
 *
 * Regra determinística de desempate: diagonal > up > left.
 * Complexidade: Tempo O(m × n), Espaço O(m × n).
 */
export function computeSequenceAlignment(
  input: SequenceAlignmentInput,
): SequenceAlignmentResult {
  const { sequenceX, sequenceY } = input;
  const penalties = resolvePenalties(input.penalties);

  const m = sequenceX.length;
  const n = sequenceY.length;

  const matrix: number[][] = Array.from({ length: m + 1 }, () =>
    new Array<number>(n + 1).fill(0),
  );
  const steps: CalculationStep[] = [];

  // Caso-base da primeira coluna: M[i][0] = i × δ (inclui a origem M[0][0] = 0)
  for (let i = 0; i <= m; i += 1) {
    const value = normalizeCost(i * penalties.gapPenalty);
    matrix[i][0] = value;

    if (i === 0) {
      steps.push({
        stepIndex: steps.length,
        phase: 'base-origin',
        row: 0,
        col: 0,
        charX: null,
        charY: null,
        value,
        chosenDirection: 'origin',
        optimalDirections: [],
        operation: 'origin',
        candidates: null,
      });
    } else {
      steps.push({
        stepIndex: steps.length,
        phase: 'base-col',
        row: i,
        col: 0,
        charX: sequenceX[i - 1],
        charY: null,
        value,
        chosenDirection: 'up',
        optimalDirections: ['up'],
        operation: 'gap-y',
        candidates: null,
      });
    }
  }

  // Caso-base da primeira linha: M[0][j] = j × δ (j ≥ 1, pois M[0][0] já foi calculado)
  for (let j = 1; j <= n; j += 1) {
    const value = normalizeCost(j * penalties.gapPenalty);
    matrix[0][j] = value;

    steps.push({
      stepIndex: steps.length,
      phase: 'base-row',
      row: 0,
      col: j,
      charX: null,
      charY: sequenceY[j - 1],
      value,
      chosenDirection: 'left',
      optimalDirections: ['left'],
      operation: 'gap-x',
      candidates: null,
    });
  }

  // Preenchimento bottom-up das células internas: i = 1..m, j = 1..n
  for (let i = 1; i <= m; i += 1) {
    const charX = sequenceX[i - 1];

    for (let j = 1; j <= n; j += 1) {
      const charY = sequenceY[j - 1];
      const alphaCost = getMismatchCost(
        charX,
        charY,
        penalties.mismatchPenalty,
      );
      const diagonalOperation = charX === charY ? 'match' : 'mismatch';

      const diagPrev = matrix[i - 1][j - 1];
      const upPrev = matrix[i - 1][j];
      const leftPrev = matrix[i][j - 1];

      const diagTotal = normalizeCost(diagPrev + alphaCost);
      const upTotal = normalizeCost(upPrev + penalties.gapPenalty);
      const leftTotal = normalizeCost(leftPrev + penalties.gapPenalty);

      const minValue = Math.min(diagTotal, upTotal, leftTotal);
      matrix[i][j] = minValue;

      const diagIsOptimal = costsEqual(diagTotal, minValue);
      const upIsOptimal = costsEqual(upTotal, minValue);
      const leftIsOptimal = costsEqual(leftTotal, minValue);

      const optimalDirections: TransitionDirection[] = [];
      if (diagIsOptimal) optimalDirections.push('diagonal');
      if (upIsOptimal) optimalDirections.push('up');
      if (leftIsOptimal) optimalDirections.push('left');

      // Desempate determinístico conforme TIE_BREAK_ORDER: diagonal > up > left
      const chosenDirection = optimalDirections[0];

      const diagonalCandidate: TransitionCandidate = {
        direction: 'diagonal',
        from: { row: i - 1, col: j - 1 },
        previousCost: diagPrev,
        transitionCost: alphaCost,
        totalCost: diagTotal,
        operation: diagonalOperation,
        isOptimal: diagIsOptimal,
        isChosen: chosenDirection === 'diagonal',
      };

      const upCandidate: TransitionCandidate = {
        direction: 'up',
        from: { row: i - 1, col: j },
        previousCost: upPrev,
        transitionCost: penalties.gapPenalty,
        totalCost: upTotal,
        operation: 'gap-y',
        isOptimal: upIsOptimal,
        isChosen: chosenDirection === 'up',
      };

      const leftCandidate: TransitionCandidate = {
        direction: 'left',
        from: { row: i, col: j - 1 },
        previousCost: leftPrev,
        transitionCost: penalties.gapPenalty,
        totalCost: leftTotal,
        operation: 'gap-x',
        isOptimal: leftIsOptimal,
        isChosen: chosenDirection === 'left',
      };

      const candidates: RecurrenceCandidates = {
        diagonal: diagonalCandidate,
        up: upCandidate,
        left: leftCandidate,
      };

      const chosenOperation =
        chosenDirection === 'diagonal'
          ? diagonalOperation
          : chosenDirection === 'up'
            ? 'gap-y'
            : 'gap-x';

      steps.push({
        stepIndex: steps.length,
        phase: 'recurrence',
        row: i,
        col: j,
        charX,
        charY,
        value: minValue,
        chosenDirection,
        optimalDirections,
        operation: chosenOperation,
        candidates,
      });
    }
  }

  const alignment = reconstructAlignment(sequenceX, sequenceY, matrix, penalties);

  return {
    sequenceX,
    sequenceY,
    penalties,
    rows: m,
    cols: n,
    minCost: matrix[m][n],
    matrix,
    steps,
    alignment,
  };
}
