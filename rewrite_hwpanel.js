const fs = require('fs');
const p = 'E:/Kinetic Models/Frontend/src/components/live-hardware-panel.tsx';
const s = `import { useEffect, useState } from 'react';
import { Instrument } from '@/components/tactical-shell';
import { Activity, Wifi } from 'lucide-react';

export default function LiveHardwarePanel() {
  const [latest, setLatest] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [d, l, e] = await Promise.all([
          fetch('/api/devices').then(r => r.json()).catch(() => ({devices:[]})),
          fetch('/api/telemetry/dummy/latest').then(r => r.json()).catch(() => ({readings:{}})),
          fetch('/api/telemetry/dummy/events?limit=20').then(r => r.json()).catch(() => ({events:[]}))
        ]);
        setDevices(d.devices || []);
        const readings = l.readings || {};
        const keys = Object.keys(readings);
        if (keys.length > 0) setLatest(readings[keys[0]]); else setLatest(null);
        setEvents(e.events || []);
      } catch (err) {}
    };
    load();
    const t = setInterval(load, 500);
    return () => clearInterval(t);
  }, []);

  const nodeArr = Array.isArray(devices) ? devices : [];
  const node: any = nodeArr.find((d:any)=>d.node_id==='kinetic_dummy_01') || nodeArr[0] || null;
  const piezo = (latest && (latest.piezo || latest.channels)) ? (latest.piezo || latest.channels) : {};
  const zones = ['head','chest','left_waist','right_waist'];
  const zoneLabels: any = {head:'HEAD',chest:'CHEST',left_waist:'LEFT WAIST',right_waist:'RIGHT WAIST'};

  return (
    <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
      <Instrument title="LIVE HARDWARE" tag="KINETIC DUMMY">
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'8px',fontSize:'12px'}}>
          <div><strong>Node:</strong> {node?.node_id || (latest && latest.node_id) || 'kinetic_dummy_01'}</div>
          <div><strong>Status:</strong> {node && !node.stale ? <span style={{color:'#22c55e'}}><Wifi size={12}/> ONLINE</span> : <span style={{color:'#f59e0b'}}>STALE/OFFLINE</span>}</div>
          <div><strong>Last Seen:</strong> {node?.last_seen || (latest && latest.timestamp) || '-'}</div>
          <div><strong>Seq:</strong> {(latest && latest.sequence) || (node && node.last_seq) || '-'}</div>
          <div><strong>ADS1115:</strong> {(latest && latest.sensors && latest.sensors.ads1115) ? 'OK' : (node ? 'OK' : '-')}</div>
          <div><strong>MPU6050:</strong> {(latest && latest.sensors && latest.sensors.mpu6050) || (latest && latest.imu) ? 'OK' : '-'}</div>
        </div>
      </Instrument>
      <Instrument title="PIEZO ZONES" tag="4 ZONES">
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
          {zones.map((z:any)=>{
            const data:any = piezo[z] || piezo[z.toUpperCase()] || {};
            const raw:any = data.raw !== undefined ? data.raw : '-';
            const baseline:any = data.baseline !== undefined ? data.baseline : '-';
            const delta:any = (typeof raw === 'number' && typeof baseline === 'number') ? (raw - baseline) : '-';
            const ev = data.event === true || data.event === 1;
            return (
              <div key={z} style={{padding:'10px',background: ev ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.03)',border: ev ? '1px solid rgba(239,68,68,0.5)' : '1px solid rgba(255,255,255,0.1)',borderRadius:'6px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <strong>{zoneLabels[z]}</strong>
                  <span style={{fontSize:'11px',color: ev ? '#ef4444' : '#22c55e'}}>{ev ? 'IMPACT DETECTED' : 'IDLE'}</span>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'6px',fontSize:'11px',marginTop:'6px'}}>
                  <div>Raw: <strong>{raw}</strong></div>
                  <div>Baseline: <strong>{baseline}</strong></div>
                  <div>Delta: <strong style={{color: typeof delta === 'number' && delta > 0 ? '#ef4444' : typeof delta === 'number' && delta < 0 ? '#f59e0b' : 'inherit'}}>{delta}</strong></div>
                </div>
              </div>
            );
          })}
        </div>
      </Instrument>
      <Instrument title="EVENT FEED" tag="HARDWARE">
        <div style={{maxHeight:'200px',overflowY:'auto',display:'flex',flexDirection:'column',gap:'6px'}}>
          {events.length === 0 && <div style={{opacity:0.6,fontSize:'12px'}}>No events yet</div>}
          {events.slice(0,15).map((ev:any,i:number)=>(
            <div key={ev.id||i} style={{padding:'6px 8px',background:'rgba(255,255,255,0.03)',borderRadius:'4px',fontSize:'11px'}}>
              <div style={{display:'flex',justifyContent:'space-between'}}>
                <span><Activity size={10}/> IMPACT DETECTED</span>
                <span>{ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString() : '-'}</span>
              </div>
              <div>Zone: <strong>{ev.zone||'-'}</strong> | Source: {ev.node_id||'-'}</div>
            </div>
          ))}
        </div>
      </Instrument>
    </div>
  );
}
`;
fs.writeFileSync(p,s,'utf8');
console.log('ok');
