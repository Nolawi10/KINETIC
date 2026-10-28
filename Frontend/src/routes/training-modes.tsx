import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Activity, ArrowUpRight, Crosshair, Footprints, Shield, Swords, Zap } from "lucide-react";
import { KineticNavigation } from "@/components/kinetic-navigation";
import { CoachingPresetGrid } from "@/components/coaching-preset-grid";
import { CombatVideoPreview } from "@/components/combat-video-preview";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DISCIPLINES, DISCIPLINE_PROFILES, type Discipline } from "@/lib/knockout-preview";

export const Route = createFileRoute("/training-modes")({
  head: () => ({ meta: [
    { title: "Training Modes — KINETIC Combat Telemetry" },
    { name: "description", content: "Select four AI coaching presets for defense, speed, biomechanics and African grassroots sparring, with combat replay profiles." },
    { property: "og:title", content: "Training Modes — KINETIC Combat Telemetry" },
    { property: "og:description", content: "Four specialized AI coaching presets and five combat profiles." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: TrainingModes,
});
const ICONS = [Footprints, Crosshair, Swords, Zap, Shield];
function TrainingModes() {
  const [discipline, setDiscipline] = useState<Discipline>("MMA");
  const [expanded, setExpanded] = useState(false);
  const metrics = DISCIPLINE_PROFILES[discipline];
  return <main className="kinetic-page training-page coaching-page"><KineticNavigation /><div className="training-inner">
    <div className="training-title"><div><span className="section-index">KINETIC // COMBAT INTELLIGENCE</span><h1>TRAINING MODES</h1></div><span className="micro-label"><span className="signal-dot" /> 05 DISCIPLINES / ONE ENGINE</span></div>
    <CoachingPresetGrid/><section className="training-preview-card backdrop-blur-xl backdrop-saturate-150"><div className="training-preview-heading"><div><span className="section-index">01 // COMBAT FOOTAGE</span><h2>Live Combat Telemetry Preview</h2></div><Button variant="outline" onClick={() => setExpanded(true)}>EXPAND <ArrowUpRight /></Button></div><CombatVideoPreview discipline={discipline} suspended={expanded} onExpand={() => setExpanded(true)} /><p className="combat-disclaimer">ANNOTATED REPLAY // Illustrative impact tracking, not measured force or live AI analysis.</p></section>
    <section className="discipline-section"><div className="section-heading"><div><span className="section-index">02 // SELECT YOUR DISCIPLINE</span><h2>COMBAT PROFILES</h2></div><span className="micro-label">ACTIVE // {discipline.toUpperCase()}</span></div><div className="discipline-grid" role="group" aria-label="Combat discipline">{DISCIPLINES.map((name,i) => { const Icon = ICONS[i] ?? Activity; return <Button variant="combatModule" className="discipline-card" key={name} aria-pressed={name === discipline} data-active={name === discipline} onClick={() => setDiscipline(name)}><span className="discipline-card-top"><Icon /><span>0{i+1}</span></span><strong>{name}</strong><span>{DISCIPLINE_PROFILES[name][0]?.label}</span></Button>; })}</div><div className="metrics-heading"><span>{discipline.toUpperCase()} // TELEMETRY PROFILE</span><span>SIMULATED READINGS</span></div><div className="metric-grid" aria-live="polite">{metrics.map((metric,i) => <div className="metric-item" key={metric.label}><span className="metric-number">0{i+1}</span><div><span className="metric-label">{metric.label}</span><p className="metric-value">{metric.value}<span>{metric.unit}</span></p></div></div>)}</div></section>
    <div className="training-footer"><span>KINETIC OS V2.4</span><span>REPLAY ENGINE // ONLINE</span></div>
  </div><Dialog open={expanded} onOpenChange={setExpanded}><DialogContent className="combat-preview-modal"><DialogHeader><DialogTitle>Live Combat Telemetry Preview</DialogTitle><DialogDescription>{discipline} profile · Annotated knockout replay. Illustrative tracking, not measured force.</DialogDescription></DialogHeader>{expanded && <CombatVideoPreview discipline={discipline} />}</DialogContent></Dialog></main>;
}