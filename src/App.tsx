import { useEffect, useMemo, useState } from 'react';
import { computeSequenceAlignment } from './algorithm';
import { AlignmentReconstructionPanel } from './components/alignment/AlignmentReconstructionPanel';
import { PlaybackControls } from './components/controls/PlaybackControls';
import { DecisionExplanationPanel } from './components/explanation/DecisionExplanationPanel';
import { RecurrenceReferenceCard } from './components/explanation/RecurrenceReferenceCard';
import { SequenceInputPanel } from './components/input/SequenceInputPanel';
import type { ValidatedAlignmentParams } from './components/input/validation';
import { Header } from './components/layout/Header';
import { DPMatrix } from './components/matrix/DPMatrix';
import { usePlaybackController } from './hooks/usePlaybackController';
import { useTracebackController } from './hooks/useTracebackController';
import type {
  GridCoordinate,
  SequenceAlignmentResult,
} from './types/alignment';

export default function App() {
  const [result, setResult] = useState<SequenceAlignmentResult | null>(null);
  const playback = usePlaybackController(result);
  const traceback = useTracebackController(
    result,
    playback.isMatrixComplete,
    playback.currentSpeed.intervalMs,
  );

  const handleStart = (params: ValidatedAlignmentParams) => {
    const computed = computeSequenceAlignment({
      sequenceX: params.sequenceX,
      sequenceY: params.sequenceY,
      penalties: params.penalties,
    });
    setResult(computed);
  };

  const handleReset = () => {
    setResult(null);
  };

  // Clicar em uma célula durante o traceback pausa o traceback e inspeciona a célula no painel lateral
  const handleSelectMatrixCell = (coord: GridCoordinate) => {
    traceback.pause();
    playback.inspectCoordinate(coord);
  };

  // Sincroniza o painel explicativo com a célula do traceback durante a reconstrução
  const displayedStep = useMemo(() => {
    if (!result) return null;
    if (
      traceback.isTracebackActive &&
      !playback.isInspectingPreviousCell &&
      traceback.currentStep
    ) {
      const { row, col } = traceback.currentStep.current;
      return (
        result.steps.find((step) => step.row === row && step.col === col) ??
        playback.activeStep
      );
    }
    return playback.activeStep;
  }, [
    result,
    traceback.isTracebackActive,
    traceback.currentStep,
    playback.isInspectingPreviousCell,
    playback.activeStep,
  ]);

  const { togglePlay, stepForward, stepBackward, reset } = playback;

  // Atalhos de teclado (ativos apenas quando o foco não está em campos ou botões)
  useEffect(() => {
    if (!result) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        return;
      }

      if (event.code === 'Space') {
        if (tag === 'BUTTON') return;
        event.preventDefault();
        togglePlay();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        stepForward();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        stepBackward();
      } else if (event.key === 'Home') {
        event.preventDefault();
        reset();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [result, togglePlay, stepForward, stepBackward, reset]);

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <Header />

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-6 py-8">
        <SequenceInputPanel
          onStart={handleStart}
          onReset={handleReset}
          hasActiveResult={result !== null}
        />

        {result ? (
          <>
            <PlaybackControls
              controller={playback}
              minCost={result.minCost}
              rows={result.rows}
              cols={result.cols}
            />

            <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
              <DPMatrix
                result={result}
                filledStepCount={playback.filledStepCount}
                activeStep={playback.activeStep}
                onSelectCell={handleSelectMatrixCell}
                tracebackSteps={traceback.revealedSteps}
                tracebackCurrentCoord={traceback.currentCoord}
                isTracebackActive={traceback.isTracebackActive}
              />

              <div className="flex flex-col gap-4">
                <DecisionExplanationPanel
                  step={displayedStep}
                  penalties={result.penalties}
                  totalSteps={playback.totalSteps}
                />
                <RecurrenceReferenceCard />
              </div>
            </div>

            <AlignmentReconstructionPanel
              result={result}
              isMatrixComplete={playback.isMatrixComplete}
              traceback={traceback}
              onJumpToMatrixEnd={playback.jumpToEnd}
            />
          </>
        ) : (
          <section className="rounded-xl border border-dashed border-slate-800 bg-slate-900/30 p-8 text-center">
            <p className="text-sm text-slate-400">
              Selecione um exemplo ou digite as sequências{' '}
              <span className="font-mono text-slate-200">X</span> e{' '}
              <span className="font-mono text-slate-200">Y</span> e clique em{' '}
              <span className="font-medium text-sky-300">Iniciar algoritmo</span>{' '}
              para executar a matriz de Programação Dinâmica passo a passo.
            </p>
          </section>
        )}
      </main>

      <footer className="border-t border-slate-900 bg-slate-950/80 py-4 text-center text-xs text-slate-500">
        StringMatch Visualizer • UnB / FGA — Engenharia de Software • Projeto de
        Algoritmos (Módulo 4 — Programação Dinâmica) • Kleinberg &amp; Tardos,
        Seções 6.6 e 6.7
      </footer>
    </div>
  );
}
