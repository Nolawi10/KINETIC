import { Suspense, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, useGLTF } from "@react-three/drei";
import { Plus, Minus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSensorSim } from "@/hooks/use-sensor-sim";

const DUMMY_MODEL_PATH = "/punching_dummy_rec_room.glb";

useGLTF.preload(DUMMY_MODEL_PATH);

function HitZoneMarkers({ zone }: { zone: string | null }) {
  if (!zone) return null;
  return (
    <group>
      <mesh position={[0, 1.2, 0.3]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshBasicMaterial color="#ff3333" transparent opacity={0.8} />
      </mesh>
    </group>
  );
}

/**
 * GLB training dummy with hit reaction driven by sensor sim events.
 */
function DummyMesh() {
  const groupRef = useRef<THREE.Group>(null);
  const gltf = useGLTF(DUMMY_MODEL_PATH);
  const clonedScene = gltf.scene.clone();
  const state = useSensorSim();
  const lastEventRef = useRef<string | null>(null);
  const reactionRef = useRef({ active: false, until: 0, angle: 0, zone: null as string | null });
  const [hitZone, setHitZone] = useState<string | null>(null);

  useFrame((_, delta) => {
    try {
      const now = Date.now();
      const events = state?.events || [];
      if (events.length > 0) {
        const latest = events[events.length - 1];
        if (latest && latest.id !== lastEventRef.current && latest.device === "DUMMY") {
          lastEventRef.current = latest.id;
          const intensity = latest.intensity === "high" ? 0.35 : latest.intensity === "medium" ? 0.22 : 0.12;
          reactionRef.current = {
            active: true,
            until: now + 350,
            angle: (Math.random() - 0.5) * intensity,
            zone: latest.sensorId || null,
          };
          setHitZone(latest.sensorId || null);
          setTimeout(() => setHitZone(null), 400);
        }
      }
      if (groupRef.current) {
        if (reactionRef.current.active && now < reactionRef.current.until) {
          groupRef.current.rotation.y += reactionRef.current.angle * delta * 14;
          groupRef.current.rotation.x = Math.sin((now - (reactionRef.current.until - 350)) / 100) * 0.05;
        } else if (reactionRef.current.active && now >= reactionRef.current.until) {
          reactionRef.current.active = false;
          if (groupRef.current) groupRef.current.rotation.x = 0;
        } else {
          groupRef.current.rotation.y += delta * 0.4;
          groupRef.current.rotation.x = 0;
        }
      }
    } catch (e) {
      // Ignore frame errors
    }
  });

  return (
    <group ref={groupRef} scale={[1.3, 1.3, 1.3]} position={[0, -1.2, 0]}>
      <primitive object={clonedScene} />
      <HitZoneMarkers zone={hitZone} />
    </group>
  );
}

/**
 * 3D Content component - separated to avoid loading in test environment
 */
export function Dummy3DContent({
  zoom,
  cameraRef,
  onZoomIn,
  onZoomOut,
  onReset,
}: {
  zoom: number;
  cameraRef: React.RefObject<THREE.PerspectiveCamera>;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}) {
  return (
    <>
      <Canvas style={{ width: "100%", height: "100%" }} gl={{ antialias: true, alpha: true }} onCreated={() => {}}>
        <PerspectiveCamera ref={cameraRef} makeDefault position={[0, 1.4, zoom + 1.5]} fov={45} />
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          minPolarAngle={Math.PI / 8}
          maxPolarAngle={Math.PI / 2}
          autoRotate
          autoRotateSpeed={0.6}
        />
        <ambientLight intensity={0.8} />
        <directionalLight position={[6, 10, 6]} intensity={1.4} castShadow />
        <directionalLight position={[-6, 8, -6]} intensity={0.7} />
        <pointLight position={[0, 3, 2]} intensity={0.5} color="#0ea5e9" />
        <Suspense fallback={null}>
          <DummyMesh />
        </Suspense>
      </Canvas>

      {/* Control Panel Overlay */}
      <div
        className="dummy-3d-controls"
        style={{
          position: "absolute",
          bottom: "12px",
          right: "12px",
          display: "flex",
          gap: "6px",
          background: "var(--glass)",
          backdropFilter: "blur(12px)",
          padding: "6px",
          borderRadius: "8px",
          border: "1px solid var(--glass-edge)",
        }}
      >
        <Button
          size="icon"
          variant="outline"
          onClick={onZoomIn}
          title="Zoom In"
          style={{ width: "32px", height: "32px" }}
        >
          <Plus size={14} />
        </Button>
        <Button
          size="icon"
          variant="outline"
          onClick={onZoomOut}
          title="Zoom Out"
          style={{ width: "32px", height: "32px" }}
        >
          <Minus size={14} />
        </Button>
        <Button
          size="icon"
          variant="outline"
          onClick={onReset}
          title="Reset View"
          style={{ width: "32px", height: "32px" }}
        >
          <RotateCcw size={14} />
        </Button>
      </div>

      {/* Corner Brackets */}
      <span className="combat-bracket bracket-tl" />
      <span className="combat-bracket bracket-tr" />
      <span className="combat-bracket bracket-bl" />
      <span className="combat-bracket bracket-br" />
    </>
  );
}
