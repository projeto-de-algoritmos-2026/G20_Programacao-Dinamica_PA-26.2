import { useMemo, useState, type FormEvent } from 'react';
import { DEFAULT_PENALTIES } from '../../types/alignment';
import { SEQUENCE_PRESETS, type SequencePreset } from './presets';
import {
  MAX_SEQUENCE_LENGTH,
  validateSequenceForm,
  type SequenceFormValues,
  type ValidatedAlignmentParams,
} from './validation';

interface SequenceInputPanelProps {
  onStart: (params: ValidatedAlignmentParams) => void;
  onReset: () => void;
  hasActiveResult: boolean;
}

const INITIAL_FORM: SequenceFormValues = {
  sequenceX: 'GATO',
  sequenceY: 'GALO',
  mismatchPenaltyText: String(DEFAULT_PENALTIES.mismatchPenalty),
  gapPenaltyText: String(DEFAULT_PENALTIES.gapPenalty),
};

const EMPTY_FORM: SequenceFormValues = {
  sequenceX: '',
  sequenceY: '',
  mismatchPenaltyText: String(DEFAULT_PENALTIES.mismatchPenalty),
  gapPenaltyText: String(DEFAULT_PENALTIES.gapPenalty),
};

export function SequenceInputPanel({
  onStart,
  onReset,
  hasActiveResult,
}: SequenceInputPanelProps) {
  const [form, setForm] = useState<SequenceFormValues>(INITIAL_FORM);
  const [activePresetId, setActivePresetId] = useState<string | null>(
    'gato-galo',
  );

  const validation = useMemo(() => validateSequenceForm(form), [form]);

  const handleFieldChange = (field: keyof SequenceFormValues, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setActivePresetId(null);
  };

  const handleSelectPreset = (preset: SequencePreset) => {
    setForm({
      sequenceX: preset.sequenceX,
      sequenceY: preset.sequenceY,
      mismatchPenaltyText: String(preset.penalties.mismatchPenalty),
      gapPenaltyText: String(preset.penalties.gapPenalty),
    });
    setActivePresetId(preset.id);
  };

  const handleSwapSequences = () => {
    setForm((prev) => ({
      ...prev,
      sequenceX: prev.sequenceY,
      sequenceY: prev.sequenceX,
    }));
    setActivePresetId(null);
  };

  const handleClear = () => {
    setForm(EMPTY_FORM);
    setActivePresetId(null);
    onReset();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validation.isValid || !validation.parsed) return;
    onStart(validation.parsed);
  };

  const isEmptyCase = form.sequenceX.length === 0 || form.sequenceY.length === 0;

  return (
    <section
      aria-labelledby="input-panel-title"
      className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-slate-950/40"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2
            id="input-panel-title"
            className="text-base font-semibold text-slate-100"
          >
            Configuração das Sequências e Penalidades
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Informe as sequências <span className="font-mono text-slate-200">X</span>{' '}
            (linhas) e <span className="font-mono text-slate-200">Y</span> (colunas),
            ajuste os custos <span className="font-mono text-amber-300">α</span> e{' '}
            <span className="font-mono text-rose-300">δ</span> ou selecione um exemplo pronto.
          </p>
        </div>

        <span className="rounded-md border border-slate-700/80 bg-slate-950/70 px-2.5 py-1 text-xs font-mono text-slate-300">
          Matriz: ({form.sequenceX.length + 1}) × ({form.sequenceY.length + 1})
        </span>
      </div>

      {/* Exemplos prontos */}
      <div className="mt-5">
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-400">
          Exemplos prontos
        </p>
        <div className="flex flex-wrap gap-2">
          {SEQUENCE_PRESETS.map((preset) => {
            const isSelected = activePresetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                title={preset.description}
                className={`rounded-lg border px-3 py-1.5 text-left text-xs transition-colors ${
                  isSelected
                    ? 'border-sky-400/70 bg-sky-500/15 text-sky-200'
                    : 'border-slate-700/80 bg-slate-950/60 text-slate-300 hover:border-slate-600 hover:bg-slate-800/70'
                }`}
              >
                <span className="font-mono font-medium">{preset.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Formulário principal */}
      <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto_1fr] md:items-start">
          {/* Sequência X */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label
                htmlFor="sequence-x-input"
                className="text-sm font-medium text-slate-200"
              >
                Sequência X <span className="text-xs text-slate-400">(linhas, m)</span>
              </label>
              <span
                className={`font-mono text-xs ${
                  form.sequenceX.length > MAX_SEQUENCE_LENGTH
                    ? 'text-rose-400'
                    : 'text-slate-400'
                }`}
              >
                {form.sequenceX.length}/{MAX_SEQUENCE_LENGTH}
              </span>
            </div>
            <input
              id="sequence-x-input"
              type="text"
              value={form.sequenceX}
              onChange={(e) => handleFieldChange('sequenceX', e.target.value)}
              placeholder="Ex.: GATO (ou vazio para ε)"
              autoComplete="off"
              spellCheck={false}
              aria-invalid={Boolean(validation.errors.sequenceX)}
              className={`w-full rounded-lg border bg-slate-950/90 px-3.5 py-2.5 font-mono text-sm text-slate-100 placeholder-slate-500 outline-none transition-colors focus:ring-2 ${
                validation.errors.sequenceX
                  ? 'border-rose-500/80 focus:border-rose-400 focus:ring-rose-500/20'
                  : 'border-slate-700 focus:border-sky-400 focus:ring-sky-500/20'
              }`}
            />
            {validation.errors.sequenceX ? (
              <p role="alert" className="mt-1.5 text-xs text-rose-400">
                {validation.errors.sequenceX}
              </p>
            ) : form.sequenceX.length === 0 ? (
              <p className="mt-1.5 text-xs text-slate-400">
                Sequência vazia (<span className="font-mono">ε</span>) — válida para
                demonstrar casos-base.
              </p>
            ) : null}
          </div>

          {/* Botão trocar X <-> Y */}
          <div className="flex justify-center md:pt-7">
            <button
              type="button"
              onClick={handleSwapSequences}
              title="Inverter sequências X e Y"
              aria-label="Inverter sequências X e Y"
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-700 bg-slate-950/80 text-slate-300 transition-colors hover:border-slate-500 hover:bg-slate-800 hover:text-slate-100"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-4 w-4"
              >
                <path
                  d="M7 16l-4-4 4-4M3 12h18M17 8l4 4-4 4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>

          {/* Sequência Y */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label
                htmlFor="sequence-y-input"
                className="text-sm font-medium text-slate-200"
              >
                Sequência Y <span className="text-xs text-slate-400">(colunas, n)</span>
              </label>
              <span
                className={`font-mono text-xs ${
                  form.sequenceY.length > MAX_SEQUENCE_LENGTH
                    ? 'text-rose-400'
                    : 'text-slate-400'
                }`}
              >
                {form.sequenceY.length}/{MAX_SEQUENCE_LENGTH}
              </span>
            </div>
            <input
              id="sequence-y-input"
              type="text"
              value={form.sequenceY}
              onChange={(e) => handleFieldChange('sequenceY', e.target.value)}
              placeholder="Ex.: GALO (ou vazio para ε)"
              autoComplete="off"
              spellCheck={false}
              aria-invalid={Boolean(validation.errors.sequenceY)}
              className={`w-full rounded-lg border bg-slate-950/90 px-3.5 py-2.5 font-mono text-sm text-slate-100 placeholder-slate-500 outline-none transition-colors focus:ring-2 ${
                validation.errors.sequenceY
                  ? 'border-rose-500/80 focus:border-rose-400 focus:ring-rose-500/20'
                  : 'border-slate-700 focus:border-sky-400 focus:ring-sky-500/20'
              }`}
            />
            {validation.errors.sequenceY ? (
              <p role="alert" className="mt-1.5 text-xs text-rose-400">
                {validation.errors.sequenceY}
              </p>
            ) : form.sequenceY.length === 0 ? (
              <p className="mt-1.5 text-xs text-slate-400">
                Sequência vazia (<span className="font-mono">ε</span>) — válida para
                demonstrar casos-base.
              </p>
            ) : null}
          </div>
        </div>

        {/* Penalidades + Ações */}
        <div className="grid grid-cols-1 gap-4 border-t border-slate-800/80 pt-5 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
          {/* Penalidade de diferença α */}
          <div>
            <label
              htmlFor="mismatch-penalty-input"
              className="mb-1.5 block text-sm font-medium text-slate-200"
            >
              Custo de diferença{' '}
              <span className="font-mono text-amber-300">α(a ≠ b)</span>
            </label>
            <input
              id="mismatch-penalty-input"
              type="number"
              min={0}
              max={99}
              step="any"
              value={form.mismatchPenaltyText}
              onChange={(e) =>
                handleFieldChange('mismatchPenaltyText', e.target.value)
              }
              aria-invalid={Boolean(validation.errors.mismatchPenalty)}
              className={`w-full rounded-lg border bg-slate-950/90 px-3.5 py-2.5 font-mono text-sm text-slate-100 outline-none transition-colors focus:ring-2 ${
                validation.errors.mismatchPenalty
                  ? 'border-rose-500/80 focus:border-rose-400 focus:ring-rose-500/20'
                  : 'border-slate-700 focus:border-amber-400 focus:ring-amber-500/20'
              }`}
            />
            {validation.errors.mismatchPenalty ? (
              <p role="alert" className="mt-1.5 text-xs text-rose-400">
                {validation.errors.mismatchPenalty}
              </p>
            ) : (
              <p className="mt-1 text-xs text-slate-500">
                Correspondência (<span className="font-mono">a = b</span>) tem custo fixo{' '}
                <span className="font-mono text-emerald-400">0</span>.
              </p>
            )}
          </div>

          {/* Penalidade de lacuna δ */}
          <div>
            <label
              htmlFor="gap-penalty-input"
              className="mb-1.5 block text-sm font-medium text-slate-200"
            >
              Custo de lacuna <span className="font-mono text-rose-300">δ</span>
            </label>
            <input
              id="gap-penalty-input"
              type="number"
              min={0}
              max={99}
              step="any"
              value={form.gapPenaltyText}
              onChange={(e) =>
                handleFieldChange('gapPenaltyText', e.target.value)
              }
              aria-invalid={Boolean(validation.errors.gapPenalty)}
              className={`w-full rounded-lg border bg-slate-950/90 px-3.5 py-2.5 font-mono text-sm text-slate-100 outline-none transition-colors focus:ring-2 ${
                validation.errors.gapPenalty
                  ? 'border-rose-500/80 focus:border-rose-400 focus:ring-rose-500/20'
                  : 'border-slate-700 focus:border-rose-400 focus:ring-rose-500/20'
              }`}
            />
            {validation.errors.gapPenalty ? (
              <p role="alert" className="mt-1.5 text-xs text-rose-400">
                {validation.errors.gapPenalty}
              </p>
            ) : (
              <p className="mt-1 text-xs text-slate-500">
                Aplicado a cada inserção ou exclusão (<span className="font-mono">-</span>).
              </p>
            )}
          </div>

          {/* Botões de ação */}
          <div className="flex flex-wrap items-center gap-3 sm:col-span-2 lg:col-span-1 lg:pb-5">
            <button
              type="submit"
              disabled={!validation.isValid}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-sky-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500 lg:flex-initial"
            >
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-4 w-4"
                aria-hidden="true"
              >
                <path d="M8 5.14v13.72a1 1 0 0 0 1.53.85l10.6-6.86a1 1 0 0 0 0-1.7L9.53 4.29A1 1 0 0 0 8 5.14Z" />
              </svg>
              {hasActiveResult ? 'Recalcular algoritmo' : 'Iniciar algoritmo'}
            </button>

            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:border-slate-600 hover:bg-slate-800 hover:text-slate-100"
            >
              Limpar / Reiniciar
            </button>
          </div>
        </div>

        {isEmptyCase && validation.isValid && (
          <div className="rounded-lg border border-sky-500/25 bg-sky-500/10 px-4 py-2.5 text-xs text-sky-200">
            Modo de casos-base ativo: uma ou ambas as sequências estão vazias (
            <span className="font-mono">ε</span>), demonstrando diretamente{' '}
            <span className="font-mono">M[i][0] = i × δ</span> e{' '}
            <span className="font-mono">M[0][j] = j × δ</span>.
          </div>
        )}
      </form>
    </section>
  );
}
