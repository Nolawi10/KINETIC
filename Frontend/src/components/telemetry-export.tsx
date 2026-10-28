import { useState } from 'react';
import { Download, FileText, Share2, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { csvCell, foulHistory, roundCurve } from '@/lib/coaching-presets';
import type { TrainingSession } from '@/lib/kinetic-data';
export function TelemetryExport({ rows }: { rows: TrainingSession[] }) {
  const [share, setShare] = useState(false); const [notice, setNotice] = useState('');
  const summary = `KINETIC — Simulated Combat Telemetry\n348 strikes · Guard efficiency 91.4% · Peak velocity 8.4 m/s\n3 guard drops · Low violation\n${rows.length} historical sessions in the selected filters.\nCorrection focus: Keep left glove at chin level during jab retract.\nIllustrative training data, not measured hardware telemetry. No private video is shared.`;
  function csv() {
    const lines: unknown[][] = [['KINETIC SIMULATED TELEMETRY'], ['Metric','Value'], ['Total strikes',348], ['Guard efficiency (%)',91.4], ['Peak velocity (m/s)',8.4], ['Guard drops',3], [], ['Round time','Strikes/min','Form degradation (%)'], ...roundCurve.map(p => [p.time,p.volume,p.degradation]), [], ['Timestamp','Drill/Mode','Foul Type','Severity','Correction Tip'], ...foulHistory.map(f => [f.time,f.mode,f.type,f.severity,f.tip]), [], ['Date','Discipline','Duration (seconds)','Strikes','Max speed (m/s)','Simulated'], ...rows.map(r => [r.created_at,r.discipline,r.duration_seconds,r.strikes,r.max_speed,r.simulated])];
    const url = URL.createObjectURL(new Blob(['\ufeff' + lines.map(line => line.map(csvCell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = 'kinetic-telemetry.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); setNotice('CSV report downloaded.');
  }
  async function pdf() {
    try { const { jsPDF } = await import('jspdf'); const doc = new jsPDF(); let y = 20;
      const line = (text: string, size = 11) => { doc.setFontSize(size); const chunks: string[] = doc.splitTextToSize(text, 175); for (const chunk of chunks) { if (y > 276) { doc.addPage(); y = 20; } doc.text(chunk, 18, y); y += size * .55; } y += 3; };
      line('KINETIC | COMBAT TELEMETRY REPORT',18); line('SIMULATED DATA - not measured hardware telemetry',10); line('348 strikes | 91.4% guard efficiency | 8.4 m/s peak velocity | 3 guard drops');
      line('STRIKE VOLUME & FATIGUE - 3-MINUTE ROUND',14); roundCurve.forEach(p => line(`${p.time} | ${p.volume} strikes/min | ${p.degradation}% form degradation`,10));
      line('SESSION FOUL HISTORY',14); foulHistory.forEach(f => line(`${f.time} | ${f.mode} | ${f.severity}\n${f.type}\nCorrection: ${f.tip}`,10));
      line('FILTERED HISTORICAL SESSIONS',14); rows.forEach(r => line(`${r.created_at.slice(0,10)} | ${r.discipline} | ${r.duration_seconds}s | ${r.strikes} strikes | ${r.max_speed} m/s | ${r.simulated ? 'Simulated' : 'Recorded'}`,10)); doc.save('kinetic-telemetry.pdf'); setNotice('PDF report downloaded.');
    } catch { setNotice('PDF could not be generated. Please try again.'); }
  }
  async function shareSummary() { if (navigator.share) { try { await navigator.share({ title: 'KINETIC Session Report', text: summary }); setShare(false); } catch (e) { if (!(e instanceof Error && e.name === 'AbortError')) setNotice('Sharing unavailable. Copy the summary instead.'); } } else { await copy(); } }
  async function copy() { try { await navigator.clipboard.writeText(summary); setNotice('Session summary copied.'); } catch { setNotice('Select and copy the summary below.'); } }
  return <><Button variant="outline" onClick={() => void pdf()}><FileText/>Export PDF</Button><Button variant="outline" onClick={csv}><Download/>Export CSV</Button><Button variant="outline" onClick={() => { setNotice(''); setShare(true); }}><Share2/>Share Session with Coach</Button>{notice && <span className="export-notice" role="status"><Check size={13}/>{notice}</span>}<Dialog open={share} onOpenChange={setShare}><DialogContent className="tactical-dialog"><DialogHeader><DialogTitle>Share Session with Coach</DialogTitle><DialogDescription>Only this simulated summary is shared. Private sparring videos and account details stay private.</DialogDescription></DialogHeader><pre className="share-summary">{summary}</pre><div className="tactical-actions"><Button variant="outline" onClick={() => void copy()}><Copy/>Copy summary</Button><Button onClick={() => void shareSummary()}><Share2/>Share summary</Button></div></DialogContent></Dialog></>;
}