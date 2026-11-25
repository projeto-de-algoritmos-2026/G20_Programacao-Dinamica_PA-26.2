import { describe, expect, it } from 'vitest';
import {
  MAX_PENALTY_VALUE,
  MAX_SEQUENCE_LENGTH,
  validateSequenceForm,
} from '../components/input/validation';

describe('Validação do formulário de entrada (SequenceInputPanel)', () => {
  it('aceita sequências válidas e penalidades padrão', () => {
    const res = validateSequenceForm({
      sequenceX: 'GATO',
      sequenceY: 'GALO',
      mismatchPenaltyText: '1',
      gapPenaltyText: '1',
    });

    expect(res.isValid).toBe(true);
    expect(res.errors).toEqual({});
    expect(res.parsed).toEqual({
      sequenceX: 'GATO',
      sequenceY: 'GALO',
      penalties: { mismatchPenalty: 1, gapPenalty: 1 },
    });
  });

  it('permite sequências vazias para demonstração dos casos-base', () => {
    const res = validateSequenceForm({
      sequenceX: '',
      sequenceY: '',
      mismatchPenaltyText: '0',
      gapPenaltyText: '2.5',
    });

    expect(res.isValid).toBe(true);
    expect(res.parsed).toEqual({
      sequenceX: '',
      sequenceY: '',
      penalties: { mismatchPenalty: 0, gapPenalty: 2.5 },
    });
  });

  it('aceita decimais com vírgula nas penalidades', () => {
    const res = validateSequenceForm({
      sequenceX: 'AB',
      sequenceY: 'AC',
      mismatchPenaltyText: '1,5',
      gapPenaltyText: '0,5',
    });

    expect(res.isValid).toBe(true);
    expect(res.parsed?.penalties).toEqual({
      mismatchPenalty: 1.5,
      gapPenalty: 0.5,
    });
  });

  it('rejeita sequências acima do limite máximo de legibilidade', () => {
    const tooLong = 'A'.repeat(MAX_SEQUENCE_LENGTH + 1);
    const res = validateSequenceForm({
      sequenceX: tooLong,
      sequenceY: 'A',
      mismatchPenaltyText: '1',
      gapPenaltyText: '1',
    });

    expect(res.isValid).toBe(false);
    expect(res.errors.sequenceX).toBeDefined();
    expect(res.parsed).toBeNull();
  });

  it('rejeita o caractere reservado "-" e espaços nas sequências', () => {
    const res = validateSequenceForm({
      sequenceX: 'GA-TO',
      sequenceY: 'GA LO',
      mismatchPenaltyText: '1',
      gapPenaltyText: '1',
    });

    expect(res.isValid).toBe(false);
    expect(res.errors.sequenceX).toMatch(/reservado/i);
    expect(res.errors.sequenceY).toMatch(/espaços/i);
  });

  it('rejeita penalidades negativas, vazias ou acima do limite superior', () => {
    const negative = validateSequenceForm({
      sequenceX: 'A',
      sequenceY: 'B',
      mismatchPenaltyText: '-1',
      gapPenaltyText: '',
    });
    expect(negative.isValid).toBe(false);
    expect(negative.errors.mismatchPenalty).toMatch(/negativo/i);
    expect(negative.errors.gapPenalty).toMatch(/informe/i);

    const tooHigh = validateSequenceForm({
      sequenceX: 'A',
      sequenceY: 'B',
      mismatchPenaltyText: String(MAX_PENALTY_VALUE + 1),
      gapPenaltyText: '1',
    });
    expect(tooHigh.isValid).toBe(false);
    expect(tooHigh.errors.mismatchPenalty).toBeDefined();
  });
});
