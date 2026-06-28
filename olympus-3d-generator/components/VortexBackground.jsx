'use client'
import { useRef, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'

function ParticleVortex() {
  const pointsRef = useRef()
  const { mouse } = useThree()

  // Generate a cylindrical vortex of particles
  const particleCount = 4000
  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(particleCount * 3)
    const col = new Float32Array(particleCount * 3)
    const colorPink = new THREE.Color('#ff00ea')
    const colorCyan = new THREE.Color('#00f3ff')
    const colorBlue = new THREE.Color('#0d00ff')

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3
      const radius = 2 + Math.random() * 3
      const theta = Math.random() * Math.PI * 2
      const y = (Math.random() - 0.5) * 50

      pos[i3] = Math.cos(theta) * radius
      pos[i3 + 1] = y
      pos[i3 + 2] = Math.sin(theta) * radius

      // Mix colors based on height and random variance for the Black Bloom aesthetic
      const mixedColor = colorBlue.clone().lerp(
        Math.random() > 0.5 ? colorPink : colorCyan, 
        Math.random()
      )
      col[i3] = mixedColor.r
      col[i3 + 1] = mixedColor.g
      col[i3 + 2] = mixedColor.b
    }
    return [pos, col]
  }, [])

  // Raycasting interaction loop
  useFrame((state, delta) => {
    if (!pointsRef.current) return
    // Rotate the vortex
    pointsRef.current.rotation.y += delta * 0.2
    
    // Raycasted mouse interaction: tilt the vortex toward the cursor
    const targetX = (mouse.x * Math.PI) / 10
    const targetZ = (mouse.y * Math.PI) / 10
    
    pointsRef.current.rotation.x += (targetZ - pointsRef.current.rotation.x) * 0.05
    pointsRef.current.rotation.z += (targetX - pointsRef.current.rotation.z) * 0.05
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={particleCount} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={particleCount} array={colors} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.05} vertexColors transparent opacity={0.8} blending={THREE.AdditiveBlending} depthWrite={false} />
    </points>
  )
}

export default function VortexBackground() {
  return (
    <div className="fixed inset-0 z-0 bg-black pointer-events-auto">
      <Canvas camera={{ position: [0, -5, 10], fov: 60 }}>
        <fog attach="fog" args={['#000000', 5, 25]} />
        <ParticleVortex />
        {/* The UnrealBloomPass implementation via postprocessing */}
        <EffectComposer disableNormalPass>
          <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} height={300} intensity={2.5} />
        </EffectComposer>
      </Canvas>
    </div>
  )
}
