export function Header() {
  return (
    <header className="border-b border-slate-800/80 bg-slate-900/70 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-3">
          <div
            aria-hidden="true"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-sky-500/30 bg-sky-500/10 text-sky-400"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              className="h-5 w-5"
            >
              <rect x="3" y="3" width="7" height="7" rx="1.2" />
              <rect x="14" y="3" width="7" height="7" rx="1.2" />
              <rect x="3" y="14" width="7" height="7" rx="1.2" />
              <rect
                x="14"
                y="14"
                width="7"
                height="7"
                rx="1.2"
                className="fill-sky-400/25"
              />
              <path d="M10 10l4 4" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-50">
              StringMatch Visualizer
            </h1>
            <p className="text-sm text-slate-400">
              Sequence Alignment • Programação Dinâmica Bottom-Up
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full border border-slate-700 bg-slate-800/80 px-3 py-1 font-mono text-slate-300">
            Tempo O(m × n) • Espaço O(m × n)
          </span>
          <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 font-medium text-sky-300">
            UnB / FGA • Projeto de Algoritmos
          </span>
        </div>
      </div>
    </header>
  );
}
