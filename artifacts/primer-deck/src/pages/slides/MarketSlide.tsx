export default function MarketSlide() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg font-body px-[10vw] py-[9vh] flex flex-col">
      <div className="flex items-center gap-[1vw] mb-[5vh]">
        <span className="font-mono text-primary text-[1vw] tracking-[0.1em]">05</span>
        <span className="font-mono text-muted text-[1vw] tracking-[0.15em] uppercase">
          Why now
        </span>
      </div>

      <h2 className="font-display text-text text-[4.2vw] font-bold leading-[1.05] tracking-[-0.02em] m-0 mb-[7vh] max-w-[66vw] [text-wrap:balance]">
        Everyone needs these skills. Learning them is still hard.
      </h2>

      <div className="grid grid-cols-3 gap-[4vw] flex-1 content-start">
        <div>
          <div className="font-display text-primary text-[5vw] font-bold leading-none mb-[1.5vh]">
            Every field
          </div>
          <p className="text-muted text-[1.5vw] leading-[1.4] m-0">
            genomics now touches medicine, agriculture, and ecology &mdash; the demand for skills is everywhere.
          </p>
        </div>
        <div>
          <div className="font-display text-primary text-[5vw] font-bold leading-none mb-[1.5vh]">
            The gap
          </div>
          <p className="text-muted text-[1.5vw] leading-[1.4] m-0">
            far more people need to work with sequencing data than were ever formally trained to.
          </p>
        </div>
        <div>
          <div className="font-display text-primary text-[5vw] font-bold leading-none mb-[1.5vh]">
            Now
          </div>
          <p className="text-muted text-[1.5vw] leading-[1.4] m-0">
            browser compute and managed containers finally make hands-on, zero-setup learning practical.
          </p>
        </div>
      </div>

      <div className="mt-[3vh] font-mono text-muted text-[0.85vw] tracking-[0.1em] uppercase border-t border-gridline pt-[2vh]">
        Primer &mdash; The demand for bioinformatics skills is outpacing training
      </div>
    </div>
  );
}
