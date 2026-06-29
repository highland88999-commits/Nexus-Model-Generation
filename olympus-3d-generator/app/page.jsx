'use client';

import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import { Send, Download, RefreshCw } from 'lucide-react';
import VortexBackground from '@/components/VortexBackground';

export default function NexusGenerator() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [jobStatus, setJobStatus] = useState<'idle' | 'processing' | 'complete' | 'failed'>('idle');
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setJobStatus('processing');
    setError('');
    setResultUrl(null);

    try {
      // TODO: Replace with your actual Modal endpoint or Next.js API route
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          user_id: 'demo-user', // Replace with real auth
        }),
      });

      const data = await res.json();

      if (data.status === 'success') {
        setResultUrl(data.url);
        setJobStatus('complete');
      } else {
        setJobStatus('failed');
        setError(data.error || 'Generation failed');
      }
    } catch (err) {
      setJobStatus('failed');
      setError('Failed to connect to generation service');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      <VortexBackground />

      {/* Holographic Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/60 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-400 to-purple-500" />
            <div>
              <div className="font-mono text-2xl tracking-[4px] font-light">NEXUS</div>
              <div className="text-[10px] text-cyan-400 -mt-1">OLYMPUS 3D ENGINE</div>
            </div>
          </div>
          <div className="text-xs font-mono text-white/60 tracking-widest">v1.1 • MODAL POWERED</div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 pt-24 pb-20">
        {/* Hero */}
        <div className="text-center mb-16">
          <div className="inline-block px-4 py-1 mb-4 text-xs font-mono tracking-[3px] border border-white/20 rounded-full">
            TEXT → PHOTOREAL 3D • REAL-TIME
          </div>
          <h1 className="text-7xl font-light tracking-[-3px] mb-4">
            Generate.<br />Extrude.<br />Own.
          </h1>
          <p className="text-xl text-white/70 max-w-md mx-auto">
            Photorealistic 3D models from text in seconds.<br />Powered by TRELLIS + SDXL on Modal.
          </p>
        </div>

        {/* Main Generation Panel - Centered Holographic Card */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="relative rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-2xl p-10 shadow-2xl">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-cyan-500/5 via-transparent to-purple-500/5 pointer-events-none" />

            <div className="mb-6">
              <div className="text-xs font-mono tracking-[2px] text-cyan-400 mb-2">PROMPT ENGINE</div>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="A cyberpunk samurai standing on a neon rooftop at night, intricate details, cinematic lighting..."
                className="w-full h-32 resize-y bg-black/40 border border-white/10 rounded-2xl p-6 text-lg placeholder:text-white/40 focus:outline-none focus:border-cyan-400/50 transition-all spellcheck={false}"
                spellCheck={false}
              />
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="group w-full flex items-center justify-center gap-3 bg-white text-black font-medium py-5 rounded-2xl text-lg tracking-wider hover:bg-white/90 active:scale-[0.985] disabled:opacity-50 transition-all duration-200"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="animate-spin w-5 h-5" /> GENERATING IN THE VORTEX...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5 group-hover:-translate-y-0.5 transition" /> LAUNCH GENERATION
                </>
              )}
            </button>
          </div>
        </div>

        {/* Status + 3D Viewer Section */}
        {(jobStatus !== 'idle' || resultUrl) && (
          <div className="max-w-4xl mx-auto grid md:grid-cols-5 gap-6">
            {/* Status Panel */}
            <div className="md:col-span-2 rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-2xl p-8 h-fit">
              <div className="text-xs font-mono tracking-[2px] text-white/60 mb-4">MISSION CONTROL</div>
              
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-white/60">STATUS</div>
                  <div className={`text-3xl font-light tracking-tight mt-1 ${
                    jobStatus === 'complete' ? 'text-emerald-400' : 
                    jobStatus === 'processing' ? 'text-cyan-400' : 'text-red-400'
                  }`}>
                    {jobStatus.toUpperCase()}
                  </div>
                </div>

                {error && <div className="text-red-400 text-sm">{error}</div>}

                {resultUrl && (
                  <a 
                    href={resultUrl} 
                    download 
                    className="inline-flex items-center gap-2 mt-4 px-6 py-3 border border-white/20 hover:bg-white/5 rounded-2xl text-sm transition"
                  >
                    <Download className="w-4 h-4" /> DOWNLOAD GLB
                  </a>
                )}
              </div>
            </div>

            {/* 3D Viewer - Holographic */}
            <div className="md:col-span-3 rounded-3xl border border-white/10 bg-black/60 backdrop-blur-2xl overflow-hidden aspect-[16/10] relative">
              {resultUrl ? (
                <Canvas camera={{ position: [0, 1.5, 5], fov: 50 }} style={{ background: 'transparent' }}>
                  <ambientLight intensity={0.6} />
                  <pointLight position={[10, 10, 10]} intensity={1.2} />
                  {/* TODO: Load actual GLTF with <Gltf src={resultUrl} /> from drei */}
                  <mesh>
                    <boxGeometry args={[2, 2, 2]} />
                    <meshStandardMaterial color="#00f0ff" emissive="#00f0ff" emissiveIntensity={0.3} />
                  </mesh>
                  <OrbitControls enablePan={false} enableZoom={true} />
                </Canvas>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-white/30 text-sm tracking-widest">
                  {jobStatus === 'processing' ? 'RENDERING IN THE VORTEX...' : 'AWAITING GENERATION'}
                </div>
              )}
            </div>
          </div>
        )}

        {/* History / Gallery (Scrollable) */}
        <div className="max-w-5xl mx-auto mt-20">
          <div className="text-xs font-mono tracking-[3px] text-white/50 mb-6 px-1">PREVIOUS EXTRACTIONS</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-h-[420px] overflow-y-auto pr-2 custom-scroll">
            {[1,2,3,4].map((i) => (
              <div key={i} className="group aspect-square rounded-2xl border border-white/10 bg-white/[0.015] hover:border-white/30 transition-all overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-purple-500/10" />
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent">
                  <div className="text-sm truncate">Cybernetic Owl • {i}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx global>{`
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: #ffffff22; border-radius: 20px; }
      `}</style>
    </div>
  );
}
