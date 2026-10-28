import {
  Activity,
  Clock,
  Gauge,
  Radar,
  Target,
  Timer,
  Zap,
} from 'lucide-react';
import { Link } from '@tanstack/react-router';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Instrument } from '@/components/tactical-shell';
import { Button } from '@/components/ui/button';
import { useNow, useSensorSim } from '@/hooks/use-sensor-sim';
import { sensorSimStore } from '@/lib/sensor-sim/store';
import {
  bucketActivity,
  countersForFilter,
  filterEvents,
  formatClock,
  formatSessionDuration,
  groupDummyCombos,
  summarizeSession,
} from '@/lib/sensor-sim/engine';
import {
  DUMMY_ZONES,
  INTENSITY_LABELS,
  INTENSITY_LEVELS,
  MAT_SENSORS,
  type SourceFilter,
} from '@/lib/sensor-sim/types';

const FILTERS: readonly { id: SourceFilter; label: string }[] = [
  { id: 'ALL', label: 'All sources' },
  { id: 'SIMULATED', label: 'Simulated' },
  { id: 'HARDWARE', label: 'Hardware' },
];

/**
 * Analytics section fed by the same event store as the Live Feed.
 * Totals come from session counters (bounded history never loses them);
 * timelines and recent lists use the bounded in-memory event history.
 */
