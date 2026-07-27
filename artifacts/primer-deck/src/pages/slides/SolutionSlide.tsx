export default function SolutionSlide() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-text font-body px-[10vw] py-[9vh] flex flex-col justify-center">
      <div className="flex items-center gap-[1vw] mb-[4vh]">
        <span className="font-mono text-accent text-[1vw] tracking-[0.1em]">02</span>
        <span className="font-mono text-bg/60 text-[1vw] tracking-[0.15em] uppercase">
          The solution
        </span>
      </div>

      <h2 className="font-display text-bg text-[5vw] font-bold leading-[1.05] tracking-[-0.02em] m-0 mb-[4vh] max-w-[70vw] [text-wrap:balance]">
        A full course that opens in a
        <span className="text-primary"> browser tab</span>.
      </h2>

      <p className="text-bg/70 text-[1.9vw] leading-[1.4] max-w-[58vw] m-0 mb-[6vh] [text-wrap:pretty]">
        Primer runs an interactive bioinformatics curriculum in a ready-to-go
        environment. Open a lesson, run real code against real data, and learn
        by doing &mdash; the setup disappears behind the tab.
      </p>

      <div className="flex gap-[2vw] font-mono">
        <div className="flex-1 bg-bg/5 border border-bg/15 px-[2vw] py-[3vh]">
          <div className="text-accent text-[1vw] mb-[1vh] tracking-[0.1em]">NO SETUP</div>
          <div className="text-bg text-[1.5vw] leading-[1.3]">Nothing to install</div>
        </div>
        <div className="flex-1 bg-bg/5 border border-bg/15 px-[2vw] py-[3vh]">
          <div className="text-accent text-[1vw] mb-[1vh] tracking-[0.1em]">HANDS-ON</div>
          <div className="text-bg text-[1.5vw] leading-[1.3]">Real code, real data</div>
        </div>
        <div className="flex-1 bg-bg/5 border border-bg/15 px-[2vw] py-[3vh]">
          <div className="text-accent text-[1vw] mb-[1vh] tracking-[0.1em]">GUIDED</div>
          <div className="text-bg text-[1.5vw] leading-[1.3]">Lessons, not commands</div>
        </div>
      </div>
    </div>
  );
}
