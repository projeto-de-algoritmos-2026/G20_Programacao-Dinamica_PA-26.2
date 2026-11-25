import { GAP_SYMBOL, type AlignmentPenalties } from '../../types/alignment';

/** Limite máximo de caracteres por sequência para manter a matriz legível. */
export const MAX_SEQUENCE_LENGTH = 15;

/** Limite superior razoável para penalidades configuráveis na interface. */
export const MAX_PENALTY_VALUE = 99;

export interface SequenceFormValues {
  sequenceX: string;
  sequenceY: string;
  mismatchPenaltyText: string;
  gapPenaltyText: string;
}

export interface SequenceFormErrors {
  sequenceX?: string;
  sequenceY?: string;
  mismatchPenalty?: string;
  gapPenalty?: string;
}

export interface ValidatedAlignmentParams {
  sequenceX: string;
  sequenceY: string;
  penalties: AlignmentPenalties;
}

export interface FormValidationResult {
  isValid: boolean;
  errors: SequenceFormErrors;
  parsed: ValidatedAlignmentParams | null;
}

function validateSequence(value: string, label: string): string | undefined {
  if (value.length > MAX_SEQUENCE_LENGTH) {
    return `A sequência ${label} deve ter no máximo ${MAX_SEQUENCE_LENGTH} caracteres.`;
  }

  if (/\s/.test(value)) {
    return `A sequência ${label} não deve conter espaços ou quebras de linha.`;
  }

  if (value.includes(GAP_SYMBOL)) {
    return `O caractere "${GAP_SYMBOL}" é reservado para representar lacunas (gaps).`;
  }

  return undefined;
}

function parsePenalty(
  rawText: string,
  label: string,
): { value: number | null; error?: string } {
  const trimmed = rawText.trim().replace(',', '.');

  if (trimmed === '') {
    return { value: null, error: `Informe um valor para ${label}.` };
  }

  const parsed = Number(trimmed);

  if (!Number.isFinite(parsed)) {
    return { value: null, error: `${label} deve ser um número válido.` };
  }

  if (parsed < 0) {
    return { value: null, error: `${label} não pode ser negativo.` };
  }

  if (parsed > MAX_PENALTY_VALUE) {
    return {
      value: null,
      error: `${label} deve ser no máximo ${MAX_PENALTY_VALUE}.`,
    };
  }

  return { value: parsed };
}

/** Valida os campos do formulário de entrada antes de acionar o algoritmo DP. */
export function validateSequenceForm(
  values: SequenceFormValues,
): FormValidationResult {
  const errors: SequenceFormErrors = {};

  const errorX = validateSequence(values.sequenceX, 'X');
  if (errorX) errors.sequenceX = errorX;

  const errorY = validateSequence(values.sequenceY, 'Y');
  if (errorY) errors.sequenceY = errorY;

  const mismatch = parsePenalty(
    values.mismatchPenaltyText,
    'a penalidade de diferença (α)',
  );
  if (mismatch.error) errors.mismatchPenalty = mismatch.error;

  const gap = parsePenalty(values.gapPenaltyText, 'a penalidade de lacuna (δ)');
  if (gap.error) errors.gapPenalty = gap.error;

  const isValid = Object.keys(errors).length === 0;

  if (!isValid || mismatch.value === null || gap.value === null) {
    return { isValid: false, errors, parsed: null };
  }

  return {
    isValid: true,
    errors: {},
    parsed: {
      sequenceX: values.sequenceX,
      sequenceY: values.sequenceY,
      penalties: {
        mismatchPenalty: mismatch.value,
        gapPenalty: gap.value,
      },
    },
  };
}
