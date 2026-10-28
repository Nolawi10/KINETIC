import { useState } from "react";
import { Activity, ArrowDownRight, ArrowRight, Check, Cpu, Crosshair, Footprints, Gauge, ScanLine, ShieldCheck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { COMBAT_METRICS, SPORT_MODES, type SportMode } from "@/lib/combat-metrics";
import { useBackendStatus, formatLandingStatus } from "@/hooks/use-backend-status";

const LOGOS = [
  ["UFC", "UFC.webp"], ["ONE Championship", "ONE championship.png"],
  ["WBC Muay Thai", "wbc muay thai logo.png"], ["IFMA", "ifma muaythai logo.png"],
  ["GLORY Kickboxing", "glory kickboxing logo png transparent.jpg"], ["K-1", "k-1 logo.jpg"],
  ["World Boxing Association", "wba boxing logo png transparent.webp"], ["The Ring", "ring magazine logo png transparent.jpg"],
  ["Submissions 101", "submissions 101 jiu jitsu logo.jpg"], ["Brazilian Jiu-Jitsu Association", "BJJA brazilian.jpg"],
] as const;

const HARDWARE = [
  { id: "01", title: "Piezo Sensor Array", icon: Zap, tag: "IMPACT INTELLIGENCE", text: "Ultra-fast strike impact measurement in Newtons. Every contact mapped into a precise surface pressure distribution.", stat: "NEWTON-PRECISE", detail: "MULTI-ZONE PRESSURE" },
  { id: "02", title: "Raspberry Pi 5 NPU", icon: Cpu, tag: "EDGE COMPUTE", text: "Local edge inference executing vision models at 60 FPS. On-device processing. Zero cloud latency.", stat: "60 FPS", detail: "LOCAL INFERENCE" },
  { id: "03", title: "Lower-Body Pose Segmentation", icon: Footprints, tag: "MOTION ANALYSIS", text: "Track footwork shifts, stance stability, and guard recovery time. Find the small movements that make the difference.", stat: "FRAME-BY-FRAME", detail: "POSE TRACKING" },
  { id: "04", title: "Combat IQ Index", icon: Gauge, tag: "PERFORMANCE SYNTHESIS", text: "Reaction latency, power, and balance. Three critical signals aggregated into a single actionable score.", stat: "ONE INDEX", detail: "TOTAL COMBAT OUTPUT" },
];

const MODULES = [
  { title: "STANCE & FOOTWORK AUDIT", kind: "footwork", icon: Footprints, subtitle: "OWN YOUR BASE.", detail: "Stance width, weight distribution, and lateral movement analysis.", tag: "MOVEMENT / BALANCE" },
  { title: "IMPACT FORCE HEATMAPS", kind: "impact", icon: Crosshair, subtitle: "MAP YOUR POWER.", detail: "Strike-by-strike force readings and surface pressure distribution.", tag: "POWER / PRECISION" },
  { title: "REACTION & COMBO DRILLS", kind: "reaction", icon: Activity, subtitle: "SHARPEN YOUR RESPONSE.", detail: "Reaction timing, combination cadence, and guard recovery analysis.", tag: "SPEED / TIMING" },
] as const;

function LogoMarquee() {
  return <section className="brand-strip" aria-label="Combat sports organizations">
    <div className="brand-rail"><span className="micro-label">THE WORLD OF COMBAT</span><span className="brand-rule" /></div>
    <div className="brand-mask"><div className="brand-track">
      {[0, 1].map((copy) => <div className="brand-group" key={copy} aria-hidden={copy === 1 ? true : undefined}>
        {LOGOS.map(([name, filename]) => <div className="brand-logo" key={name} title={name}><img src={`/logos/${encodeURIComponent(filename)}`} alt={copy === 0 ? name : ""} loading="lazy" /></div>)}
      </div>)}
    </div></div>
  </section>;
}

function SkeletonViewport() {
  return <div className="vision-viewport" role="img" aria-label="Simulated skeletal tracking of a fighter kicking, with knee angle 135 degrees, stance base 1.2 meters, and strike velocity 11.8 meters per second">
    <div className="viewport-top"><span><span className="signal-dot" /> POSE ESTIMATION</span><span>SIMULATION // 60 FPS</span></div>
    <div className="viewport-corner corner-tl" /><div className="viewport-corner corner-tr" /><div className="viewport-corner corner-bl" /><div className="viewport-corner corner-br" />
    <svg className="pose-scene" viewBox="0 0 560 410" aria-hidden="true">
      <g className="pose-floor"><path d="M40 348H520M65 318H495M105 287H455M145 257H415M185 228H375M280 210L50 385M280 210L150 385M280 210V385M280 210L410 385M280 210L510 385" /><ellipse cx="277" cy="343" rx="151" ry="36" /></g>
      <g className="pose-shadow"><path d="M276 87L261 126L243 170L270 222L292 277L269 344M261 126L306 133L332 99L353 82M243 170L204 138L185 108M270 222L330 204L393 163L438 176" /></g>
      <g className="pose-body"><circle cx="279" cy="70" r="23" /><path d="M277 93L263 125M241 121L304 133M263 125L247 188L282 215M241 121L205 142L185 108M304 133L331 101L351 83M247 188L281 181L282 215L264 222Z" /><path d="M264 222L293 278L271 343L250 350M282 215L332 205L393 164L436 177L451 171" /></g>
      <g className="pose-joints">{[[277,93],[263,125],[241,121],[304,133],[205,142],[185,108],[331,101],[351,83],[247,188],[281,181],[264,222],[282,215],[293,278],[271,343],[332,205],[393,164],[436,177]].map(([cx,cy],i) => <circle key={i} cx={cx} cy={cy} r="5" />)}</g>
      <g className="pose-guides"><path d="M332 205L374 223M332 205L375 180M354 192Q371 206 356 215M241 347H437M241 340V354M437 340V354M399 147L454 119" /><circle cx="332" cy="205" r="32" /></g>
      <g className="pose-labels"><text x="385" y="220">135°</text><text x="307" y="372">1.2 M</text><text x="398" y="107">11.8 M/S</text><text x="79" y="205">17 JOINTS</text><text x="79" y="222">TRACKED</text></g>
    </svg>
    <div className="scan-sweep" />
    <div className="viewport-readings"><span>KNEE ANGLE <strong>135°</strong></span><span>STANCE BASE <strong>1.2M</strong></span><span>STRIKE VELOCITY <strong>11.8 M/S</strong></span></div>
    <div className="viewport-bottom"><span><Crosshair size={12} /> LOWER BODY LOCKED</span><span>CONFIDENCE <strong>98.7%</strong></span></div>
  </div>;
}

function ModuleGraphic({ kind }: { kind: string }) {
  return <div className={`module-graphic module-${kind}`} aria-hidden="true">
    <svg viewBox="0 0 340 130">
      {kind === "footwork" ? <><ellipse className="graphic-muted" cx="170" cy="92" rx="100" ry="25" /><path className="graphic-line" d="M72 93H268M170 28V112M115 45L90 100M224 45L249 100" /><g className="graphic-fill"><rect x="119" y="41" width="19" height="45" rx="8" transform="rotate(-18 119 41)" /><rect x="206" y="41" width="19" height="45" rx="8" transform="rotate(18 206 41)" /></g><path className="graphic-muted" d="M130 98H213M130 93V103M213 93V103" /></> : kind === "impact" ? <><g className="heatmap-cells">{Array.from({length: 55},(_,i) => <rect key={i} x={62 + i%11*20} y={15 + Math.floor(i/11)*20} width="15" height="15" rx="2" className={Math.abs(i%11-5)+Math.abs(Math.floor(i/11)-2)<3 ? "heat-hot" : Math.abs(i%11-5)<4 ? "heat-mid" : "heat-cool"} />)}</g><path className="graphic-line" d="M170 4V125M50 62H292" /></> : <><path className="graphic-muted" d="M30 65H310M30 105H310" /><path className="graphic-line" d="M30 65H66L80 64L92 27L104 99L118 65H143L158 45L170 84L184 65H220L234 13L247 110L262 65H310" /><g className="graphic-fill"><circle cx="93" cy="27" r="4" /><circle cx="159" cy="45" r="4" /><circle cx="234" cy="13" r="4" /></g></>}
    </svg>
  </div>;
}

export function KineticLanding() {
  const [sport, setSport] = useState<SportMode>("ALL MMA");
  const [selectedModule, setSelectedModule] = useState<number | null>(null);
  const backend = useBackendStatus();
  const metrics = COMBAT_METRICS[sport];
  const activeModule = selectedModule === null ? null : MODULES[selectedModule];
  return <div className="landing-content">
    <LogoMarquee />
    <div className="landing-inner">
      <section className="sport-section" aria-label="Combat sport telemetry">
        <div className="section-meta"><span className="micro-label">ONE ENGINE. EVERY DISCIPLINE.</span><span className="micro-label"><span className="signal-dot" /> ADAPTIVE TELEMETRY</span></div>
        <div className="sport-selector" role="group" aria-label="Select combat sport">{SPORT_MODES.map(mode => <Button key={mode} variant="combatFilter" aria-pressed={sport === mode} data-active={sport === mode} onClick={() => setSport(mode)}>{mode}</Button>)}</div>
        <div className="metrics-heading"><span>{sport} // METRIC HIGHLIGHTS</span><span>SIMULATED READINGS</span></div>
        <div className="metric-grid" aria-live="polite">{metrics.map((metric,i) => <div className="metric-item" key={metric.label}><span className="metric-number">0{i+1}</span><div><span className="metric-label">{metric.label}</span><p className="metric-value">{metric.value}<span>{metric.unit}</span></p></div><Activity className="metric-icon" /></div>)}</div>
      </section>
      <section className="vision-section" id="vision">
        <div className="vision-copy"><span className="section-index">01 // BIOMECHANICAL VISION ENGINE</span><h2>EVERY MOVEMENT.<br /><span className="accent-cyan">DECODED.</span></h2><p>Your technique, beyond the naked eye. A real-time vision engine turns lower-body movement into measurable combat intelligence.</p><ul className="vision-specs"><li><Check /><div><strong>3D LEG MOVEMENT TRACKING</strong><span>Track joint trajectories through every strike.</span></div></li><li><Check /><div><strong>STANCE WIDTH CALCULATION</strong><span>Measure your base. Understand your balance.</span></div></li><li><Check /><div><strong>FOOTWORK VELOCITY DETECTION</strong><span>Quantify acceleration, pivots, and recovery.</span></div></li></ul><div className="vision-note"><ScanLine /><span>VISION + IMPACT + INTELLIGENCE</span></div></div>
        <SkeletonViewport />
      </section>
      <section className="hardware-section"><div className="section-heading"><div><span className="section-index">02 // BUILT FOR THE FIGHT</span><h2>TACTICAL HARDWARE<br /><span className="heading-muted">// SYSTEM ARCHITECTURE</span></h2></div><Cpu className="section-symbol" /></div>
        <div className="hardware-grid">{HARDWARE.map(({id,title,icon:Icon,tag,text,stat,detail}) => <article className="hardware-card" key={id}><div className="hardware-top"><span className="hardware-icon"><Icon /></span><span className="micro-label">NODE / {id}</span></div><span className="hardware-tag">{tag}</span><h3>{title}</h3><p>{text}</p><div className="hardware-bottom"><strong>{stat}</strong><span>{detail}</span></div></article>)}</div>
        <div className="architecture-note"><ShieldCheck /><span>ON-DEVICE BY DESIGN.</span><span>YOUR TRAINING. YOUR SIGNAL.</span></div>
      </section>
      <section className="modules-section" id="combat-modules"><div className="section-heading"><div><span className="section-index">03 // TRAIN WITH INTENT</span><h2>SELECT COMBAT MODULE</h2></div><span className="micro-label">03 MODULES / ONE MISSION</span></div>
        <div className="module-grid">{MODULES.map((module,i) => <Button variant="combatModule" key={module.kind} onClick={() => setSelectedModule(i)} aria-label={`Open ${module.title}`}><div className="module-top"><span className="micro-label">MODULE / 0{i+1}</span><ArrowDownRight /></div><ModuleGraphic kind={module.kind} /><div className="module-copy"><span className="module-tag">{module.tag}</span><h3>{module.title}</h3><p>{module.subtitle}</p></div><div className="module-bottom"><span>EXPLORE MODULE</span><ArrowRight /></div></Button>)}</div>
      </section>
      <section className="sync-section"><span className="section-index">THE NEXT EVOLUTION STARTS WITH YOU.</span><h2>READY TO SYNC<br />YOUR <span className="accent-cyan">TELEMETRY?</span></h2><Button variant="combatCta" onClick={() => setSelectedModule(0)}>INITIALIZE SESSION <ArrowRight /></Button><span className="sync-caption"><span className="signal-dot" /> PRECISION IS NOT AN OPTION. IT’S THE STANDARD.</span></section>
    </div>
    <footer className="tactical-footer"><div className="footer-brand">KINETIC<span>OS V2.4</span></div><span className="footer-status" data-api-state={backend.state} role="status" title={`KINETIC Flask API — ${backend.apiUrl}`}><span className="signal-dot" /> {formatLandingStatus(backend.state)}</span><nav aria-label="Social links"><a href="https://www.instagram.com/" target="_blank" rel="noreferrer" aria-label="Instagram">IG <ArrowDownRight /></a><a href="https://x.com/" target="_blank" rel="noreferrer" aria-label="X">X <ArrowDownRight /></a><a href="https://www.youtube.com/" target="_blank" rel="noreferrer" aria-label="YouTube">YT <ArrowDownRight /></a></nav><span className="footer-legal">© {new Date().getUTCFullYear()} KINETIC</span></footer>
    <Dialog open={activeModule != null} onOpenChange={open => { if (!open) setSelectedModule(null); }}><DialogContent className="session-preview"><DialogHeader><span className="section-index">SESSION PREVIEW // {sport}</span><DialogTitle>{activeModule?.title}</DialogTitle><DialogDescription>{activeModule?.detail}</DialogDescription></DialogHeader><div className="preview-status"><span className="status-light" /> HARDWARE NOT CONNECTED</div><div className="preview-metrics">{metrics.map(metric => <div key={metric.label}><span>{metric.label}</span><strong>{metric.value} {metric.unit}</strong></div>)}</div><p className="preview-note">Simulated telemetry. Connect your tracking hardware to begin a live session.</p><Button variant="outline" onClick={() => setSelectedModule(null)}>BACK TO MODULES <ArrowRight /></Button></DialogContent></Dialog>
  </div>;
}