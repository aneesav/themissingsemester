export default function ClosingSlide() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-bg font-body grid-bg flex flex-col justify-center px-[10vw]">
      <div className="flex gap-[0.5vw] mb-[5vh]">
        <div className="w-[1.4vw] h-[3vw] bg-accent" />
        <div className="w-[1.4vw] h-[3vw] bg-primary" />
      </div>

      <h2 className="font-display text-text text-[6vw] font-bold leading-[1.02] tracking-[-0.03em] m-0 mb-[3vh] max-w-[74vw] [text-wrap:balance]">
        Give every scientist their own bioinformatician.
      </h2>

      <p className="text-muted text-[1.9vw] leading-[1.4] max-w-[54vw] m-0 mb-[7vh] [text-wrap:pretty]">
        We&rsquo;re opening the beta to labs generating sequencing data today.
        Bring a dataset &mdash; we&rsquo;ll get you to a result in an afternoon.
      </p>

      <div className="flex items-center justify-between border-t border-gridline pt-[2.5vh] font-mono max-w-[80vw]">
        <span className="text-text text-[1.1vw] tracking-[0.1em]">impaktbio.com</span>
        <span className="text-muted text-[1.1vw] tracking-[0.1em]">info@impaktbio.com</span>
        <span className="text-primary text-[1.1vw] tracking-[0.1em] uppercase">
          Join the beta
        </span>
      </div>
    </div>
  );
}
