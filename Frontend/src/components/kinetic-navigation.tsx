import {
  Activity,
  ChartNoAxesCombined,
  LayoutDashboard,
  Settings2,
  Swords,
  Wifi,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { kineticLogo as logo } from "@/lib/media-assets";

const tabs = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Hardware", icon: Wifi },
  { label: "Training Modes", icon: Swords },
  { label: "Live Session", icon: Activity },
  { label: "Analytics", icon: ChartNoAxesCombined },
  { label: "Settings", icon: Settings2 },
] as const;

export function KineticNavigation() {
  const pathname = useLocation({ select: (location) => location.pathname });
  const navigate = useNavigate();
  const paths = {
    Dashboard: "/",
    Hardware: "/hardware",
    "Training Modes": "/training-modes",
    "Live Session": "/live",
    Analytics: "/analytics",
    Settings: "/settings",
  } as const;
  const activeTab = Object.entries(paths).find(([, path]) => path === pathname)?.[0] ?? "Dashboard";
  const selectTab = (label: string) => {
    const path = paths[label as keyof typeof paths];
    if (path) void navigate({ to: path });
  };

  return (
    <header className="kinetic-header">
      <nav
        className="kinetic-capsule"
        aria-label="Main navigation"
        style={{ justifySelf: "center" }}
      >
        <a
          className="kinetic-mark"
          href="/"
          aria-label="KINETIC home"
          onClick={(event) => {
            event.preventDefault();
            selectTab("Dashboard");
          }}
        >
          <img src={logo.url} alt="KINETIC" />
        </a>
        <div className="kinetic-tabs" style={{ justifyContent: "center", width: "100%" }}>
          {tabs.map(({ label, icon: Icon }) => (
            <Button
              key={label}
              variant="kinetic"
              aria-pressed={activeTab === label}
              data-active={activeTab === label}
              onClick={() => selectTab(label)}
              title={label}
              style={{ flex: "0 0 auto", whiteSpace: "nowrap" }}
            >
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </Button>
          ))}
        </div>
        <div
          className="kinetic-status"
          role="status"
          aria-label="Live session inactive"
          title="Live session inactive"
          style={{ justifySelf: "end" }}
        >
          <span className="status-light" />
          <span>STANDBY</span>
        </div>
      </nav>
    </header>
  );
}
