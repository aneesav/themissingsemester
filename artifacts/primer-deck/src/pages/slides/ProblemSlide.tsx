export default function ProblemSlide() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg font-body px-[10vw] py-[9vh] flex flex-col">
      <div className="flex items-center gap-[1vw] mb-[5vh]">
        <span className="font-mono text-primary text-[1vw] tracking-[0.1em]">01</span>
        <span className="font-mono text-muted text-[1vw] tracking-[0.15em] uppercase">
          The problem
        </span>
      </div>

      <h2 className="font-display text-text text-[4.2vw] font-bold leading-[1.05] tracking-[-0.02em] m-0 mb-[6vh] max-w-[72vw] [text-wrap:balance]">
        Learning bioinformatics means fighting your computer first.
      </h2>

      <div className="grid grid-cols-3 gap-[3vw]">
        <div className="border-t-2 border-text pt-[2.5vh]">
          <div className="font-display text-text text-[3.4vw] font-bold leading-none mb-[1.5vh]">
            Days
          </div>
          <p className="text-muted text-[1.5vw] leading-[1.4] m-0">
            spent installing tools, dependencies, and environments before the
            first lesson even begins.
          </p>
        </div>
        <div className="border-t-2 border-text pt-[2.5vh]">
          <div className="font-display text-text text-[3.4vw] font-bold leading-none mb-[1.5vh]">
            CLI wall
          </div>
          <p className="text-muted text-[1.5vw] leading-[1.4] m-0">
            most courses assume a working command line, shutting out curious
            beginners on day one.
          </p>
        </div>
        <div className="border-t-2 border-text pt-[2.5vh]">
          <div className="font-display text-text text-[3.4vw] font-bold leading-none mb-[1.5vh]">
            Give up
          </div>
          <p className="text-muted text-[1.5vw] leading-[1.4] m-0">
            learners quit before they ever run real code &mdash; the setup, not
            the science, defeats them.
          </p>
        </div>
      </div>

      <div className="absolute bottom-[6vh] left-[10vw] right-[10vw] font-mono text-muted text-[0.85vw] tracking-[0.1em] uppercase border-t border-gridline pt-[2vh]">
        Primer &mdash; The problem
      </div>
    </div>
  );
}
