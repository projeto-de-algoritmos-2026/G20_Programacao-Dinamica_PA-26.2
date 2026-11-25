/**
 * Tipos e estruturas de dados do algoritmo Sequence Alignment (Programação Dinâmica).
 *
 * Referência: Kleinberg & Tardos, Algorithm Design, Seções 6.6 e 6.7.
 */

/** Símbolo padrão usado para representar uma lacuna (gap) no alinhamento reconstruído. */
export const GAP_SYMBOL = '-' as const;

/** Tolerância numérica para comparações de custo com penalidades decimais. */
export const COST_EPSILON = 1e-9;

/**
 * Ordem determinística de desempate entre decisões ótimas de mesmo custo mínimo.
 * Segue a mesma prioridade do procedimento Find_Sequence do material da disciplina:
 * 1. diagonal: emparelhamento de X[i-1] com Y[j-1] (match ou mismatch)
 * 2. up:       lacuna em Y (X[i-1] sem par, vindo de M[i-1][j] + δ)
 * 3. left:     lacuna em X (Y[j-1] sem par, vindo de M[i][j-1] + δ)
 */
export const TIE_BREAK_ORDER = ['diagonal', 'up', 'left'] as const;

/** Penalidades configuráveis do alinhamento (ambas não negativas). */
export interface AlignmentPenalties {
  /** Penalidade α(a, b) aplicada quando a ≠ b. Padrão: 1. */
  mismatchPenalty: number;
  /** Penalidade δ aplicada a cada lacuna (gap). Padrão: 1. */
  gapPenalty: number;
}

/** Configuração padrão de penalidades (α = 1 para diferença, δ = 1 para lacuna). */
export const DEFAULT_PENALTIES: Readonly<AlignmentPenalties> = {
  mismatchPenalty: 1,
  gapPenalty: 1,
};

/** Entrada completa do algoritmo Sequence Alignment. */
export interface SequenceAlignmentInput {
  sequenceX: string;
  sequenceY: string;
  penalties?: Partial<AlignmentPenalties>;
}

/** Coordenada (linha i, coluna j) na matriz de Programação Dinâmica. */
export interface GridCoordinate {
  row: number;
  col: number;
}

/** Direção de transição entre subproblemas na matriz DP. */
export type TransitionDirection = (typeof TIE_BREAK_ORDER)[number];

/** Direção armazenada para qualquer célula (incluindo a origem (0, 0)). */
export type CellDirection = 'origin' | TransitionDirection;

/** Tipo de operação elementar do alinhamento. */
export type AlignmentOperationType =
  | 'match'
  | 'mismatch'
  | 'gap-y'
  | 'gap-x';

/** Tipo de operação associado a uma etapa de preenchimento da matriz. */
export type StepOperationType = 'origin' | AlignmentOperationType;

/** Fase de preenchimento à qual uma célula pertence. */
export type CalculationPhase =
  | 'base-origin'
  | 'base-col'
  | 'base-row'
  | 'recurrence';

/** Detalhamento de um dos três candidatos avaliados na recorrência M[i][j]. */
export interface TransitionCandidate {
  direction: TransitionDirection;
  from: GridCoordinate;
  /** Custo do subproblema anterior (M[i-1][j-1], M[i-1][j] ou M[i][j-1]). */
  previousCost: number;
  /** Penalidade incremental (α(X[i-1], Y[j-1]) ou δ). */
  transitionCost: number;
  /** Custo total candidato = previousCost + transitionCost. */
  totalCost: number;
  /** Operação correspondente a essa transição. */
  operation: AlignmentOperationType;
  /** Indica se este candidato empatou com o custo mínimo M[i][j]. */
  isOptimal: boolean;
  /** Indica se este candidato foi selecionado pela regra determinística de desempate. */
  isChosen: boolean;
}

/** Conjunto estruturado dos três candidatos da recorrência para i > 0 e j > 0. */
export interface RecurrenceCandidates {
  diagonal: TransitionCandidate;
  up: TransitionCandidate;
  left: TransitionCandidate;
}

