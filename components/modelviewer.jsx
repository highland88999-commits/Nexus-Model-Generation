import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, useGLTF, Center, Stage } from '@react-three/drei'

// 1. The component that physically handles loading the mesh
function GeneratedMesh({ url }) {
  // useGLTF automatically manages caching and uses a CDN-hosted Draco decoder by default.
  // It handles the decompression on a worker thread so the main UI loop doesn't stutter.
  const { scene } = useGLTF(url)

  return (
    <primitive 
      object={scene} 
      dispose={null} 
      castShadow 
      receiveShadow
    />
  )
}

// 2. A fallback component to show while the file is downloading/parsing
function LoaderFallback() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#4b5563" wireframe />
    </mesh>
  )
}

// 3. The primary exported layout containing the R3F Canvas
export default function ModelViewer({ modelUrl }) {
  if (!modelUrl) {
    return (
      <div className="w-full h-96 flex items-center justify-center bg-gray-950 rounded-lg border border-gray-800 text-gray-500">
        Waiting for asset generation to complete...
      </div>
    )
  }

  return (
    <div className="w-full h-96 bg-gray-950 rounded-lg border border-gray-800 relative overflow-hidden">
      <Canvas 
        shadows 
        camera={{ position: [0, 0, 4], fov: 50 }}
        gl={{ preserveDrawingBuffer: true }}
      >
        <color attach="background" args={['#030712']} />
        
        {/* Stage handles automatic professional framing, lighting setups, and contact shadows */}
        <Stage intensity={0.5} environment="city" adjustCamera={true}>
          <Center>
            <Suspense fallback={<LoaderFallback />}>
              <GeneratedMesh url={modelUrl} />
            </Suspense>
          </Center>
        </Stage>

        <OrbitControls 
          enablePan={true} 
          enableZoom={true} 
          minDistance={1} 
          maxDistance={10} 
          makeDefault
        />
      </Canvas>
      
      <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md text-xs text-gray-400 px-2 py-1 rounded">
        Orbit: Left Click | Pan: Right Click / Shift | Zoom: Scroll
      </div>
    </div>
  )
}

// Pre-load logic to avoid popping lags when the URL updates
useGLTF.preload = (url) => useGLTF.preload(url)
