import { useRef, useState } from "react";
import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion";
import { francisPortrait as francis, israelPortrait as israel, johnnyPortrait as johnny } from "@/lib/media-assets";

const FIGHTERS = [
  { id: "francis", name: "FRANCIS", src: francis.url, tone: "cyan", division: "HEAVYWEIGHT", stats: [["FORCE IDX", "98.4"], ["REACH", "83\""], ["IMPACT", "129 PSI"]] },
  { id: "israel", name: "ISRAEL", src: israel.url, tone: "red", division: "MIDDLEWEIGHT", stats: [["VELOCITY", "11.2 M/S"], ["EVASION", "71%"], ["PRECISION", "96.1"]] },
  { id: "johnny", name: "JOHNNY", src: johnny.url, tone: "amber", division: "WELTERWEIGHT · BJJ", stats: [["GRAPPLING", "96.8"], ["SUB RATE", "64%"], ["CONTROL", "18:42"]] },
] as const;

export function KineticHero() {
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.25]);
  const fighterY = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const wordY = useTransform(scrollYProgress, [0, 1], [0, 320]);
  const copyY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const f = FIGHTERS[index] ?? FIGHTERS[0];

  const pick = (i: number) => { if (i === index) return; setDir(i > index ? 1 : -1); setIndex(i); };

  return (
    <section ref={ref} className="hero" data-tone={f.tone}>
      <motion.div className="hero-word" style={{ y: wordY }} aria-hidden="true">KINETIC</motion.div>

      <motion.div className="hero-copy" style={{ y: copyY }}>
        <p className="hero-kicker"><span className="status-light" /> TELEMETRY V2.4 // COMBAT ACADEMY</p>
        <h1 className="hero-title">
          <span className="accent-cyan">KINETIC</span><br />COMBAT<br /><span className="accent-red">ACADEMY</span>
        </h1>
        <p className="hero-sub">AI-Powered Precision Telemetry &amp; Strike Analysis</p>
        <button className="hero-cta" type="button">INITIALIZE SESSION <span aria-hidden="true">→</span></button>
      </motion.div>

      <div className="hero-stage">
        <motion.div className="hero-glow" key={f.tone} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }} />
        <motion.div className="hero-fighter-wrap" style={{ scale, y: fighterY }}>
          <AnimatePresence mode="popLayout" custom={dir} initial={false}>
            <motion.img
              key={f.id}
              src={f.src}
              alt={`${f.name} — ${f.division} champion`}
              className="hero-fighter"
              custom={dir}
              variants={{
                enter: (d: number) => ({ opacity: 0, x: 80 * d, filter: "blur(6px)" }),
                center: { opacity: 1, x: 0, filter: "blur(0px)" },
                exit: (d: number) => ({ opacity: 0, x: -80 * d, filter: "blur(6px)" }),
              }}
              initial="enter" animate="center" exit="exit"
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            />
          </AnimatePresence>
        </motion.div>

        <div className="hero-hud">
          <p className="hud-label">{f.division} // ACTIVE PROFILE</p>
          {f.stats.map(([k, v]) => (<div key={k} className="hud-row"><span>{k}</span><strong>{v}</strong></div>))}
        </div>
      </div>

      <div className="hero-switch" role="tablist" aria-label="Select champion">
        {FIGHTERS.map((x, i) => (
          <button key={x.id} role="tab" aria-selected={i === index} data-active={i === index} data-tone={x.tone} onClick={() => pick(i)}>{x.name}</button>
        ))}
      </div>

      <div className="hero-foot">
        <div className="hero-pages">
          <span className="page-current">K / 0{index + 1}</span>
          <span className="page-bar"><motion.span animate={{ x: `${(index / (FIGHTERS.length - 1)) * 100}%` }} /></span>
          <span>0{FIGHTERS.length}</span>
        </div>
        <div className="hero-social"><span>IG</span><span>X</span><span>YT</span></div>
        <div className="hero-live"><span className="live-dot" /> LIVE TELEMETRY · 240 HZ</div>
      </div>
    </section>
  );
}
