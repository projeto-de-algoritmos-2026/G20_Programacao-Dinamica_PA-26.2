import { describe, expect, it } from 'vitest';
import {
  computeSequenceAlignment,
  costsEqual,
  normalizeCost,
  reconstructAlignment,
} from '../algorithm';
import {
  GAP_SYMBOL,
  type AlignmentPenalties,
  type SequenceAlignmentResult,
} from '../types/alignment';

/**
 * Valida todas as invariantes matemáticas entre entrada, matriz DP,
 * etapas de cálculo bottom-up e alinhamento reconstruído.
 */
function assertAlignmentInvariants(result: SequenceAlignmentResult): void {
  const { sequenceX, sequenceY, penalties, matrix, steps, alignment, minCost } =
    result;
  const m = sequenceX.length;
  const n = sequenceY.length;

  // 1. Dimensões e casos-base da matriz
  expect(result.rows).toBe(m);
  expect(result.cols).toBe(n);
  expect(matrix).toHaveLength(m + 1);
  for (let i = 0; i <= m; i += 1) {
    expect(matrix[i]).toHaveLength(n + 1);
    expect(matrix[i][0]).toBe(normalizeCost(i * penalties.gapPenalty));
  }
  for (let j = 0; j <= n; j += 1) {
    expect(matrix[0][j]).toBe(normalizeCost(j * penalties.gapPenalty));
  }

  // 2. Recorrência em todas as células internas
  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      const alpha =
        sequenceX[i - 1] === sequenceY[j - 1] ? 0 : penalties.mismatchPenalty;
      const expected = normalizeCost(
        Math.min(
          matrix[i - 1][j - 1] + alpha,
          matrix[i - 1][j] + penalties.gapPenalty,
          matrix[i][j - 1] + penalties.gapPenalty,
        ),
      );
      expect(costsEqual(matrix[i][j], expected)).toBe(true);
    }
  }

  // 3. Etapas bottom-up cobrem exatamente cada célula uma única vez
  expect(steps).toHaveLength((m + 1) * (n + 1));
  const visited = new Set<string>();
  steps.forEach((step, idx) => {
    expect(step.stepIndex).toBe(idx);
    const key = `${step.row},${step.col}`;
    expect(visited.has(key)).toBe(false);
    visited.add(key);
    expect(step.value).toBe(matrix[step.row][step.col]);
  });

  // 4. Coerência entre custo mínimo e alinhamento reconstruído
  expect(minCost).toBe(matrix[m][n]);
  expect(costsEqual(alignment.totalCost, minCost)).toBe(true);

  const recomputedCost = normalizeCost(
    alignment.operations.reduce((acc, op) => acc + op.cost, 0),
  );
  expect(costsEqual(recomputedCost, minCost)).toBe(true);

  // 5. Sequências reconstruídas preservam X e Y sem lacunas duplas
  expect(alignment.alignedX.length).toBe(alignment.alignedY.length);
  expect(alignment.alignedX.length).toBe(alignment.operations.length);
  expect(alignment.alignedX.length).toBe(alignment.summary.alignmentLength);

  const strippedX = alignment.alignedX.split(GAP_SYMBOL).join('');
  const strippedY = alignment.alignedY.split(GAP_SYMBOL).join('');
  expect(strippedX).toBe(sequenceX);
  expect(strippedY).toBe(sequenceY);

  for (const op of alignment.operations) {
    expect(op.charX === GAP_SYMBOL && op.charY === GAP_SYMBOL).toBe(false);
  }

  // 6. Integridade do caminho de traceback de (m, n) até (0, 0)
  expect(alignment.path[0]).toEqual({ row: m, col: n });
  expect(alignment.path[alignment.path.length - 1]).toEqual({ row: 0, col: 0 });
  expect(alignment.path).toHaveLength(alignment.tracebackSteps.length + 1);

  alignment.tracebackSteps.forEach((tb, idx) => {
    expect(tb.tracebackIndex).toBe(idx);
    expect(tb.current).toEqual(alignment.path[idx]);
    expect(tb.previous).toEqual(alignment.path[idx + 1]);
  });
}

