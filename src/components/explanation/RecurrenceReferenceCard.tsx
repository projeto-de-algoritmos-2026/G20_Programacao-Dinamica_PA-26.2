export function RecurrenceReferenceCard() {
  return (
    <details className="group rounded-xl border border-slate-800 bg-slate-900/50 p-4">
      <summary className="flex cursor-pointer list-none items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-300">
        <span>Referência da Recorrência (Seção 6.6)</span>
        <span className="font-mono text-slate-500 transition-transform group-open:rotate-180">
          ▾
        </span>
      </summary>

      <div className="mt-3 space-y-2.5 border-t border-slate-800/80 pt-3 font-mono text-xs text-slate-300">
        <div>
          <p className="font-sans text-[11px] font-medium text-slate-400">
            Casos-base:
          </p>
          <p className="mt-0.5 text-slate-200">M[i][0] = i × δ</p>
          <p className="text-slate-200">M[0][j] = j × δ</p>
        </div>

        <div>
          <p className="font-sans text-[11px] font-medium text-slate-400">
            Recorrência (i &gt; 0, j &gt; 0):
          </p>
          <div className="mt-1 space-y-0.5 rounded-lg border border-slate-800 bg-slate-950/80 p-2.5 text-[11px] leading-relaxed">
            <p className="text-sky-300">M[i][j] = min(</p>
            <p className="pl-3 text-emerald-300">
              M[i-1][j-1] + α(X[i-1], Y[j-1]),
            </p>
            <p className="pl-3 text-rose-300">M[i-1][j] + δ,</p>
            <p className="pl-3 text-rose-300">M[i][j-1] + δ</p>
            <p className="text-sky-300">)</p>
          </div>
        </div>

        <p className="font-sans text-[11px] leading-relaxed text-slate-400">
          Desempate determinístico:{' '}
          <span className="font-mono text-slate-200">
            diagonal &gt; cima &gt; esquerda
          </span>
          .
        </p>
      </div>
    </details>
  );
}
