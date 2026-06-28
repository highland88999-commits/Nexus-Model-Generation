'use client'
import { useState } from 'react'
import ModelGenerator from '../components/modelgenerator'
import ModelViewer from '../components/modelviewer'

export default function NexusHub() {
  const [activeModelUrl, setActiveModelUrl] = useState(null)
  
  // Hardcoded for the current build phase. 
  // Eventually, this will tie into your Supabase authentication state.
  const tempUserId = "dev-user-001" 

  const handleGenerationComplete = (url) => {
    setActiveModelUrl(url)
  }

  return (
    <main 
      spellCheck="false" 
      className="relative min-h-screen w-full flex flex-col items-center justify-start py-20 overflow-y-auto bg-[#030712] text-white font-sans selection:bg-pink-500 selection:text-white"
    >
      
      {/* Background Holographic Grid (Lightweight alternative to 3D Bloom) */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20" 
           style={{ 
             backgroundImage: 'linear-gradient(#00f3ff 1px, transparent 1px), linear-gradient(90deg, #00f3ff 1px, transparent 1px)', 
             backgroundSize: '40px 40px',
             perspective: '1000px',
             transform: 'rotateX(60deg) translateY(-100px) scale(2)'
           }}>
      </div>

      {/* Centered Content Container */}
      <div className="relative z-10 w-full max-w-2xl px-6 flex flex-col items-center justify-center gap-8 mt-10">
        
        {/* Header Section */}
        <div className="text-center w-full">
          <h1 className="text-5xl font-extrabold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-pink-500 drop-shadow-[0_0_15px_rgba(255,0,234,0.6)] uppercase">
            Olympus Forge
          </h1>
          <p className="mt-4 text-cyan-200 tracking-[0.3em] text-xs opacity-80 uppercase font-mono">
            Initialize Digital Matter Generation
          </p>
        </div>

        {/* Generator Interface */}
        <div className="w-full p-1 rounded-xl bg-gradient-to-b from-cyan-500/20 to-pink-500/20 backdrop-blur-md shadow-[0_0_40px_rgba(0,243,255,0.1)] border border-cyan-500/30">
          <ModelGenerator 
            userId={tempUserId} 
            onGenerationComplete={handleGenerationComplete} 
          />
        </div>

        {/* The 3D Viewer Projection Array */}
        {activeModelUrl && (
          <div className="w-full flex flex-col items-center mt-4 animate-pulse-glow">
            <h2 className="text-pink-400 uppercase tracking-[0.2em] text-xs mb-3 drop-shadow-[0_0_8px_rgba(255,0,234,0.8)] font-mono">
              Asset Stabilized
            </h2>
            <ModelViewer modelUrl={activeModelUrl} />
          </div>
        )}

      </div>
    </main>
  )
}
