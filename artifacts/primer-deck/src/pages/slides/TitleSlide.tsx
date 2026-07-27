export default function TitleSlide() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg font-body grid-bg">
      <img
        src={`${import.meta.env.BASE_URL}primer-logo.png`}
        crossOrigin="anonymous"
        alt="Primer logo"
        className="absolute top-[5vh] left-[5vw] w-[20vw] h-auto"
      />

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

      <div className="absolute bottom-[5vh] left-[10vw] right-[5vw] flex items-center justify-end border-t border-gridline pt-[2vh] font-mono">
        <div className="flex items-center gap-[1vw]">
          <span className="text-muted text-[0.95vw] tracking-[0.08em]">
            Powered by ImpaktBio Intelligence Partners
          </span>
          <img
            src={`${import.meta.env.BASE_URL}impaktbio-logo.png`}
            crossOrigin="anonymous"
            alt="ImpaktBio logo"
            className="h-[1.8vw] w-auto"
          />
        </div>
      </div>
    </div>
  );
}
