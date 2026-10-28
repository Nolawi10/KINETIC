import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Wifi, Settings, Activity, Plug, RefreshCw } from "lucide-react";
import { TacticalShell, Instrument, tacticalHead } from "@/components/tactical-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface HardwareNode {
  node_id: string;
  node_type: string;
  esp_ip: string;
  protocol: string;
  port: number;
  name: string;
  status?: string;
  last_seen?: string;
}

interface HardwareForm {
  node_id: string;
  node_type: string;
  esp_ip: string;
  protocol: string;
  port: number;
  name: string;
}

export const Route = createFileRoute("/hardware")({
  head: () => tacticalHead("Hardware Connections", "Configure and monitor ESP8266 sensor nodes."),
  component: HardwarePage,
});

function HardwarePage() {
  const [nodes, setNodes] = useState<HardwareNode[]>([]);
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState<HardwareForm>({
    node_id: "",
    node_type: "dummy",
    esp_ip: "",
    protocol: "udp",
    port: 5005,
    name: "Striking Dummy",
  });

  const load = async () => {
    try {
      const r = await fetch("/api/hardware/nodes");
      if (!r.ok) {
        const t = await r.text().catch(() => "");
        throw new Error(t || `HTTP ${r.status}`);
      }
      const res = await r.json();
      setNodes(res.nodes || []);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Failed to load nodes");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    try {
      const res = await fetch("/api/hardware/nodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      }).then((r) => r.json());
      if (res.error) {
        setNotice(res.error);
      } else {
        setNotice("Configuration saved");
        load();
      }
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Failed to save");
    }
  };

  const test = async (node_id: string) => {
    try {
      const res = await fetch("/api/hardware/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ node_id }),
      }).then((r) => r.json());
      setNotice(`Test: ${res.status} - ${res.message}`);
      load();
    } catch (e) {
      setNotice("Test failed");
    }
  };

  return (
    <TacticalShell
      title="HARDWARE CONNECTIONS"
      index="ESP8266 NODE CONFIGURATION"
      actions={
        <Button onClick={load}>
          <RefreshCw />
          Refresh
        </Button>
      }
    >
      {notice && (
        <p role="status" className="tactical-notice">
          {notice}
        </p>
      )}

      <div className="settings-band">
        <div className="settings-intro">
          <span className="section-index">01 // DEVICE REGISTRATION</span>
          <h2>REGISTER NODE</h2>
          <p>Configure ESP8266 nodes without editing source code.</p>
        </div>
        <div className="settings-content">
          <Instrument title="NODE CONFIGURATION" tag="NEW/EDIT">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <label>
                Node ID
                <Input
                  value={form.node_id}
                  onChange={(e) => setForm({ ...form, node_id: e.target.value })}
                />
              </label>
              <label>
                Device Type
                <select
                  value={form.node_type}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      node_type: e.target.value,
                      name: e.target.value === "dummy" ? "Striking Dummy" : "Smart Mat",
                    })
                  }
                  style={{
                    width: "100%",
                    padding: "6px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    color: "inherit",
                  }}
                >
                  <option value="dummy">Striking Dummy (4 zones + IMU)</option>
                  <option value="mat">Smart Mat (6 sensors)</option>
                </select>
              </label>
              <label>
                Display Name
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </label>
              <label>
                ESP8266 IP Address
                <Input
                  value={form.esp_ip}
                  onChange={(e) => setForm({ ...form, esp_ip: e.target.value })}
                  placeholder="192.168.1.100"
                />
              </label>
              <label>
                Protocol
                <select
                  value={form.protocol}
                  onChange={(e) => setForm({ ...form, protocol: e.target.value })}
                  style={{
                    width: "100%",
                    padding: "6px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    color: "inherit",
                  }}
                >
                  <option value="udp">UDP</option>
                </select>
              </label>
              <label>
                Receiver Port
                <Input
                  type="number"
                  value={form.port}
                  onChange={(e) => setForm({ ...form, port: parseInt(e.target.value) || 5005 })}
                />
              </label>
            </div>
            <div style={{ marginTop: "10px", display: "flex", gap: "8px" }}>
              <Button onClick={save}>
                <Settings />
                Save Configuration
              </Button>
            </div>
            <p className="micro-label">
              Note: Changing this website field does not auto-update ESP8266 firmware. Configure
              firmware separately.
            </p>
          </Instrument>
        </div>
      </div>

      <div className="settings-band">
        <div className="settings-intro">
          <span className="section-index">02 // MONITORING</span>
          <h2>CONNECTED NODES</h2>
          <p>Live status and sensor health.</p>
        </div>
        <div
          className="settings-content"
          style={{ display: "flex", flexDirection: "column", gap: "12px" }}
        >
          {nodes.length === 0 && (
            <p style={{ opacity: 0.6 }}>
              No nodes registered. Configure above or wait for incoming packets.
            </p>
          )}
          {nodes.map((node, idx) => (
            <Instrument
              key={node.node_id || idx}
              title={node.config?.name || node.node_id}
              tag={node.stale ? "OFFLINE" : "ONLINE"}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "8px",
                  fontSize: "12px",
                }}
              >
                <div>
                  <strong>Node ID:</strong> {node.node_id}
                </div>
                <div>
                  <strong>Type:</strong> {node.config?.node_type || "unknown"}
                </div>
                <div>
                  <strong>ESP IP:</strong> {node.config?.esp_ip || "Not set"}
                </div>
                <div>
                  <strong>Protocol:</strong> {node.config?.protocol || "UDP"}
                </div>
                <div>
                  <strong>Port:</strong> {node.config?.port || 5005}
                </div>
                <div>
                  <strong>Last Seen:</strong> {node.last_seen || "Never"}
                </div>
              </div>
              {node.config?.node_type === "dummy" && (
                <div style={{ marginTop: "10px" }}>
                  <strong>Zones:</strong> HEAD, CHEST, LEFT_WAIST, RIGHT_WAIST | IMU: MPU6050
                </div>
              )}
              {node.config?.node_type === "mat" && (
                <div style={{ marginTop: "10px" }}>
                  <strong>Sensors:</strong> 6 piezoelectric positions
                </div>
              )}
              <div style={{ marginTop: "10px", display: "flex", gap: "8px" }}>
                <Button size="sm" variant="outline" onClick={() => test(node.node_id)}>
                  <Activity />
                  Test Connection
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setForm({ ...form, node_id: node.node_id, ...(node.config || {}) })
                  }
                >
                  <Plug />
                  Edit
                </Button>
              </div>
            </Instrument>
          ))}
        </div>
      </div>
    </TacticalShell>
  );
}
