import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  GridCoordinate,
  SequenceAlignmentResult,
  TracebackStep,
} from '../types/alignment';

export interface TracebackController {
  /** Quantidade de transições de traceback já reveladas (0..totalTracebackSteps). */
  revealedCount: number;
  totalTracebackSteps: number;
  /** Verdadeiro quando o usuário iniciou ou concluiu a visualização da reconstrução. */
  isTracebackActive: boolean;
  isPlaying: boolean;
  isComplete: boolean;
  canStepBackward: boolean;
  canStepForward: boolean;
  /** Passos de traceback já revelados (de (m, n) em direção a (0, 0)). */
  revealedSteps: readonly TracebackStep[];
  /** Último passo de traceback executado (para explicação textual). */
  currentStep: TracebackStep | null;
  /** Coordenada atual do ponteiro de retrocesso na matriz DP. */
  currentCoord: GridCoordinate | null;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  stepForward: () => void;
  stepBackward: () => void;
  reset: () => void;
  showAll: () => void;
}

/**
 * Controla de forma determinística a reconstrução passo a passo (traceback)
 * a partir de (m, n) até (0, 0) sobre `result.alignment.tracebackSteps`.
 */
export function useTracebackController(
  result: SequenceAlignmentResult | null,
  isMatrixComplete: boolean,
  intervalMs: number,
): TracebackController {
  const totalTracebackSteps = result?.alignment.tracebackSteps.length ?? 0;

  const [revealedCount, setRevealedCount] = useState<number>(0);
  const [hasStarted, setHasStarted] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Reseta a reconstrução ao trocar a instância ou se a matriz deixar de estar completa
  useEffect(() => {
    setIsPlaying(false);
    setRevealedCount(0);
    setHasStarted(false);
  }, [result, isMatrixComplete]);

  // Reprodução automática passo a passo do traceback
  useEffect(() => {
    if (!isPlaying || !result || !isMatrixComplete) return;

    if (revealedCount >= totalTracebackSteps) {
      setIsPlaying(false);
      return;
    }

    const timerId = window.setTimeout(() => {
      setRevealedCount((prev) => {
        const next = Math.min(prev + 1, totalTracebackSteps);
        if (next >= totalTracebackSteps) {
          setIsPlaying(false);
        }
        return next;
      });
    }, intervalMs);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [isPlaying, result, isMatrixComplete, revealedCount, totalTracebackSteps, intervalMs]);

  const pause = useCallback(() => {
    setIsPlaying(false);
  }, []);

  const play = useCallback(() => {
    if (!result || !isMatrixComplete) return;
    setHasStarted(true);
    if (totalTracebackSteps === 0) {
      setRevealedCount(0);
      return;
    }
    setRevealedCount((prev) => (prev >= totalTracebackSteps ? 1 : Math.max(prev, 1)));
    if (totalTracebackSteps > 1) {
      setIsPlaying(true);
    }
  }, [result, isMatrixComplete, totalTracebackSteps]);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, pause, play]);

  const stepForward = useCallback(() => {
    if (!result || !isMatrixComplete) return;
    setIsPlaying(false);
    setHasStarted(true);
    setRevealedCount((prev) => Math.min(prev + 1, totalTracebackSteps));
  }, [result, isMatrixComplete, totalTracebackSteps]);

  const stepBackward = useCallback(() => {
    if (!result || !isMatrixComplete) return;
    setIsPlaying(false);
    setRevealedCount((prev) => {
      const next = Math.max(prev - 1, 0);
      if (next === 0) {
        setHasStarted(false);
      }
      return next;
    });
  }, [result, isMatrixComplete]);

  const reset = useCallback(() => {
    setIsPlaying(false);
    setRevealedCount(0);
    setHasStarted(false);
  }, []);

  const showAll = useCallback(() => {
    if (!result || !isMatrixComplete) return;
    setIsPlaying(false);
    setHasStarted(true);
    setRevealedCount(totalTracebackSteps);
  }, [result, isMatrixComplete, totalTracebackSteps]);

  const isTracebackActive =
    isMatrixComplete && (hasStarted || revealedCount > 0);

  const isComplete =
    isMatrixComplete &&
    (totalTracebackSteps === 0
      ? hasStarted
      : revealedCount >= totalTracebackSteps);

  const revealedSteps = useMemo<readonly TracebackStep[]>(() => {
    if (!result || !isTracebackActive) return [];
    return result.alignment.tracebackSteps.slice(0, revealedCount);
  }, [result, isTracebackActive, revealedCount]);

  const currentStep = useMemo<TracebackStep | null>(() => {
    if (revealedSteps.length === 0) return null;
    return revealedSteps[revealedSteps.length - 1] ?? null;
  }, [revealedSteps]);

  const currentCoord = useMemo<GridCoordinate | null>(() => {
    if (!result || !isTracebackActive) return null;
    return result.alignment.path[revealedCount] ?? null;
  }, [result, isTracebackActive, revealedCount]);

  return {
    revealedCount,
    totalTracebackSteps,
    isTracebackActive,
    isPlaying,
    isComplete,
    canStepBackward: isTracebackActive && revealedCount > 0,
    canStepForward: isMatrixComplete && revealedCount < totalTracebackSteps,
    revealedSteps,
    currentStep,
    currentCoord,
    play,
    pause,
    togglePlay,
    stepForward,
    stepBackward,
    reset,
    showAll,
  };
}
