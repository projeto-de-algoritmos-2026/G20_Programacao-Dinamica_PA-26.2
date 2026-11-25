import type { AlignmentPenalties } from '../../types/alignment';

export interface SequencePreset {
  id: string;
  label: string;
  description: string;
  sequenceX: string;
  sequenceY: string;
  penalties: AlignmentPenalties;
}

export const SEQUENCE_PRESETS: readonly SequencePreset[] = [
  {
    id: 'gato-galo',
    label: 'GATO × GALO',
    description: 'Exemplo padrão (1 diferença, custo 1)',
    sequenceX: 'GATO',
    sequenceY: 'GALO',
    penalties: { mismatchPenalty: 1, gapPenalty: 1 },
  },
  {
    id: 'gato-galo-high-mismatch',
    label: 'GATO × GALO (α=3, δ=1)',
    description: 'Diferença cara: prefere 2 lacunas (custo 2)',
    sequenceX: 'GATO',
    sequenceY: 'GALO',
    penalties: { mismatchPenalty: 3, gapPenalty: 1 },
  },
  {
    id: 'dna-kleinberg',
    label: 'CTACCG × TACATG',
    description: 'Alinhamento de DNA do material (Seção 6.6)',
    sequenceX: 'CTACCG',
    sequenceY: 'TACATG',
    penalties: { mismatchPenalty: 2, gapPenalty: 1 },
  },
  {
    id: 'ocurrance-occurrence',
    label: 'ocurrance × occurrence',
    description: 'Similaridade textual do material (Seção 6.6)',
    sequenceX: 'ocurrance',
    sequenceY: 'occurrence',
    penalties: { mismatchPenalty: 1, gapPenalty: 1 },
  },
  {
    id: 'multiple-optima',
    label: 'A × AA',
    description: 'Múltiplos alinhamentos ótimos (desempate)',
    sequenceX: 'A',
    sequenceY: 'AA',
    penalties: { mismatchPenalty: 1, gapPenalty: 1 },
  },
  {
    id: 'base-case-empty',
    label: 'ε × CASA',
    description: 'Sequência vazia demonstrando casos-base',
    sequenceX: '',
    sequenceY: 'CASA',
    penalties: { mismatchPenalty: 1, gapPenalty: 1 },
  },
];
