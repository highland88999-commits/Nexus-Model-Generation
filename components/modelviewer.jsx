'use client'
import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, useGLTF, Center, Stage } from '@react-three/drei'

// 1. The component that physically handles loading the mesh
function GeneratedMesh({ url }) {
  // useGLTF handles caching and Draco decompression automatically.
  const { scene } = useGLTF(url)
  return <primitive object={scene} dispose={null} castShadow receiveShadow scale={1.5} />
}

// 2. A fallback component for the holographic aesthetic while the file downloads
function LoaderFallback() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#00f3ff" wireframe emissive="#00f3ff" emissiveIntensity={0.5} />
    </mesh>
  )
}

// 3. The primary exported component
export default function ModelViewer({ modelUrl }) {
  if (!modelUrl) return null

  return (
    <div className="w-full h-96 mt-8 border border-cyan-500/50 shadow-[0_0_15px_rgba(0,243,255,0.3)] bg-black/40 backdrop-blur-md rounded-xl overflow-hidden relative z-10">
      <Canvas shadows camera={{ position: [0, 0, 4], fov: 50 }}>
        <color attach="background" args={['#000000']} />
        
        {/* Holographic Stage setup */}
        <Stage environment="city" intensity={0.5} adjustCamera={true}>
          <Center>
            <Suspense fallback={<LoaderFallback />}>
              <GeneratedMesh url={modelUrl} />
            </Suspense>
          </Center>
        </Stage>

        {/* Holographic rim lighting */}
        <ambientLight intensity={0.2} />
        <directionalLight position={[5, 5, 5]} intensity={1} color="#ff00ea" />
        <directionalLight position={[-5, 5, -5]} intensity={1} color="#ffd700" />
        
        <OrbitControls 
          autoRotate 
          autoRotateSpeed={2} 
          enableZoom={true} 
          enablePan={true}
          makeDefault 
        />
      </Canvas>
    </div>
  )
}

// Pre-load logic
useGLTF.preload = (url) => useGLTF.preload(url)
