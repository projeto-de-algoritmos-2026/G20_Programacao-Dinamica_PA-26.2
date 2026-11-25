import {
  COST_EPSILON,
  GAP_SYMBOL,
  type AlignmentOperationItem,
  type AlignmentOperationType,
  type AlignmentPenalties,
  type AlignmentReconstruction,
  type AlignmentSummary,
  type GridCoordinate,
  type TracebackStep,
  type TransitionDirection,
} from '../types/alignment';

/** Normaliza pequenos resíduos de ponto flutuante sem alterar valores inteiros. */
export function normalizeCost(value: number): number {
  const rounded = Math.round(value * 1e9) / 1e9;
  return Object.is(rounded, -0) ? 0 : rounded;
}

/** Verifica igualdade de custos respeitando tolerância de ponto flutuante. */
export function costsEqual(a: number, b: number): boolean {
  return Math.abs(a - b) <= COST_EPSILON;
}

/**
 * Calcula a função de penalidade α(a, b):
 * - 0 se a === b (correspondência)
 * - mismatchPenalty se a !== b (diferença)
 */
export function getMismatchCost(
  charX: string,
  charY: string,
  mismatchPenalty: number,
): number {
  return charX === charY ? 0 : mismatchPenalty;
}

/**
 * Reconstrói um alinhamento ótimo a partir da matriz DP preenchida M.
 *
 * Percorre de (m, n) até (0, 0) em tempo O(m + n), utilizando a mesma regra
 * determinística de desempate definida em TIE_BREAK_ORDER:
 * 1. diagonal: M[i][j] = M[i-1][j-1] + α(X[i-1], Y[j-1])
 * 2. up:       M[i][j] = M[i-1][j] + δ   (lacuna em Y)
 * 3. left:     M[i][j] = M[i][j-1] + δ   (lacuna em X)
 */
export function reconstructAlignment(
  sequenceX: string,
  sequenceY: string,
  matrix: readonly (readonly number[])[],
  penalties: AlignmentPenalties,
): AlignmentReconstruction {
  const m = sequenceX.length;
  const n = sequenceY.length;

  const path: GridCoordinate[] = [{ row: m, col: n }];
  const reversedOperations: Omit<AlignmentOperationItem, 'alignmentIndex'>[] = [];
  const rawTraceback: Array<{
    current: GridCoordinate;
    previous: GridCoordinate;
    direction: TransitionDirection;
    optimalDirections: TransitionDirection[];
  }> = [];

  let i = m;
  let j = n;
  let hasMultipleOptimalAlignments = false;

  while (i > 0 || j > 0) {
    const current: GridCoordinate = { row: i, col: j };
    const currentValue = matrix[i][j];

    let chosenDirection: TransitionDirection;
    const optimalDirections: TransitionDirection[] = [];

    if (i > 0 && j > 0) {
      const charX = sequenceX[i - 1];
      const charY = sequenceY[j - 1];
      const diagPenalty = getMismatchCost(charX, charY, penalties.mismatchPenalty);

      const diagCost = normalizeCost(matrix[i - 1][j - 1] + diagPenalty);
      const upCost = normalizeCost(matrix[i - 1][j] + penalties.gapPenalty);
      const leftCost = normalizeCost(matrix[i][j - 1] + penalties.gapPenalty);

      if (costsEqual(currentValue, diagCost)) {
        optimalDirections.push('diagonal');
      }
      if (costsEqual(currentValue, upCost)) {
        optimalDirections.push('up');
      }
      if (costsEqual(currentValue, leftCost)) {
        optimalDirections.push('left');
      }

      if (optimalDirections.length === 0) {
        throw new Error(
          `Matriz DP inconsistente na célula (${i}, ${j}): nenhum predecessor produz M[${i}][${j}] = ${currentValue}.`,
        );
      }

      if (optimalDirections.length > 1) {
        hasMultipleOptimalAlignments = true;
      }

      // Ordem determinística: diagonal > up > left
      chosenDirection = optimalDirections[0];
    } else if (i > 0) {
      chosenDirection = 'up';
      optimalDirections.push('up');
    } else {
      chosenDirection = 'left';
      optimalDirections.push('left');
    }

    let previous: GridCoordinate;
    let charX: string;
    let charY: string;
    let sourceIndexX: number | null;
    let sourceIndexY: number | null;
    let type: AlignmentOperationType;
    let cost: number;

    if (chosenDirection === 'diagonal') {
      previous = { row: i - 1, col: j - 1 };
      charX = sequenceX[i - 1];
      charY = sequenceY[j - 1];
      sourceIndexX = i - 1;
      sourceIndexY = j - 1;
      type = charX === charY ? 'match' : 'mismatch';
      cost = getMismatchCost(charX, charY, penalties.mismatchPenalty);
      i -= 1;
      j -= 1;
    } else if (chosenDirection === 'up') {
      previous = { row: i - 1, col: j };
      charX = sequenceX[i - 1];
      charY = GAP_SYMBOL;
      sourceIndexX = i - 1;
      sourceIndexY = null;
      type = 'gap-y';
      cost = penalties.gapPenalty;
      i -= 1;
    } else {
      previous = { row: i, col: j - 1 };
      charX = GAP_SYMBOL;
      charY = sequenceY[j - 1];
      sourceIndexX = null;
      sourceIndexY = j - 1;
      type = 'gap-x';
      cost = penalties.gapPenalty;
      j -= 1;
    }

    path.push(previous);
    reversedOperations.push({
      charX,
      charY,
      sourceIndexX,
      sourceIndexY,
      type,
      direction: chosenDirection,
      cost: normalizeCost(cost),
      from: previous,
      to: current,
    });
    rawTraceback.push({
      current,
      previous,
      direction: chosenDirection,
      optimalDirections,
    });
  }

  const totalOperations = reversedOperations.length;
  const operations: AlignmentOperationItem[] = reversedOperations
    .slice()
    .reverse()
    .map((op, index) => ({
      ...op,
      alignmentIndex: index,
    }));

  const tracebackSteps: TracebackStep[] = rawTraceback.map((step, index) => ({
    tracebackIndex: index,
    current: step.current,
    previous: step.previous,
    direction: step.direction,
    optimalDirections: step.optimalDirections,
    operation: operations[totalOperations - 1 - index],
  }));

  const alignedX = operations.map((op) => op.charX).join('');
  const alignedY = operations.map((op) => op.charY).join('');

  let matches = 0;
  let mismatches = 0;
  let gapsInX = 0;
  let gapsInY = 0;
  let rawTotalCost = 0;

  for (const op of operations) {
    rawTotalCost += op.cost;
    switch (op.type) {
      case 'match':
        matches += 1;
        break;
      case 'mismatch':
        mismatches += 1;
        break;
      case 'gap-x':
        gapsInX += 1;
        break;
      case 'gap-y':
        gapsInY += 1;
        break;
    }
  }

  const summary: AlignmentSummary = {
    matches,
    mismatches,
    gapsInX,
    gapsInY,
    totalGaps: gapsInX + gapsInY,
    alignmentLength: operations.length,
  };

  return {
    alignedX,
    alignedY,
    operations,
    tracebackSteps,
    path,
    totalCost: normalizeCost(rawTotalCost),
    summary,
    hasMultipleOptimalAlignments,
  };
}
