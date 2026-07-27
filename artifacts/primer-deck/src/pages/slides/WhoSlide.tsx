export default function WhoSlide() {
  return (
    <div className="w-screen h-screen overflow-hidden relative bg-text font-body px-[10vw] py-[9vh] flex flex-col">
      <div className="flex items-center gap-[1vw] mb-[5vh]">
        <span className="font-mono text-accent text-[1vw] tracking-[0.1em]">06</span>
        <span className="font-mono text-bg/60 text-[1vw] tracking-[0.15em] uppercase">
          Who it&rsquo;s for
        </span>
      </div>

      <h2 className="font-display text-bg text-[4.2vw] font-bold leading-[1.05] tracking-[-0.02em] m-0 mb-[7vh] max-w-[60vw]">
        Built for learners, not sysadmins.
      </h2>

      <div className="grid grid-cols-2 gap-[4vw] flex-1">
        <div className="border-t-2 border-accent pt-[3vh]">
          <div className="font-display text-bg text-[2.4vw] font-semibold mb-[2vh]">
            Students
          </div>
          <p className="text-bg/70 text-[1.6vw] leading-[1.5] m-0">
            Undergrads and grad students meeting bioinformatics for the first
            time &mdash; learning the science without wrestling a toolchain into
            place.
          </p>
        </div>
        <div className="border-t-2 border-primary pt-[3vh]">
          <div className="font-display text-bg text-[2.4vw] font-semibold mb-[2vh]">
            Researchers &amp; self-learners
          </div>
          <p className="text-bg/70 text-[1.6vw] leading-[1.5] m-0">
            Scientists who want to pick up computational skills for their own
            work, at their own pace, without a formal course or a support
            queue.
          </p>
        </div>
      </div>
    </div>
  );
}
