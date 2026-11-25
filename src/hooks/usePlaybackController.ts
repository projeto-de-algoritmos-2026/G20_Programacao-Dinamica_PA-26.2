import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  CalculationStep,
  GridCoordinate,
  SequenceAlignmentResult,
} from '../types/alignment';

export interface SpeedOption {
  label: string;
  multiplier: number;
  intervalMs: number;
}

export const SPEED_OPTIONS: readonly SpeedOption[] = [
  { label: '0.5×', multiplier: 0.5, intervalMs: 1200 },
  { label: '1×', multiplier: 1, intervalMs: 650 },
  { label: '1.5×', multiplier: 1.5, intervalMs: 400 },
  { label: '2×', multiplier: 2, intervalMs: 220 },
  { label: '4×', multiplier: 4, intervalMs: 90 },
];

export type PlaybackStatus = 'idle' | 'playing' | 'paused' | 'completed';

export interface PlaybackController {
  /** Quantidade de células já preenchidas na matriz (0..totalSteps). */
  filledStepCount: number;
  /** Total de etapas de cálculo bottom-up ((m+1) × (n+1)). */
  totalSteps: number;
  /** Etapa em foco (etapa atual ou célula já preenchida clicada pelo usuário). */
  activeStep: CalculationStep | null;
  /** Indica se a célula em foco veio de clique manual de inspeção. */
  isInspectingPreviousCell: boolean;
  /** Estado atual da reprodução automática. */
  isPlaying: boolean;
  status: PlaybackStatus;
  /** Verdadeiro quando todas as células da matriz foram calculadas. */
  isMatrixComplete: boolean;
  canStepBackward: boolean;
  canStepForward: boolean;
  speedIndex: number;
  currentSpeed: SpeedOption;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  stepForward: () => void;
  stepBackward: () => void;
  reset: () => void;
  jumpToEnd: () => void;
  seekToFilledCount: (count: number) => void;
  setSpeedIndex: (index: number) => void;
  inspectCoordinate: (coord: GridCoordinate) => void;
}

/**
 * Controla de forma estritamente determinística a navegação sobre as etapas
 * pré-computadas pelo algoritmo Sequence Alignment.
 *
 * A matriz e as decisões nunca são recalculadas durante a animação:
 * o controlador apenas move um ponteiro sobre `result.steps`.
 */
export function usePlaybackController(
  result: SequenceAlignmentResult | null,
): PlaybackController {
  const totalSteps = result?.steps.length ?? 0;

  // Quantidade de etapas preenchidas (0 = matriz limpa, totalSteps = matriz completa)
  const [filledStepCount, setFilledStepCount] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speedIndex, setSpeedIndexState] = useState<number>(1); // Padrão: 1× (650ms)
  const [inspectedStepIndex, setInspectedStepIndex] = useState<number | null>(
    null,
  );

  // Ao trocar de instância do algoritmo, reinicia na primeira etapa (M[0][0]) pausado
  useEffect(() => {
    setIsPlaying(false);
    setInspectedStepIndex(null);
    setFilledStepCount(result && result.steps.length > 0 ? 1 : 0);
  }, [result]);

  const currentSpeed = SPEED_OPTIONS[speedIndex] ?? SPEED_OPTIONS[1];
  const isMatrixComplete = totalSteps > 0 && filledStepCount >= totalSteps;

  // Loop de reprodução automática controlado por timeout determinístico
  useEffect(() => {
    if (!isPlaying || !result) return;

    if (filledStepCount >= totalSteps) {
      setIsPlaying(false);
      return;
    }

    const timerId = window.setTimeout(() => {
      setInspectedStepIndex(null);
      setFilledStepCount((prev) => {
        const next = Math.min(prev + 1, totalSteps);
        if (next >= totalSteps) {
          setIsPlaying(false);
        }
        return next;
      });
    }, currentSpeed.intervalMs);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [isPlaying, result, filledStepCount, totalSteps, currentSpeed.intervalMs]);

  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const play = useCallback(() => {
    if (!result || totalSteps === 0) return;
    setInspectedStepIndex(null);
    setFilledStepCount((prev) => {
      // Se já estava no fim, recomeça a partir da etapa 1
      if (prev >= totalSteps) return 1;
      // Se estava limpo (0), avança imediatamente para a etapa 1
      if (prev === 0) return 1;
      return prev;
    });
    if (totalSteps > 1) {
      setIsPlaying(true);
    }
  }, [result, totalSteps]);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, pause, play]);

  const stepForward = useCallback(() => {
    if (!result || totalSteps === 0) return;
    setIsPlaying(false);
    setInspectedStepIndex(null);
    setFilledStepCount((prev) => Math.min(prev + 1, totalSteps));
  }, [result, totalSteps]);

  const stepBackward = useCallback(() => {
    if (!result || totalSteps === 0) return;
    setIsPlaying(false);
    setInspectedStepIndex(null);
    setFilledStepCount((prev) => Math.max(prev - 1, 0));
  }, [result, totalSteps]);

  const reset = useCallback(() => {
    setIsPlaying(false);
    setInspectedStepIndex(null);
    setFilledStepCount(0);
  }, []);

  const jumpToEnd = useCallback(() => {
    if (!result || totalSteps === 0) return;
    setIsPlaying(false);
    setInspectedStepIndex(null);
    setFilledStepCount(totalSteps);
  }, [result, totalSteps]);

  const seekToFilledCount = useCallback(
    (count: number) => {
      if (!result || totalSteps === 0) return;
      setIsPlaying(false);
      setInspectedStepIndex(null);
      const clamped = Math.max(0, Math.min(Math.round(count), totalSteps));
      setFilledStepCount(clamped);
    },
    [result, totalSteps],
  );

  const setSpeedIndex = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(index, SPEED_OPTIONS.length - 1));
    setSpeedIndexState(clamped);
  }, []);

  const inspectCoordinate = useCallback(
    (coord: GridCoordinate) => {
      if (!result) return;
      const found = result.steps.find(
        (step) => step.row === coord.row && step.col === coord.col,
      );
      if (!found || found.stepIndex >= filledStepCount) return;
      setIsPlaying(false);
      setInspectedStepIndex(found.stepIndex);
    },
    [result, filledStepCount],
  );

  const activeStep = useMemo<CalculationStep | null>(() => {
    if (!result || filledStepCount === 0) return null;
    if (
      inspectedStepIndex !== null &&
      inspectedStepIndex >= 0 &&
      inspectedStepIndex < filledStepCount
    ) {
      return result.steps[inspectedStepIndex] ?? null;
    }
    return result.steps[filledStepCount - 1] ?? null;
  }, [result, filledStepCount, inspectedStepIndex]);

  const isInspectingPreviousCell =
    inspectedStepIndex !== null && inspectedStepIndex !== filledStepCount - 1;

  const status: PlaybackStatus = useMemo(() => {
    if (isPlaying) return 'playing';
    if (isMatrixComplete) return 'completed';
    if (filledStepCount === 0) return 'idle';
    return 'paused';
  }, [isPlaying, isMatrixComplete, filledStepCount]);

  return {
    filledStepCount,
    totalSteps,
    activeStep,
    isInspectingPreviousCell,
    isPlaying,
    status,
    isMatrixComplete,
    canStepBackward: filledStepCount > 0,
    canStepForward: filledStepCount < totalSteps,
    speedIndex,
    currentSpeed,
    play,
    pause,
    togglePlay,
    stepForward,
    stepBackward,
    reset,
    jumpToEnd,
    seekToFilledCount,
    setSpeedIndex,
    inspectCoordinate,
  };
}
