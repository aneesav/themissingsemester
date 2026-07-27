export default function ArchitectureSlide() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg font-body px-[10vw] py-[9vh] flex flex-col grid-bg">
      <div className="flex items-center gap-[1vw] mb-[4vh]">
        <span className="font-mono text-primary text-[1vw] tracking-[0.1em]">04</span>
        <span className="font-mono text-muted text-[1vw] tracking-[0.15em] uppercase">
          Under the hood
        </span>
      </div>

      <h2 className="font-display text-text text-[4.2vw] font-bold leading-[1.05] tracking-[-0.02em] m-0 mb-[6vh] max-w-[64vw]">
        Isolated environments, spun up per learner.
      </h2>

      <div className="flex items-stretch gap-[1.5vw] mb-[5vh]">
        <div className="flex-1 bg-bg border border-text px-[1.8vw] py-[3vh] text-center">
          <div className="font-mono text-primary text-[0.9vw] tracking-[0.1em] mb-[1.5vh]">CLIENT</div>
          <div className="font-display text-text text-[1.7vw] font-semibold">Browser</div>
        </div>
        <div className="flex items-center font-display text-muted text-[2vw]">&rarr;</div>
        <div className="flex-1 bg-bg border border-text px-[1.8vw] py-[3vh] text-center">
          <div className="font-mono text-primary text-[0.9vw] tracking-[0.1em] mb-[1.5vh]">CONTROL</div>
          <div className="font-display text-text text-[1.7vw] font-semibold">API server</div>
        </div>
        <div className="flex items-center font-display text-muted text-[2vw]">&rarr;</div>
        <div className="flex-1 bg-primary px-[1.8vw] py-[3vh] text-center">
          <div className="font-mono text-text/70 text-[0.9vw] tracking-[0.1em] mb-[1.5vh]">COMPUTE</div>
          <div className="font-display text-text text-[1.7vw] font-semibold">Lesson session</div>
        </div>
        <div className="flex items-center font-display text-muted text-[2vw]">&rarr;</div>
        <div className="flex-1 bg-bg border border-text px-[1.8vw] py-[3vh] text-center">
          <div className="font-mono text-primary text-[0.9vw] tracking-[0.1em] mb-[1.5vh]">STORAGE</div>
          <div className="font-display text-text text-[1.7vw] font-semibold">Object store</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-[3vw]">
        <div>
          <div className="font-display text-text text-[1.8vw] font-semibold mb-[1vh]">On-demand</div>
          <p className="text-muted text-[1.4vw] leading-[1.4] m-0">
            Each lesson runs in its own container, launched only when a learner opens it.
          </p>
        </div>
        <div>
          <div className="font-display text-text text-[1.8vw] font-semibold mb-[1vh]">Isolated</div>
          <p className="text-muted text-[1.4vw] leading-[1.4] m-0">
            Every learner gets a clean, sandboxed workspace &mdash; no shared state, no setup.
          </p>
        </div>
        <div>
          <div className="font-display text-text text-[1.8vw] font-semibold mb-[1vh]">Elastic</div>
          <p className="text-muted text-[1.4vw] leading-[1.4] m-0">
            Sessions scale to the work and tear down when the learner is done.
          </p>
        </div>
      </div>
    </div>
  );
}
