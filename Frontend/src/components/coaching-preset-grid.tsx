import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Shield, Zap, Footprints, Swords, ArrowUpRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { modeFilters, filterPresets } from '@/lib/coaching-presets';
const icons = { guard: Shield, combo: Zap, stance: Footprints, sparring: Swords };
export function CoachingPresetGrid() {
  const [filter, setFilter] = useState<string>('All Modes');
  const navigate = useNavigate();
  const modes = filterPresets(filter);
  return <section className="preset-section" aria-label="AI coaching presets">
    <div className="preset-banner"><div><span className="section-index">01 // MISSION CONFIGURATION</span><h2>Select AI Telemetry Preset</h2><p>Four focused protocols. One combat intelligence engine.</p></div><span className="state-badge success-text">● {String(modes.length).padStart(2, '0')} PRESETS READY</span></div>
    <div className="range-tabs preset-filters" role="group" aria-label="Filter coaching modes">{modeFilters.map(f => <Button key={f} variant="ghost" aria-pressed={filter === f} data-active={filter === f} onClick={() => setFilter(f)}>{f}</Button>)}</div>
    <div className="preset-grid">{modes.map(p => { const Icon = icons[p.id]; return <article className="preset-card backdrop-blur-xl backdrop-saturate-150" data-tone={p.tone} key={p.id}>
      <div className="preset-top"><span className="preset-icon"><Icon size={25}/></span><span className="preset-badge">{p.tag}</span></div><h3>{p.title}</h3><p className="preset-focus">{p.focus}</p><p className="preset-description">{p.description}</p>
      <ul className="preset-parameters">{p.parameters.map(param => <li key={param}><Check size={13}/>{param}</li>)}</ul><p className="preset-feature">{p.feature}</p>
      <div className="preset-bottom"><span className="preset-ready">● {filter === 'All Modes' ? 'READY' : 'MATCHED'} / SIMULATION</span><Button variant="outline" onClick={() => void navigate({ to: '/live', search: { preset: p.id } })}>START SESSION<ArrowUpRight size={16}/></Button></div>
    </article>; })}</div>
  </section>;
}