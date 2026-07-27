export default function HowItWorksSlide() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg font-body px-[10vw] py-[9vh] flex flex-col">
      <div className="flex items-center gap-[1vw] mb-[4vh]">
        <span className="font-mono text-primary text-[1vw] tracking-[0.1em]">03</span>
        <span className="font-mono text-muted text-[1vw] tracking-[0.15em] uppercase">
          How it works
        </span>
      </div>

      <h2 className="font-display text-text text-[4.2vw] font-bold leading-[1.05] tracking-[-0.02em] m-0 mb-[7vh] max-w-[62vw]">
        Three steps from zero to running code.
      </h2>

      <div className="grid grid-cols-3 gap-[2.5vw] flex-1">
        <div className="flex flex-col">
          <div className="font-display text-accent text-[5vw] font-bold leading-none mb-[2vh]">01</div>
          <div className="h-[0.4vh] w-full bg-gridline mb-[3vh]" />
          <div className="font-display text-text text-[2.2vw] font-semibold mb-[1.5vh]">Open</div>
          <p className="text-muted text-[1.5vw] leading-[1.4] m-0">
            Pick a lesson. Primer provisions a live environment preloaded with
            the tools and data you need.
          </p>
        </div>
        <div className="flex flex-col">
          <div className="font-display text-accent text-[5vw] font-bold leading-none mb-[2vh]">02</div>
          <div className="h-[0.4vh] w-full bg-gridline mb-[3vh]" />
          <div className="font-display text-text text-[2.2vw] font-semibold mb-[1.5vh]">Run</div>
          <p className="text-muted text-[1.5vw] leading-[1.4] m-0">
            Work through interactive exercises and run real bioinformatics code
            straight from the browser.
          </p>
        </div>
        <div className="flex flex-col">
          <div className="font-display text-primary text-[5vw] font-bold leading-none mb-[2vh]">03</div>
          <div className="h-[0.4vh] w-full bg-primary mb-[3vh]" />
          <div className="font-display text-text text-[2.2vw] font-semibold mb-[1.5vh]">Learn</div>
          <p className="text-muted text-[1.5vw] leading-[1.4] m-0">
            See results instantly, iterate, and build skills you can carry into
            your own research.
          </p>
        </div>
      </div>

      <div className="mt-[4vh] font-mono text-muted text-[0.85vw] tracking-[0.1em] uppercase border-t border-gridline pt-[2vh]">
        Primer &mdash; Open / Run / Learn
      </div>
    </div>
  );
}
