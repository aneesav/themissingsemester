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
        The people who generate the data can&rsquo;t analyze it.
      </h2>

      <div className="grid grid-cols-3 gap-[3vw]">
        <div className="border-t-2 border-text pt-[2.5vh]">
          <div className="font-display text-text text-[3.4vw] font-bold leading-none mb-[1.5vh]">
            Days
          </div>
          <p className="text-muted text-[1.5vw] leading-[1.4] m-0">
            lost setting up environments, dependencies, and Docker before a
            single line of analysis runs.
          </p>
        </div>
        <div className="border-t-2 border-text pt-[2.5vh]">
          <div className="font-display text-text text-[3.4vw] font-bold leading-none mb-[1.5vh]">
            1 expert
          </div>
          <p className="text-muted text-[1.5vw] leading-[1.4] m-0">
            per lab becomes the bottleneck &mdash; every sequencing run waits in
            their queue.
          </p>
        </div>
        <div className="border-t-2 border-text pt-[2.5vh]">
          <div className="font-display text-text text-[3.4vw] font-bold leading-none mb-[1.5vh]">
            CLI wall
          </div>
          <p className="text-muted text-[1.5vw] leading-[1.4] m-0">
            command-line tools shut out the biologists who understand the
            experiment best.
          </p>
        </div>
      </div>

      <div className="absolute bottom-[6vh] left-[10vw] right-[10vw] font-mono text-muted text-[0.85vw] tracking-[0.1em] uppercase border-t border-gridline pt-[2vh]">
        Primer &mdash; The problem
      </div>
    </div>
  );
}