export function SensorSimAnalytics() {
  const state = useSensorSim();
  const now = useNow(1000);
  const clockNow = now > 0 ? now : (state.lastEventAt ?? 0);

  const counters = countersForFilter(state.counters, state.sourceFilter);
  const summary = summarizeSession(
    state.counters,
    state.events,
    state.sourceFilter,
    state.sessionStartedAt,
    clockNow,
  );
  const visibleEvents = filterEvents(state.events, state.sourceFilter);

  const sourceLabel =
    state.sourceFilter === 'ALL'
      ? `${state.counters.simulated.total} SIMULATED · ${state.counters.hardware.total} HARDWARE`
      : state.sourceFilter;

  const sourceFilterControl = (
    <div className="sim-analytics-toolbar">
      <div className="sim-toolbar-group">
        <span className="micro-label">SOURCE FILTER</span>
        <div className="sim-segment" role="group" aria-label="Event source filter">
          {FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              className="sim-segment-btn"
              data-active={state.sourceFilter === filter.id}
              aria-pressed={state.sourceFilter === filter.id}
              onClick={() => sensorSimStore.setSourceFilter(filter.id)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>
      <span className="micro-label">DEMO MODE · TRIGGER SENSORS FROM LIVE SESSION</span>
    </div>
  );

  if (counters.total === 0) {
    return (
      <section className="sim-analytics" aria-labelledby="sim-analytics-title">
        <div className="metrics-heading">
          <span id="sim-analytics-title">SENSOR SIMULATOR ANALYTICS</span>
          <span>SHARED EVENT STORE · {sourceLabel}</span>
        </div>
        {sourceFilterControl}
        <Instrument title="SENSOR SIMULATOR ANALYTICS" tag="AWAITING EVENTS">
          <div className="sim-empty">
            <Radar aria-hidden="true" />
            <strong>No sensor events in this session</strong>
            <p>
              Open the Live Session page and tap a mat sensor (M1–M6) or a dummy zone, or run
              Simulate Footwork / Simulate Combo. Charts here update from the same event store.
            </p>
            <Button asChild variant="outline">
              <Link to="/live" search={{ preset: undefined }}>Open Live Session</Link>
            </Button>
            <p className="micro-label">
              Demo mode works offline — the physical sensors and ESP8266 nodes are not required.
            </p>
          </div>
        </Instrument>
      </section>
    );
  }

  const matData = MAT_SENSORS.map((sensor) => ({
    sensor: sensor.id,
    contacts: counters.bySensor[sensor.id],
    placement: sensor.placement,
  }));
  const zoneData = DUMMY_ZONES.map((zone) => ({
    zone: zone.id,
    label: zone.label,
    hits: counters.byZone[zone.id],
    chart: zone.chart,
  }));
  const timeline = bucketActivity(visibleEvents, clockNow, 10);
  const intensityData = INTENSITY_LEVELS.map((level) => ({
    level: INTENSITY_LABELS[level],
    mat: counters.byIntensityByDevice.MAT[level],
    dummy: counters.byIntensityByDevice.DUMMY[level],
  }));
  const combos = groupDummyCombos(visibleEvents, 1500).slice(-4).reverse();
  const recentStrikes = visibleEvents
    .filter((event) => event.device === 'DUMMY')
    .slice(0, 8);

  const kpis = [
    {
      label: 'TOTAL MAT CONTACTS',
      value: counters.mat.toLocaleString(),
      detail: `${summary.mostActiveSensor ?? '—'} most active`,
      icon: Activity,
    },
    {
      label: 'TOTAL DUMMY HITS',
      value: counters.dummy.toLocaleString(),
      detail: `${summary.mostActiveZone?.replace('_', ' ') ?? '—'} top zone`,
      icon: Target,
    },
    {
      label: 'TOTAL EVENTS',
      value: counters.total.toLocaleString(),
      detail: 'Mat + dummy · current session',
      icon: Zap,
    },
    {
      label: 'SESSION DURATION',
      value: formatSessionDuration(summary.durationMs),
      detail: `${summary.total} events recorded`,
      icon: Clock,
    },
    {
      label: 'EVENT RATE',
      value: `${summary.eventsPerMinute} / min`,
      detail: 'Trailing 60 s window',
      icon: Timer,
    },
    {
      label: 'MOST ACTIVE SENSOR',
      value: summary.mostActiveSensor ?? '—',
      detail: summary.mostActiveSensor
        ? `${counters.bySensor[summary.mostActiveSensor]} contacts`
        : 'No mat contacts yet',
      icon: Gauge,
    },
    {
      label: 'TOP DUMMY ZONE',
      value: summary.mostActiveZone?.replace('_', ' ') ?? '—',
      detail: summary.mostActiveZone
        ? `${counters.byZone[summary.mostActiveZone]} hits`
        : 'No dummy hits yet',
      icon: Target,
    },
    {
      label: 'SOURCE STATUS',
      value: state.sourceFilter,
      detail: `${state.counters.simulated.total} simulated · ${state.counters.hardware.total} hardware`,
      icon: Radar,
    },
  ];

  return (
    <section className="sim-analytics" aria-labelledby="sim-analytics-title">
      <div className="metrics-heading">
        <span id="sim-analytics-title">SENSOR SIMULATOR ANALYTICS</span>
        <span>SHARED EVENT STORE · {sourceLabel}</span>
      </div>
      {sourceFilterControl}

      <div className="kpi-grid sim-kpi-grid">
        {kpis.map((kpi) => (
          <div className="kpi" key={kpi.label}>
            <div>
              <span>{kpi.label}</span>
              <kpi.icon />
            </div>
            <strong>{kpi.value}</strong>
            <small>{kpi.detail}</small>
          </div>
        ))}
      </div>

      <div className="sim-charts">
        <Instrument title="MAT CONTACTS BY SENSOR" tag="M1–M6 · SHARED STORE">
          <div className="chart-box">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={matData}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="sensor" stroke="var(--muted-foreground)" fontSize={10} />
                <YAxis
                  allowDecimals={false}
                  stroke="var(--muted-foreground)"
                  fontSize={10}
                  width={28}
                />
                <Tooltip />
                <Bar dataKey="contacts" name="Contacts" fill="var(--chart-1)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-legend">
            {matData.map((sensor) => (
              <div key={sensor.sensor}>
                <i className="chart-swatch swatch-1" />
                <span>
                  {sensor.sensor} · {sensor.placement}
                </span>
                <strong>{sensor.contacts}</strong>
              </div>
            ))}
          </div>
        </Instrument>

        <Instrument title="DUMMY HITS BY ZONE" tag="4 PIEZO ZONES">
          <div className="chart-box">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={zoneData}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={9} />
                <YAxis
                  allowDecimals={false}
                  stroke="var(--muted-foreground)"
                  fontSize={10}
                  width={28}
                />
                <Tooltip />
                <Bar dataKey="hits" name="Hits" radius={[3, 3, 0, 0]}>
                  {zoneData.map((zone) => (
                    <Cell key={zone.zone} fill={`var(--chart-${zone.chart})`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-legend">
            {zoneData.map((zone) => (
              <div key={zone.zone}>
                <i className={`chart-swatch swatch-${zone.chart}`} />
                <span>{zone.label}</span>
                <strong>{zone.hits}</strong>
              </div>
            ))}
          </div>
        </Instrument>

        <Instrument title="SENSOR ACTIVITY TIMELINE" tag="LAST 10 MINUTES">
          <div className="chart-box">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeline}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={10} />
                <YAxis
                  allowDecimals={false}
                  stroke="var(--muted-foreground)"
                  fontSize={10}
                  width={28}
                />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="mat"
                  name="Mat contacts"
                  stroke="var(--chart-1)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="dummy"
                  name="Dummy hits"
                  stroke="var(--chart-4)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-key">
            <span className="accent-cyan">— Mat contacts</span>
            <span className="warning-text">— Dummy hits</span>
          </div>
        </Instrument>

        <Instrument title="INTENSITY DISTRIBUTION" tag="LIGHT / MEDIUM / STRONG">
          <div className="chart-box">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={intensityData}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="level" stroke="var(--muted-foreground)" fontSize={10} />
                <YAxis
                  allowDecimals={false}
                  stroke="var(--muted-foreground)"
                  fontSize={10}
                  width={28}
                />
                <Tooltip />
                <Bar dataKey="mat" name="Mat" fill="var(--chart-1)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="dummy" name="Dummy" fill="var(--chart-4)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-key">
            <span className="accent-cyan">— Mat contacts</span>
            <span className="warning-text">— Dummy hits</span>
          </div>
        </Instrument>

        <Instrument title="ZONE DISTRIBUTION" tag={state.sourceFilter}>
          {counters.dummy ? (
            <div className="donut-layout">
              <div className="chart-box">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={zoneData}
                      dataKey="hits"
                      nameKey="label"
                      innerRadius="58%"
                      outerRadius="86%"
                      stroke="var(--surface-panel)"
                      paddingAngle={3}
                    >
                      {zoneData.map((zone) => (
                        <Cell key={zone.zone} fill={`var(--chart-${zone.chart})`} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="donut-center">
                  <strong>{counters.dummy}</strong>
                  <span>HITS</span>
                </div>
              </div>
              <div className="chart-legend">
                {zoneData.map((zone) => (
                  <div key={zone.zone}>
                    <i className={`chart-swatch swatch-${zone.chart}`} />
                    <span>{zone.label}</span>
                    <strong>{zone.hits}</strong>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="tactical-notice">No dummy hits in this source filter yet.</p>
          )}
        </Instrument>

        <Instrument title="RECENT COMBINATIONS" tag="MAX 1.5 s GAP">
          {combos.length ? (
            <div className="sim-combos">
              {combos.map((combo, index) => (
                <div className="sim-combo" key={`${combo.startedAt}-${index}`}>
                  <span className="micro-label">{formatClock(combo.startedAt)}</span>
                  <div>
                    {combo.zones.map((zone, zoneIndex) => (
                      <span key={`${zone}-${zoneIndex}`} className="sim-combo-zone">
                        {zone.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                  <strong>{combo.zones.length} HITS</strong>
                </div>
              ))}
            </div>
          ) : (
            <p className="tactical-notice">No dummy combinations recorded in this session yet.</p>
          )}
        </Instrument>
      </div>

      <Instrument
        title="DUMMY STRIKE HISTORY"
        tag={`${counters.dummy} HITS · ${state.sourceFilter}`}
        className="session-table-wrap"
      >
        <div className="table-scroll">
          <table className="session-table">
            <thead>
              <tr>
                {['TIME', 'ZONE', 'PEAK (ADC)', 'DURATION', 'INTENSITY', 'SOURCE'].map((heading) => (
                  <th key={heading}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentStrikes.map((event) => (
                <tr key={event.id}>
                  <td>
                    {formatClock(event.ts)}
                    <small>DUMMY IMPACT</small>
                  </td>
                  <td className="accent-cyan">{event.sensorId.replace('_', ' ')}</td>
                  <td>{Math.round(event.peakAmplitude)}</td>
                  <td>{event.durationMs} ms</td>
                  <td>{INTENSITY_LABELS[event.intensity]}</td>
                  <td>
                    <span className="sim-source-badge" data-source={event.source}>
                      {event.source}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!recentStrikes.length && (
            <p className="tactical-notice">No dummy strikes in this source filter yet.</p>
          )}
        </div>
      </Instrument>

      <p className="micro-label sim-analytics-note">
        Demo analytics are generated from the same session event store as the Live Feed. Amplitudes
        are 12-bit ADC counts, not calibrated force or energy. Hardware events remain separate and
        are never overwritten by the simulator.
      </p>
    </section>
  );
}

      <Instrument title="HIT ZONES" tag="DUMMY/MAT">
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:'8px',textAlign:'center'}}>
          <div><div className="micro-label">HEAD</div><strong>-</strong></div>
          <div><div className="micro-label">CHEST</div><strong>-</strong></div>
          <div><div className="micro-label">LEFT_WAIST</div><strong>-</strong></div>
          <div><div className="micro-label">RIGHT_WAIST</div><strong>-</strong></div>
        </div>
      </Instrument>
