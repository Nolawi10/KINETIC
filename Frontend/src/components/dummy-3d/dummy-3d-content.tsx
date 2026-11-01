import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, useGLTF } from "@react-three/drei";
import { Plus, Minus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSensorSim } from "@/hooks/use-sensor-sim";
import { sensorSimStore } from "@/lib/sensor-sim/store";

const DUMMY_MODEL_PATH = "/punching_dummy_rec_room.glb";

useGLTF.preload(DUMMY_MODEL_PATH);

/**
 * GLB training dummy with hit reaction driven by sensor sim events.
 */
function DummyMesh() {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF(DUMMY_MODEL_PATH);
  const clonedScene = scene.clone();
  const state = useSensorSim();
  const lastEventRef = useRef<string | null>(null);
  const reactionRef = useRef({ active: false, until: 0, angle: 0 });

  useFrame((_, delta) => {
    const now = Date.now();
    const events = state.events;
    if (events.length > 0) {
      const latest = events[events.length - 1];
      if (latest && latest.id !== lastEventRef.current && latest.device === "DUMMY") {
        lastEventRef.current = latest.id;
        const intensity = latest.intensity === "high" ? 0.25 : latest.intensity === "medium" ? 0.16 : 0.1;
        reactionRef.current = {
          active: true,
          until: now + 280,
          angle: (Math.random() - 0.5) * intensity,
        };
      }
    }
    if (groupRef.current) {
      if (reactionRef.current.active && now < reactionRef.current.until) {
        groupRef.current.rotation.y += reactionRef.current.angle * delta * 12;
      } else if (reactionRef.current.active && now >= reactionRef.current.until) {
        reactionRef.current.active = false;
      } else {
        groupRef.current.rotation.y += delta * 0.3;
      }
    }
  });

  return (
    <group ref={groupRef} scale={[1.2, 1.2, 1.2]} position={[0, -1.0, 0]}>
      <primitive object={clonedScene} />
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
      <Canvas style={{ width: "100%", height: "100%" }} gl={{ antialias: true, alpha: true }}>
        <PerspectiveCamera ref={cameraRef} makeDefault position={[0, 1.2, zoom + 1]} fov={50} />
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2}
          autoRotate
          autoRotateSpeed={0.8}
        />
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 8, 5]} intensity={1.2} castShadow />
        <directionalLight position={[-5, 6, -5]} intensity={0.6} />
        <DummyMesh />
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
