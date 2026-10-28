import { useState } from "react";
import { Target, ShieldCheck, Zap, ShieldAlert, ArrowUpRight } from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import { Instrument } from "@/components/tactical-shell";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { foulHistory, roundCurve, comboDistribution, formIntegrity } from "@/lib/coaching-presets";
export function CombatAnalyticsOverview() {
  const [round, setRound] = useState("1");
  const [severity, setSeverity] = useState("All severities");
  const [mode, setMode] = useState("All drills");
  const [foul, setFoul] = useState<(typeof foulHistory)[number] | null>(null);
  const curve = roundCurve.map((p) => ({
    ...p,
    volume: Math.round(p.volume * (1 - (Number(round) - 1) * 0.08)),
    degradation: Math.min(100, p.degradation + (Number(round) - 1) * 5),
  }));
  const fouls = foulHistory.filter(
    (f) =>
      (severity === "All severities" || f.severity === severity) &&
      (mode === "All drills" || f.mode === mode),
  );
  return (
    <section className="combat-analytics-overview">
      <div className="metrics-heading">
        <span>FEATURED SESSION // MMA · 3 ROUNDS</span>
        <span>SIMULATED TELEMETRY</span>
      </div>
      <div className="kpi-grid combat-kpis">
        {[
          {
            label: "TOTAL STRIKES THROWN",
            value: "348",
            detail: "↑ 12% vs last session",
            icon: Target,
            tone: "cyan",
          },
          {
            label: "AVG GUARD EFFICIENCY",
            value: "91.4%",
            detail: "Active Guard",
            icon: ShieldCheck,
            tone: "emerald",
          },
          {
            label: "PEAK STRIKE VELOCITY",
            value: "8.4 m/s",
            detail: "Peak during round 1",
            icon: Zap,
            tone: "cyan",
          },
          {
            label: "TOTAL FOULS LOGGED",
            value: "3",
            detail: "Guard Drops · Low Violation",
            icon: ShieldAlert,
            tone: "crimson",
          },
        ].map((k) => (
          <div className="kpi" data-tone={k.tone} key={k.label}>
            <div>
              <span>{k.label}</span>
              <k.icon />
            </div>
            <strong>{k.value}</strong>
            <small>{k.detail}</small>
          </div>
        ))}
      </div>
      <Instrument
        title="STRIKE VOLUME & FATIGUE DECAY CURVE"
        tag="3-MINUTE ROUNDS"
        className="fatigue-instrument"
      >
        <div className="fatigue-controls">
          <div className="chart-key">
            <span className="accent-cyan">— Strikes / min</span>
            <span className="warning-text">— Form degradation %</span>
          </div>
          <div className="range-tabs" role="group" aria-label="Chart round">
            {["1", "2", "3"].map((r) => (
              <Button
                variant="ghost"
                key={r}
                data-active={round === r}
                aria-pressed={round === r}
                onClick={() => setRound(r)}
              >
                Round {r}
              </Button>
            ))}
          </div>
        </div>
        <div className="chart-box fatigue-chart">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={curve} margin={{ top: 15, right: 0, left: 0, bottom: 8 }}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="time"
                stroke="var(--muted-foreground)"
                fontSize={10}
                minTickGap={20}
              />
              <YAxis
                yAxisId="volume"
                stroke="var(--primary)"
                fontSize={10}
                width={35}
                domain={[0, 150]}
              />
              <YAxis
                yAxisId="form"
                orientation="right"
                stroke="var(--warning)"
                fontSize={10}
                width={35}
                domain={[0, 100]}
                unit="%"
              />
              <Tooltip />
              <Area
                yAxisId="volume"
                type="monotone"
                dataKey="volume"
                name="Strikes / min"
                stroke="var(--primary)"
                fill="var(--primary)"
                fillOpacity={0.1}
                strokeWidth={2}
              />
              <Line
                yAxisId="form"
                type="monotone"
                dataKey="degradation"
                name="Form degradation (%)"
                stroke="var(--warning)"
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <p className="micro-label" aria-live="polite">
          ROUND {round} // END-ROUND OUTPUT {curve[12]?.volume} STRIKES/MIN · FORM DEGRADATION{" "}
          {curve[12]?.degradation}%
        </p>
      </Instrument>
      <div className="combat-charts-grid">
        <Instrument title="COMBO DISTRIBUTION BREAKDOWN" tag="SUCCESSFUL SEQUENCES">
          <div className="chart-box">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comboDistribution} margin={{ left: -20, top: 15, right: 12 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={10} />
                <YAxis stroke="var(--muted-foreground)" fontSize={10} />
                <Tooltip />
                <Bar dataKey="count" name="Combinations" radius={[4, 4, 0, 0]} maxBarSize={65}>
                  {comboDistribution.map((c, i) => (
                    <Cell key={c.name} fill={`var(--chart-${i + 1})`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-key">
            <span>1–2 Jabs</span>
            <span>3-Strike Combinations</span>
            <span>5+ Extended Combos</span>
          </div>
        </Instrument>
        <Instrument title="FORM INTEGRITY INDEX" tag="BIOMECHANICS / 100">
          <div className="chart-box">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={formIntegrity} outerRadius="66%">
                <PolarGrid stroke="var(--border)" />
                <PolarAngleAxis
                  dataKey="name"
                  tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                <Radar
                  dataKey="score"
                  name="Form integrity"
                  stroke="var(--success)"
                  fill="var(--success)"
                  fillOpacity={0.14}
                />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="form-scores">
            {formIntegrity.map((f) => (
              <span key={f.name}>
                {f.name}
                <strong>{f.score}%</strong>
              </span>
            ))}
          </div>
        </Instrument>
      </div>
      <Instrument
        title="DETAILED SESSION FOUL HISTORY"
        tag={`${fouls.length} INFRACTIONS`}
        className="foul-instrument"
      >
        <div className="foul-controls">
          <Select value={mode} onValueChange={setMode}>
            <SelectTrigger aria-label="Filter foul drill">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["All drills", "Guard Drill", "Open Sparring"].map((v) => (
                <SelectItem key={v} value={v}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={severity} onValueChange={setSeverity}>
            <SelectTrigger aria-label="Filter foul severity">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["All severities", "CRITICAL", "MODERATE"].map((v) => (
                <SelectItem key={v} value={v}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="micro-label">SIMULATED INCIDENT LOG</span>
        </div>
        <div className="table-scroll">
          <table className="session-table foul-table">
            <thead>
              <tr>
                {["TIMESTAMP", "DRILL / MODE", "FOUL TYPE", "SEVERITY", "CORRECTION TIP"].map(
                  (h) => (
                    <th key={h}>{h}</th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {fouls.map((f) => (
                <tr key={f.time}>
                  <td className="accent-cyan">{f.time}</td>
                  <td>{f.mode}</td>
                  <td>{f.type}</td>
                  <td>
                    <span className="severity-badge" data-severity={f.severity}>
                      {f.severity}
                    </span>
                  </td>
                  <td>
                    <Button
                      className="correction-button"
                      variant="ghost"
                      onClick={() => setFoul(f)}
                    >
                      {f.tip}
                      <ArrowUpRight size={14} />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!fouls.length && <p className="tactical-notice">No infractions match these filters.</p>}
        </div>
      </Instrument>
      <Dialog
        open={!!foul}
        onOpenChange={(open) => {
          if (!open) setFoul(null);
        }}
      >
        <DialogContent className="tactical-dialog">
          <DialogHeader>
            <DialogTitle>Technique Correction</DialogTitle>
            <DialogDescription>
              {foul?.mode} · {foul?.time} · Simulated incident
            </DialogDescription>
          </DialogHeader>
          <h3>{foul?.type}</h3>
          <p>{foul?.tip}</p>
          <p className="micro-label">
            Practice slowly with a qualified coach before increasing speed or intensity.
          </p>
        </DialogContent>
      </Dialog>
    </section>
  );
}
