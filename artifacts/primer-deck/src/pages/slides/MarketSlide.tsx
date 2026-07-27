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
        Sequencing got cheap. Analysis didn&rsquo;t get easier.
      </h2>

      <div className="grid grid-cols-3 gap-[4vw] flex-1 content-start">
        <div>
          <div className="font-display text-primary text-[6vw] font-bold leading-none mb-[1.5vh]">
            &darr;99%
          </div>
          <p className="text-muted text-[1.5vw] leading-[1.4] m-0">
            fall in the cost to sequence a genome over the past two decades.
          </p>
        </div>
        <div>
          <div className="font-display text-primary text-[6vw] font-bold leading-none mb-[1.5vh]">
            10&times;
          </div>
          <p className="text-muted text-[1.5vw] leading-[1.4] m-0">
            more labs generating sequencing data than have staff who can analyze it.
          </p>
        </div>
        <div>
          <div className="font-display text-primary text-[6vw] font-bold leading-none mb-[1.5vh]">
            Now
          </div>
          <p className="text-muted text-[1.5vw] leading-[1.4] m-0">
            browser compute and managed containers finally make hosted analysis practical.
          </p>
        </div>
      </div>

      <div className="mt-[3vh] font-mono text-muted text-[0.85vw] tracking-[0.1em] uppercase border-t border-gridline pt-[2vh]">
        Primer &mdash; The gap between data and insight is widening
      </div>
    </div>
  );
}
