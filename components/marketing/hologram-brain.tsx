"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { useTheme } from "next-themes";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

/**
 * Hologram brain — loads /models/brain.glb and spins it slowly.
 * Materials are recoloured per theme so the brain reads clearly on
 * both light (medical blue, emissive lift) and dark backgrounds
 * (keep the original holographic look).
 */

const PALETTE = {
  light: {
    base: new THREE.Color("#1e3a8a"),     // deep medical blue (darker dots in light mode)
    emissive: new THREE.Color("#3b82f6"), // medium-blue glow
    emissiveIntensity: 0.35,
    rim: new THREE.Color("#1d4ed8"),      // deep outline tint
  },
  dark: {
    base: new THREE.Color("#a8d2ff"),     // pale blue (close to GLB original)
    emissive: new THREE.Color("#3b82f6"),
    emissiveIntensity: 0.85,
    rim: new THREE.Color("#7fb6ff"),
  },
} as const;

function applyHologramMaterial(
  scene: THREE.Object3D,
  mode: keyof typeof PALETTE
): void {
  const { base, emissive, emissiveIntensity } = PALETTE[mode];
  scene.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if ((mesh as any).isMesh) {
      const m = new THREE.MeshStandardMaterial({
        color: base.clone(),
        emissive: emissive.clone(),
        emissiveIntensity,
        metalness: 0.15,
        roughness: 0.45,
        transparent: true,
        opacity: 0.95,
        side: THREE.DoubleSide,
      });
      // Dispose the old material if it's an object (avoid leak on hot-reload)
      const old = mesh.material;
      mesh.material = m;
      if (Array.isArray(old)) old.forEach((mat) => mat.dispose?.());
      else (old as any)?.dispose?.();
    }
  });
}

function BrainModel({ themeMode }: { themeMode: keyof typeof PALETTE }) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF("/models/brain.glb");

  // Clone + auto-fit to a normalised size, recoloured per theme.
  const fitted = useMemo(() => {
    const cloned = scene.clone(true);

    const box = new THREE.Box3().setFromObject(cloned);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    const longest = Math.max(size.x, size.y, size.z) || 1;
    const scale = 2.4 / longest;

    cloned.position.sub(center);
    cloned.scale.setScalar(scale);

    applyHologramMaterial(cloned, themeMode);
    return cloned;
  }, [scene, themeMode]);

  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.25;
  });

  return (
    <group ref={groupRef}>
      <primitive object={fitted} />
    </group>
  );
}

useGLTF.preload("/models/brain.glb");

export function HologramBrain({ className }: { className?: string }) {
  const { resolvedTheme } = useTheme();
  // Avoid hydration mismatch — pick theme only after mount
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const themeMode: keyof typeof PALETTE =
    !mounted || resolvedTheme === "dark" ? "dark" : "light";

  const ambient = themeMode === "light" ? 1.4 : 0.9;
  const keyIntensity = themeMode === "light" ? 1.1 : 0.9;
  const fillIntensity = themeMode === "light" ? 0.6 : 0.4;
  const fillColor = themeMode === "light" ? "#bfdbfe" : "#88aaff";

  return (
    <div className={className} style={{ width: "100%", height: "100%" }}>
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0, 4], fov: 42 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={ambient} />
        <directionalLight position={[5, 5, 5]} intensity={keyIntensity} />
        <directionalLight
          position={[-5, -3, -5]}
          intensity={fillIntensity}
          color={fillColor}
        />
        <Suspense fallback={null}>
          <BrainModel themeMode={themeMode} />
        </Suspense>
      </Canvas>
    </div>
  );
}
