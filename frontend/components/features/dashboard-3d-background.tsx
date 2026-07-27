'use client';

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sphere } from '@react-three/drei';
import * as THREE from 'three';

function DashboardParticles() {
  const group = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.getElapsedTime();
    // Very slow, subtle rotation
    group.current.rotation.y = t * 0.05;
    
    // Extremely subtle parallax so it's not distracting
    const targetX = (state.pointer.x * Math.PI) / 40;
    const targetY = (state.pointer.y * Math.PI) / 40;
    group.current.rotation.y += 0.02 * (targetX - group.current.rotation.y);
    group.current.rotation.x += 0.02 * (targetY - group.current.rotation.x);
  });

  const particleMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#10b981', // Emerald
        transparent: true,
        opacity: 0.15, // Very faint
      }),
    []
  );

  const violetMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#8b5cf6', // Violet
        transparent: true,
        opacity: 0.1, // Even fainter
      }),
    []
  );

  return (
    <group ref={group}>
      {/* Scattered particles across the dashboard background */}
      <Float speed={0.5} rotationIntensity={0.2} floatIntensity={0.5}>
        <Sphere args={[0.05, 16, 16]} position={[-4, 2, -2]} material={particleMaterial} />
      </Float>
      <Float speed={0.8} rotationIntensity={0.1} floatIntensity={0.4}>
        <Sphere args={[0.08, 16, 16]} position={[5, -1, -5]} material={violetMaterial} />
      </Float>
      <Float speed={0.4} rotationIntensity={0.3} floatIntensity={0.6}>
        <Sphere args={[0.04, 16, 16]} position={[-3, -3, -3]} material={particleMaterial} />
      </Float>
      <Float speed={0.6} rotationIntensity={0.2} floatIntensity={0.4}>
        <Sphere args={[0.06, 16, 16]} position={[3, 4, -4]} material={violetMaterial} />
      </Float>
      <Float speed={0.3} rotationIntensity={0.1} floatIntensity={0.3}>
        <Sphere args={[0.03, 16, 16]} position={[0, -4, -6]} material={particleMaterial} />
      </Float>
    </group>
  );
}

export function Dashboard3DBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 opacity-50">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 45 }}
        gl={{ alpha: true, antialias: false }} // antialias false for performance on subtle bg
      >
        <DashboardParticles />
      </Canvas>
    </div>
  );
}
