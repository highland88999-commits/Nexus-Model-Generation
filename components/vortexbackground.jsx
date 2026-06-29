'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { useMemo, useRef } from 'react';

function VortexParticles() {
  const pointsRef = useRef<THREE.Points>(null!);

  const particles = useMemo(() => {
    const count = 2500;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const radius = Math.random() * 12 + 2;
      const angle = Math.random() * Math.PI * 2;
      const y = (Math.random() - 0.5) * 25;

      positions[i3] = Math.cos(angle) * radius;
      positions[i3 + 1] = y;
      positions[i3 + 2] = Math.sin(angle) * radius;

      // Cyan → Magenta holographic colors
      colors[i3] = 0.2 + Math.random() * 0.4;
      colors[i3 + 1] = 0.6 + Math.random() * 0.4;
      colors[i3 + 2] = 1.0;

      sizes[i] = Math.random() * 0.8 + 0.3;
    }
    return { positions, colors, sizes };
  }, []);

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.08;
      pointsRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.03) * 0.15;
    }
  });

  return (
    <Points ref={pointsRef} positions={particles.positions} colors={particles.colors}>
      <PointMaterial
        transparent
        vertexColors
        size={0.045}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </Points>
  );
}

export default function VortexBackground() {
  return (
    <div className="fixed inset-0 z-[-1] bg-black">
      <Canvas camera={{ position: [0, 0, 22], fov: 55 }}>
        <VortexParticles />
        <ambientLight intensity={0.2} />
      </Canvas>
      {/* Subtle holographic overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(#00f0ff_0.8px,transparent_1px)] bg-[length:4px_4px] opacity-10" />
    </div>
  );
}
