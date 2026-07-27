'use client';

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Icosahedron, Octahedron, Torus, Float } from '@react-three/drei';
import * as THREE from 'three';

function FloatingMeshes() {
  const group = useRef<THREE.Group>(null);

  // Slowly rotate the entire group and add parallax based on mouse
  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.getElapsedTime();
    
    // Slow ambient rotation
    group.current.rotation.y = Math.sin(t / 4) / 4;
    group.current.rotation.x = Math.cos(t / 4) / 4;

    // Parallax effect following pointer (state.pointer is normalized -1 to 1)
    const targetX = (state.pointer.x * Math.PI) / 10;
    const targetY = (state.pointer.y * Math.PI) / 10;

    group.current.rotation.y += 0.05 * (targetX - group.current.rotation.y);
    group.current.rotation.x += 0.05 * (targetY - group.current.rotation.x);
  });

  // Material setup for glassmorphism / emerald glow look
  const glassMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#10b981', // Emerald
        transmission: 0.9,
        opacity: 1,
        metalness: 0.2,
        roughness: 0.1,
        ior: 1.5,
        thickness: 2,
        specularIntensity: 1,
        specularColor: new THREE.Color('#34d399'),
        transparent: true,
        wireframe: true, // Wireframe gives a very tech/cool aesthetic
      }),
    []
  );

  const solidMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#8b5cf6', // Violet
        roughness: 0.4,
        metalness: 0.8,
        emissive: '#4c1d95',
        emissiveIntensity: 0.2,
        transparent: true,
        opacity: 0.6,
      }),
    []
  );

  return (
    <group ref={group}>
      <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
        <Icosahedron args={[1, 0]} position={[-3, 2, -2]} rotation={[0.5, 0.2, 0]} material={glassMaterial} />
      </Float>

      <Float speed={1.5} rotationIntensity={1} floatIntensity={2}>
        <Torus args={[0.8, 0.2, 16, 32]} position={[3, -1, -3]} rotation={[-0.5, 0.5, 0]} material={solidMaterial} />
      </Float>

      <Float speed={2.5} rotationIntensity={0.8} floatIntensity={1.5}>
        <Octahedron args={[0.6, 0]} position={[-2, -2, -1]} rotation={[1, 0, 0.5]} material={glassMaterial} />
      </Float>

      <Float speed={1} rotationIntensity={0.3} floatIntensity={2}>
        <Icosahedron args={[1.5, 0]} position={[4, 3, -5]} rotation={[-0.2, -0.4, 0]} material={glassMaterial} />
      </Float>
    </group>
  );
}

export function Floating3DBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 opacity-40">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 45 }}
        gl={{ alpha: true, antialias: true }}
        dpr={[1, 2]}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <spotLight position={[-10, -10, -5]} intensity={0.5} color="#10b981" />
        <FloatingMeshes />
      </Canvas>
    </div>
  );
}
