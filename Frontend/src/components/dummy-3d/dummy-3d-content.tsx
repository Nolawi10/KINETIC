import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';

/**
 * Procedural training dummy built from primitive shapes.
 * Represents a human-shaped striking target with head, torso, and base.
 */
function DummyMesh() {
  const groupRef = useRef<THREE.Group>(null);

  // Smooth auto-rotation
  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.5;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Base/Stand */}
      <mesh position={[0, -1.5, 0]} castShadow>
        <cylinderGeometry args={[0.4, 0.5, 0.3, 32]} />
        <meshStandardMaterial color="#1a1a2e" roughness={0.8} metalness={0.2} />
      </mesh>
      <mesh position={[0, -1.2, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.4, 0.6, 32]} />
        <meshStandardMaterial color="#16213e" roughness={0.7} metalness={0.3} />
      </mesh>

      {/* Torso */}
      <mesh position={[0, 0, 0]} castShadow>
        <cylinderGeometry args={[0.35, 0.4, 1.2, 32]} />
        <meshStandardMaterial color="#1a1a2e" roughness={0.6} metalness={0.4} />
      </mesh>

      {/* Shoulders */}
      <mesh position={[-0.5, 0.4, 0]} rotation={[0, 0, Math.PI / 4]} castShadow>
        <cylinderGeometry args={[0.12, 0.12, 0.4, 16]} />
        <meshStandardMaterial color="#16213e" roughness={0.7} metalness={0.3} />
      </mesh>
      <mesh position={[0.5, 0.4, 0]} rotation={[0, 0, -Math.PI / 4]} castShadow>
        <cylinderGeometry args={[0.12, 0.12, 0.4, 16]} />
        <meshStandardMaterial color="#16213e" roughness={0.7} metalness={0.3} />
      </mesh>

      {/* Neck */}
      <mesh position={[0, 0.7, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.12, 0.2, 16]} />
        <meshStandardMaterial color="#16213e" roughness={0.7} metalness={0.3} />
      </mesh>

      {/* Head */}
      <mesh position={[0, 1.0, 0]} castShadow>
        <sphereGeometry args={[0.25, 32, 32]} />
        <meshStandardMaterial color="#1a1a2e" roughness={0.5} metalness={0.4} />
      </mesh>

      {/* KINETIC cyan accent line on torso */}
      <mesh position={[0, 0, 0.41]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.1, 0.35, 32]} />
        <meshBasicMaterial color="#0ea5e9" transparent opacity={0.6} />
      </mesh>
    </group>
  );
}

/**
 * 3D Content component - separated to avoid loading in test environment
 */
export function Dummy3DContent({ zoom, cameraRef, onZoomIn, onZoomOut, onReset }: {
  zoom: number;
  cameraRef: React.RefObject<THREE.PerspectiveCamera>;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
}) {
  return (
    <>
      <Canvas
        style={{ width: '100%', height: '100%' }}
        gl={{ antialias: true, alpha: true }}
      >
        <PerspectiveCamera
          ref={cameraRef}
          makeDefault
          position={[0, 0, zoom]}
          fov={50}
        />
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          minPolarAngle={Math.PI / 6}
          maxPolarAngle={Math.PI / 2}
          autoRotate
          autoRotateSpeed={1}
        />
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
        <directionalLight position={[-5, 5, -5]} intensity={0.5} />
        <DummyMesh />
      </Canvas>

      {/* Control Panel Overlay */}
      <div
        className="dummy-3d-controls"
        style={{
          position: 'absolute',
          bottom: '12px',
          right: '12px',
          display: 'flex',
          gap: '6px',
          background: 'var(--glass)',
          backdropFilter: 'blur(12px)',
          padding: '6px',
          borderRadius: '8px',
          border: '1px solid var(--glass-edge)',
        }}
      >
        <Button
          size="icon"
          variant="outline"
          onClick={onZoomIn}
          title="Zoom In"
          style={{ width: '32px', height: '32px' }}
        >
          <Plus size={14} />
        </Button>
        <Button
          size="icon"
          variant="outline"
          onClick={onZoomOut}
          title="Zoom Out"
          style={{ width: '32px', height: '32px' }}
        >
          <Minus size={14} />
        </Button>
        <Button
          size="icon"
          variant="outline"
          onClick={onReset}
          title="Reset View"
          style={{ width: '32px', height: '32px' }}
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