/** Registro determinístico de uma única etapa do preenchimento bottom-up da matriz. */
export interface CalculationStep {
  stepIndex: number;
  phase: CalculationPhase;
  row: number;
  col: number;
  /** Caractere X[i-1] (ou null quando i = 0). */
  charX: string | null;
  /** Caractere Y[j-1] (ou null quando j = 0). */
  charY: string | null;
  /** Valor ótimo calculado M[i][j]. */
  value: number;
  /** Direção escolhida para esta célula segundo a regra de desempate. */
  chosenDirection: CellDirection;
  /** Todas as direções que produziram o menor custo (vazio apenas na origem). */
  optimalDirections: TransitionDirection[];
  /** Operação correspondente à decisão escolhida. */
  operation: StepOperationType;
  /** Três candidatos da recorrência (presente para i > 0 e j > 0; null nos casos-base). */
  candidates: RecurrenceCandidates | null;
}

/** Uma coluna do alinhamento reconstruído (em ordem da esquerda para a direita). */
export interface AlignmentOperationItem {
  /** Índice da coluna no alinhamento final (0..L-1). */
  alignmentIndex: number;
  /** Caractere de X ou '-' quando há lacuna em X. */
  charX: string;
  /** Caractere de Y ou '-' quando há lacuna em Y. */
  charY: string;
  /** Índice 0-based em X (ou null se for lacuna em X). */
  sourceIndexX: number | null;
  /** Índice 0-based em Y (ou null se for lacuna em Y). */
  sourceIndexY: number | null;
  /** Tipo da operação nesta posição. */
  type: AlignmentOperationType;
  /** Direção de transição que gerou esta operação. */
  direction: TransitionDirection;
  /** Custo individual desta operação (0, α ou δ). */
  cost: number;
  /** Célula de origem na matriz DP. */
  from: GridCoordinate;
  /** Célula de destino na matriz DP. */
  to: GridCoordinate;
}

/** Uma etapa da reconstrução passo a passo (percorrendo de (m, n) até (0, 0)). */
export interface TracebackStep {
  tracebackIndex: number;
  /** Célula atual visitada na reconstrução (começa em (m, n)). */
  current: GridCoordinate;
  /** Próxima célula alcançada ao retroceder em direção a (0, 0). */
  previous: GridCoordinate;
  /** Direção da transição ótima seguida (no sentido forward: previous -> current). */
  direction: TransitionDirection;
  /** Todas as direções ótimas disponíveis a partir desta célula. */
  optimalDirections: TransitionDirection[];
  /** Operação reconstruída neste passo. */
  operation: AlignmentOperationItem;
}

/** Métricas resumidas do alinhamento ótimo reconstruído. */
export interface AlignmentSummary {
  matches: number;
  mismatches: number;
  gapsInX: number;
  gapsInY: number;
  totalGaps: number;
  alignmentLength: number;
}

/** Resultado completo da fase de reconstrução do alinhamento ótimo. */
export interface AlignmentReconstruction {
  alignedX: string;
  alignedY: string;
  /** Operações ordenadas do início ao fim do alinhamento. */
  operations: AlignmentOperationItem[];
  /** Etapas de retrocesso ordenadas de (m, n) até (0, 0), para visualização passo a passo. */
  tracebackSteps: TracebackStep[];
  /** Coordenadas do caminho ótimo na matriz DP, de (m, n) até (0, 0) inclusive. */
  path: GridCoordinate[];
  /** Soma dos custos das operações reconstruídas (deve coincidir com M[m][n]). */
  totalCost: number;
  summary: AlignmentSummary;
  /** Verdadeiro se e somente se existir pelo menos outro alinhamento distinto de mesmo custo mínimo. */
  hasMultipleOptimalAlignments: boolean;
}

/** Resultado completo retornado pelo algoritmo Sequence Alignment. */
export interface SequenceAlignmentResult {
  sequenceX: string;
  sequenceY: string;
  penalties: AlignmentPenalties;
  /** Comprimento m de X. */
  rows: number;
  /** Comprimento n de Y. */
  cols: number;
  /** Custo mínimo ótimo M[m][n]. */
  minCost: number;
  /** Matriz completa de Programação Dinâmica de dimensões (m+1) × (n+1). */
  matrix: number[][];
  /** Sequência determinística de todas as (m+1) × (n+1) etapas de cálculo bottom-up. */
  steps: CalculationStep[];
  /** Alinhamento ótimo reconstruído a partir da matriz M. */
  alignment: AlignmentReconstruction;
}