describe('Sequence Alignment (Programação Dinâmica Bottom-Up)', () => {
  describe('Exemplo de referência: GATO × GALO', () => {
    it('calcula custo mínimo 1, matriz 5×5 exata e alinhamento ótimo com penalidades padrão', () => {
      const result = computeSequenceAlignment({
        sequenceX: 'GATO',
        sequenceY: 'GALO',
      });

      assertAlignmentInvariants(result);

      expect(result.minCost).toBe(1);
      expect(result.matrix).toEqual([
        [0, 1, 2, 3, 4],
        [1, 0, 1, 2, 3],
        [2, 1, 0, 1, 2],
        [3, 2, 1, 1, 2],
        [4, 3, 2, 2, 1],
      ]);

      expect(result.alignment.alignedX).toBe('GATO');
      expect(result.alignment.alignedY).toBe('GALO');
      expect(result.alignment.operations.map((op) => op.type)).toEqual([
        'match',
        'match',
        'mismatch',
        'match',
      ]);
      expect(result.alignment.summary).toEqual({
        matches: 3,
        mismatches: 1,
        gapsInX: 0,
        gapsInY: 0,
        totalGaps: 0,
        alignmentLength: 4,
      });
      expect(result.alignment.hasMultipleOptimalAlignments).toBe(false);

      // Verifica candidatos da célula (3, 3): T vs L
      const stepTvsL = result.steps.find((s) => s.row === 3 && s.col === 3);
      expect(stepTvsL).toBeDefined();
      expect(stepTvsL?.charX).toBe('T');
      expect(stepTvsL?.charY).toBe('L');
      expect(stepTvsL?.candidates?.diagonal).toMatchObject({
        previousCost: 0,
        transitionCost: 1,
        totalCost: 1,
        operation: 'mismatch',
        isOptimal: true,
        isChosen: true,
      });
      expect(stepTvsL?.candidates?.up).toMatchObject({
        previousCost: 1,
        transitionCost: 1,
        totalCost: 2,
        operation: 'gap-y',
        isOptimal: false,
        isChosen: false,
      });
      expect(stepTvsL?.candidates?.left).toMatchObject({
        previousCost: 1,
        transitionCost: 1,
        totalCost: 2,
        operation: 'gap-x',
        isOptimal: false,
        isChosen: false,
      });
    });
  });

  describe('Sequências idênticas e completamente diferentes', () => {
    it('retorna custo 0 e apenas correspondências para sequências idênticas', () => {
      const result = computeSequenceAlignment({
        sequenceX: 'ALGORITMO',
        sequenceY: 'ALGORITMO',
      });

      assertAlignmentInvariants(result);
      expect(result.minCost).toBe(0);
      expect(result.alignment.alignedX).toBe('ALGORITMO');
      expect(result.alignment.alignedY).toBe('ALGORITMO');
      expect(result.alignment.summary).toEqual({
        matches: 9,
        mismatches: 0,
        gapsInX: 0,
        gapsInY: 0,
        totalGaps: 0,
        alignmentLength: 9,
      });
      for (let i = 0; i <= 9; i += 1) {
        expect(result.matrix[i][i]).toBe(0);
      }
    });

    it('alinha sequências totalmente diferentes usando diferenças quando α < 2δ', () => {
      const result = computeSequenceAlignment({
        sequenceX: 'ABC',
        sequenceY: 'XYZ',
      });

      assertAlignmentInvariants(result);
      expect(result.minCost).toBe(3);
      expect(result.alignment.alignedX).toBe('ABC');
      expect(result.alignment.alignedY).toBe('XYZ');
      expect(result.alignment.summary.mismatches).toBe(3);
      expect(result.alignment.summary.totalGaps).toBe(0);
    });
  });

  describe('Casos-base com sequências vazias', () => {
    it('trata duas sequências vazias com matriz 1×1 e custo 0', () => {
      const result = computeSequenceAlignment({
        sequenceX: '',
        sequenceY: '',
      });

      assertAlignmentInvariants(result);
      expect(result.minCost).toBe(0);
      expect(result.matrix).toEqual([[0]]);
      expect(result.steps).toHaveLength(1);
      expect(result.steps[0].phase).toBe('base-origin');
      expect(result.alignment.alignedX).toBe('');
      expect(result.alignment.alignedY).toBe('');
      expect(result.alignment.operations).toEqual([]);
      expect(result.alignment.tracebackSteps).toEqual([]);
      expect(result.alignment.path).toEqual([{ row: 0, col: 0 }]);
      expect(result.alignment.hasMultipleOptimalAlignments).toBe(false);
    });

    it('trata X vazia e Y não vazia como sequência de lacunas em X', () => {
      const result = computeSequenceAlignment({
        sequenceX: '',
        sequenceY: 'CASA',
      });

      assertAlignmentInvariants(result);
      expect(result.minCost).toBe(4);
      expect(result.matrix).toEqual([[0, 1, 2, 3, 4]]);
      expect(result.alignment.alignedX).toBe('----');
      expect(result.alignment.alignedY).toBe('CASA');
      expect(result.alignment.summary).toEqual({
        matches: 0,
        mismatches: 0,
        gapsInX: 4,
        gapsInY: 0,
        totalGaps: 4,
        alignmentLength: 4,
      });
    });

    it('trata X não vazia e Y vazia como sequência de lacunas em Y', () => {
      const result = computeSequenceAlignment({
        sequenceX: 'CASA',
        sequenceY: '',
        penalties: { gapPenalty: 2 },
      });

      assertAlignmentInvariants(result);
      expect(result.minCost).toBe(8);
      expect(result.matrix).toEqual([[0], [2], [4], [6], [8]]);
      expect(result.alignment.alignedX).toBe('CASA');
      expect(result.alignment.alignedY).toBe('----');
      expect(result.alignment.summary).toEqual({
        matches: 0,
        mismatches: 0,
        gapsInX: 0,
        gapsInY: 4,
        totalGaps: 4,
        alignmentLength: 4,
      });
    });
  });

  describe('Sequências com tamanhos diferentes e lacunas (inserções e exclusões)', () => {
    it('identifica inserções como lacunas em X (gap-x)', () => {
      const result = computeSequenceAlignment({
        sequenceX: 'BD',
        sequenceY: 'ABCD',
      });

      assertAlignmentInvariants(result);
      expect(result.minCost).toBe(2);
      expect(result.alignment.alignedX).toBe('-B-D');
      expect(result.alignment.alignedY).toBe('ABCD');
      expect(result.alignment.summary.matches).toBe(2);
      expect(result.alignment.summary.gapsInX).toBe(2);
      expect(result.alignment.summary.gapsInY).toBe(0);
    });

    it('identifica exclusões como lacunas em Y (gap-y)', () => {
      const result = computeSequenceAlignment({
        sequenceX: 'ABCD',
        sequenceY: 'BD',
      });

      assertAlignmentInvariants(result);
      expect(result.minCost).toBe(2);
      expect(result.alignment.alignedX).toBe('ABCD');
      expect(result.alignment.alignedY).toBe('-B-D');
      expect(result.alignment.summary.matches).toBe(2);
      expect(result.alignment.summary.gapsInX).toBe(0);
      expect(result.alignment.summary.gapsInY).toBe(2);
    });

    it('combina inserções e exclusões simultâneas quando lacunas são mais baratas que diferenças', () => {
      const result = computeSequenceAlignment({
        sequenceX: 'ABC',
        sequenceY: 'BCD',
        penalties: { mismatchPenalty: 3, gapPenalty: 1 },
      });

      assertAlignmentInvariants(result);
      expect(result.minCost).toBe(2);
      expect(result.alignment.alignedX).toBe('ABC-');
      expect(result.alignment.alignedY).toBe('-BCD');
      expect(result.alignment.summary.gapsInX).toBe(1);
      expect(result.alignment.summary.gapsInY).toBe(1);
      expect(result.alignment.summary.matches).toBe(2);
    });

    it('valida os exemplos clássicos do material da disciplina (ocurrance × occurrence e CTACCG × TACATG)', () => {
      const ocurrenceResult = computeSequenceAlignment({
        sequenceX: 'ocurrance',
        sequenceY: 'occurrence',
      });
      assertAlignmentInvariants(ocurrenceResult);
      expect(ocurrenceResult.minCost).toBe(2);
      expect(ocurrenceResult.alignment.summary.mismatches).toBe(1);
      expect(ocurrenceResult.alignment.summary.totalGaps).toBe(1);

      const dnaResult = computeSequenceAlignment({
        sequenceX: 'CTACCG',
        sequenceY: 'TACATG',
        penalties: { mismatchPenalty: 2, gapPenalty: 1 },
      });
      assertAlignmentInvariants(dnaResult);
      // Solução do slide 35: C T A C C - G  vs  - T A C A T G (1 mismatch + 2 gaps = custo 4)
      expect(dnaResult.minCost).toBe(4);
    });
  });

  describe('Diferentes penalidades e validação de parâmetros', () => {
    it('prefere lacunas em GATO × GALO quando α > 2δ', () => {
      const result = computeSequenceAlignment({
        sequenceX: 'GATO',
        sequenceY: 'GALO',
        penalties: { mismatchPenalty: 3, gapPenalty: 1 },
      });

      assertAlignmentInvariants(result);
      expect(result.minCost).toBe(2);
      expect(result.alignment.summary.mismatches).toBe(0);
      expect(result.alignment.summary.totalGaps).toBe(2);
    });

    it('aceita penalidades iguais a zero (α = 0 ou δ = 0)', () => {
      const freeMismatch = computeSequenceAlignment({
        sequenceX: 'GATO',
        sequenceY: 'GALO',
        penalties: { mismatchPenalty: 0, gapPenalty: 2 },
      });
      assertAlignmentInvariants(freeMismatch);
      expect(freeMismatch.minCost).toBe(0);

      const freeGap = computeSequenceAlignment({
        sequenceX: 'ABC',
        sequenceY: 'XYZ',
        penalties: { mismatchPenalty: 5, gapPenalty: 0 },
      });
      assertAlignmentInvariants(freeGap);
      expect(freeGap.minCost).toBe(0);
    });

    it('mantém precisão numérica com penalidades decimais', () => {
      const result = computeSequenceAlignment({
        sequenceX: 'AB',
        sequenceY: 'AC',
        penalties: { mismatchPenalty: 0.3, gapPenalty: 0.1 },
      });

      assertAlignmentInvariants(result);
      expect(result.minCost).toBe(0.2);
      expect(result.alignment.totalCost).toBe(0.2);
    });

    it('rejeita penalidades negativas ou não finitas com RangeError', () => {
      expect(() =>
        computeSequenceAlignment({
          sequenceX: 'A',
          sequenceY: 'B',
          penalties: { mismatchPenalty: -1 },
        }),
      ).toThrow(RangeError);

      expect(() =>
        computeSequenceAlignment({
          sequenceX: 'A',
          sequenceY: 'B',
          penalties: { gapPenalty: -0.5 },
        }),
      ).toThrow(RangeError);

      expect(() =>
        computeSequenceAlignment({
          sequenceX: 'A',
          sequenceY: 'B',
          penalties: { mismatchPenalty: Number.NaN },
        }),
      ).toThrow(RangeError);

      expect(() =>
        computeSequenceAlignment({
          sequenceX: 'A',
          sequenceY: 'B',
          penalties: { gapPenalty: Number.POSITIVE_INFINITY },
        }),
      ).toThrow(RangeError);
    });
  });

  describe('Múltiplos alinhamentos ótimos e desempate determinístico', () => {
    it('detecta múltiplos alinhamentos ótimos em A × AA e aplica desempate diagonal > up > left', () => {
      const result = computeSequenceAlignment({
        sequenceX: 'A',
        sequenceY: 'AA',
      });

      assertAlignmentInvariants(result);
      expect(result.minCost).toBe(1);
      expect(result.alignment.hasMultipleOptimalAlignments).toBe(true);

      // Em (1, 2): diagonal = M[0][1] + 0 = 1 e left = M[1][1] + 1 = 1 -> escolhe diagonal
      const cell12 = result.steps.find((s) => s.row === 1 && s.col === 2);
      expect(cell12?.optimalDirections).toEqual(['diagonal', 'left']);
      expect(cell12?.chosenDirection).toBe('diagonal');

      expect(result.alignment.alignedX).toBe('-A');
      expect(result.alignment.alignedY).toBe('AA');
    });

    it('aplica prioridade up > left quando há empate apenas entre lacunas', () => {
      const result = computeSequenceAlignment({
        sequenceX: 'A',
        sequenceY: 'B',
        penalties: { mismatchPenalty: 5, gapPenalty: 1 },
      });

      assertAlignmentInvariants(result);
      expect(result.minCost).toBe(2);
      expect(result.alignment.hasMultipleOptimalAlignments).toBe(true);

      // Em (1, 1): diagonal = 5, up = 2, left = 2 -> escolhe up
      const cell11 = result.steps.find((s) => s.row === 1 && s.col === 1);
      expect(cell11?.optimalDirections).toEqual(['up', 'left']);
      expect(cell11?.chosenDirection).toBe('up');

      // Retrocesso: (1,1) --up--> (0,1) --left--> (0,0) => alinhamento "-A" vs "B-"
      expect(result.alignment.alignedX).toBe('-A');
      expect(result.alignment.alignedY).toBe('B-');
    });

    it('aplica prioridade diagonal > up > left em empate triplo', () => {
      const result = computeSequenceAlignment({
        sequenceX: 'A',
        sequenceY: 'B',
        penalties: { mismatchPenalty: 2, gapPenalty: 1 },
      });

      assertAlignmentInvariants(result);
      expect(result.minCost).toBe(2);
      expect(result.alignment.hasMultipleOptimalAlignments).toBe(true);

      const cell11 = result.steps.find((s) => s.row === 1 && s.col === 1);
      expect(cell11?.optimalDirections).toEqual(['diagonal', 'up', 'left']);
      expect(cell11?.chosenDirection).toBe('diagonal');
      expect(result.alignment.alignedX).toBe('A');
      expect(result.alignment.alignedY).toBe('B');
    });

    it('produz resultados estritamente determinísticos em execuções repetidas', () => {
      const first = computeSequenceAlignment({
        sequenceX: 'ABAB',
        sequenceY: 'BABA',
        penalties: { mismatchPenalty: 2, gapPenalty: 1 },
      });
      const second = computeSequenceAlignment({
        sequenceX: 'ABAB',
        sequenceY: 'BABA',
        penalties: { mismatchPenalty: 2, gapPenalty: 1 },
      });

      expect(first).toEqual(second);
    });
  });

  describe('Coerência geral em bateria de casos e proteção da reconstrução', () => {
    const cases: Array<{
      label: string;
      sequenceX: string;
      sequenceY: string;
      penalties: AlignmentPenalties;
    }> = [
      {
        label: 'padrão curto',
        sequenceX: 'CASA',
        sequenceY: 'CAIXA',
        penalties: { mismatchPenalty: 1, gapPenalty: 1 },
      },
      {
        label: 'DNA com penalidade de lacuna alta',
        sequenceX: 'ACTGAC',
        sequenceY: 'ATGACC',
        penalties: { mismatchPenalty: 1, gapPenalty: 3 },
      },
      {
        label: 'DNA com penalidade de diferença alta',
        sequenceX: 'GATTACA',
        sequenceY: 'GCATGCU',
        penalties: { mismatchPenalty: 4, gapPenalty: 1 },
      },
      {
        label: 'string unitária vs longa',
        sequenceX: 'X',
        sequenceY: 'ABXCD',
        penalties: { mismatchPenalty: 2, gapPenalty: 1 },
      },
    ];

    it.each(cases)(
      'mantém todas as invariantes da matriz e do alinhamento para $label',
      ({ sequenceX, sequenceY, penalties }) => {
        const result = computeSequenceAlignment({
          sequenceX,
          sequenceY,
          penalties,
        });
        assertAlignmentInvariants(result);
      },
    );

    it('lança erro na reconstrução se receber uma matriz DP corrompida', () => {
      const corruptedMatrix = [
        [0, 1],
        [1, 99],
      ];

      expect(() =>
        reconstructAlignment('A', 'B', corruptedMatrix, {
          mismatchPenalty: 1,
          gapPenalty: 1,
        }),
      ).toThrow(/inconsistente/i);
    });
  });
});
