import { useRef, useState, lazy, Suspense } from "react";
import * as THREE from "three";

// Check if we're in a test environment (jsdom doesn't support WebGL)
const isTestEnvironment =
  typeof window !== "undefined" &&
  (window as { navigator?: { userAgent?: string } }).navigator?.userAgent?.includes("jsdom");

// Lazy load R3F components only when not in test environment
const Dummy3DContent = lazy(() =>
  import("./dummy-3d-content").then((m) => ({ default: m.Dummy3DContent })),
);

/**
 * 3D Striking Dummy Simulator Container
 *
 * Displays a procedural human-shaped training dummy with:
 * - Smooth automatic rotation
 * - Mouse/touch drag to rotate view (OrbitControls)
 * - Zoom controls (+/- buttons)
 * - Reset View button
 * - KINETIC tactical styling
 */
export function Dummy3DContainer() {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const [zoom, setZoom] = useState(5);

  // Fallback for test environment (jsdom doesn't support WebGL)
  if (isTestEnvironment) {
    return (
      <div
        className="dummy-3d-wrapper"
        style={{
          position: "relative",
          width: "100%",
          height: "400px",
          borderRadius: "8px",
          overflow: "hidden",
          background: "var(--surface-instrument)",
          border: "1px solid var(--border-combat)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p
          style={{
            color: "var(--muted-foreground)",
            fontFamily: "var(--font-mono)",
            fontSize: "12px",
          }}
        >
          3D DUMMY SIMULATOR · TEST MODE
        </p>
      </div>
    );
  }

  const handleZoomIn = () => {
    setZoom((prev) => Math.max(3, prev - 0.5));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.min(10, prev + 0.5));
  };

  const handleReset = () => {
    setZoom(5);
    if (cameraRef.current) {
      cameraRef.current.position.set(0, 0, 5);
      cameraRef.current.lookAt(0, 0, 0);
    }
  };

  return (
    <div
      className="dummy-3d-wrapper"
      style={{
        position: "relative",
        width: "100%",
        height: "400px",
        borderRadius: "8px",
        overflow: "hidden",
        background: "var(--surface-instrument)",
        border: "1px solid var(--border-combat)",
      }}
    >
      <Suspense
        fallback={
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "var(--muted-foreground)",
              fontFamily: "var(--font-mono)",
              fontSize: "12px",
            }}
          >
            Loading 3D Dummy...
          </div>
        }
      >
        <Dummy3DContent
          zoom={zoom}
          cameraRef={cameraRef}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onReset={handleReset}
        />
      </Suspense>
    </div>
  );
}

export default Dummy3DContainer;
