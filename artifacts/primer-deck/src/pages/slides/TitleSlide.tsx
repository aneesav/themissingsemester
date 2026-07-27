export default function TitleSlide() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg font-body grid-bg">
      <div className="absolute top-[5vh] left-[5vw] flex gap-[0.5vw]">
        <div className="w-[1.4vw] h-[3vw] bg-accent" />
        <div className="w-[1.4vw] h-[3vw] bg-primary" />
      </div>

      <div className="absolute top-[5.5vh] right-[5vw] text-right font-mono">
        <div className="text-primary text-[0.9vw] font-medium uppercase tracking-[0.15em] mb-[0.5vh]">
          Primer
        </div>
        <div className="text-muted text-[0.8vw] uppercase tracking-[0.15em]">
          Beta / 2026
        </div>
      </div>

      <div className="absolute bottom-[12vh] left-[10vw] max-w-[70vw]">
        <div className="font-mono text-primary text-[1.1vw] font-medium tracking-[0.05em] mb-[3vh] uppercase">
          Zero-setup bioinformatics for bench scientists
        </div>
        <h1 className="font-display text-text text-[9vw] font-bold leading-[0.95] tracking-[-0.03em] m-0 mb-[3vh]">
          Primer
        </h1>
        <p className="text-muted text-[1.9vw] font-normal leading-[1.4] max-w-[52vw] m-0 [text-wrap:pretty]">
          Run real analyses from your browser. No installs, no command line,
          no cluster queue &mdash; just your data and a result.
        </p>
      </div>

      <div className="absolute bottom-[5vh] left-[10vw] right-[5vw] flex items-center justify-between border-t border-gridline pt-[2vh] font-mono">
        <span className="text-muted text-[0.85vw] tracking-[0.1em] uppercase">
          Seed pitch
        </span>
        <span className="text-text text-[0.85vw] tracking-[0.1em] uppercase">
          primer.bio
        </span>
      </div>
    </div>
  );
}
