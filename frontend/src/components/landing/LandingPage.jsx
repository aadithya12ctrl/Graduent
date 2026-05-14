import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Brain, Code2, Sparkles, Loader2 } from 'lucide-react';
import { useSession } from '../../context/SessionContext';
import { api } from '../../api/client';

export default function LandingPage() {
  const navigate = useNavigate();
  const { setSession } = useSession();
  const [theme, setTheme] = useState('');
  const [stream, setStream] = useState('ML/AI');
  const [typedText, setTypedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // ... (keep streams and fullText)
  const streams = [
    { id: 'ML/AI', icon: Brain, desc: 'train models' },
    { id: 'DSA', icon: Code2, desc: 'master algos' },
    { id: 'LLMs', icon: Sparkles, desc: 'prompt & tune' }
  ];
  const fullText = "> system.init()\\n> loading graduent...\\n> status: ok\\n> \\n> welcome.";

  React.useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setTypedText(fullText.slice(0, i));
      i++;
      if (i > fullText.length) clearInterval(interval);
    }, 60);
    return () => clearInterval(interval);
  }, []);

  const handleStart = async () => {
    if (!theme.trim()) return;
    setIsLoading(true);
    try {
      const response = await api.createSession(stream, theme.trim());
      setSession(response);
      navigate('/app');
    } catch (error) {
      console.error("Failed to start session:", error);
      alert("Failed to start session. Ensure the backend is running on port 8000.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden">
      {/* Backgrounds */}
      <div className="gradient-bg"></div>
      <div className="grain-bg grain-landing"></div>

      {/* Decorative Side Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        
        {/* Left Side Elements */}
        <div className="absolute top-[18%] left-[22%] animate-float -rotate-6">
          <div className="glass-light px-4 py-2 rounded-lg border border-[#7C3AED]/30 text-[#7C3AED] font-mono text-[12px] font-medium shadow-sm bg-[#EDE9FE]/40">
            [scaffold]
          </div>
        </div>

        <div className="absolute top-[70%] left-[24%] animate-float-delayed rotate-3">
          <div className="glass px-5 py-3 rounded-xl border border-black/10 text-text-primary font-mono text-[13px] shadow-[0_8px_24px_rgba(26,24,20,0.06)] bg-white/40 backdrop-blur-md">
            <span className="text-[#A8A49E]">1</span> def tokenize(text):<br/>
            <span className="text-[#A8A49E]">2</span> &nbsp;&nbsp;tokens = <span className="border-b-2 border-[#7C3AED] px-3 text-transparent">___</span>
          </div>
        </div>
        
        <div className="absolute top-[82%] left-[10%] animate-float -rotate-2">
          <div className="glass-light px-4 py-2 rounded-lg border border-[#D97706]/30 text-[#D97706] font-mono text-[12px] font-medium shadow-sm bg-[#FEF3C7]/40">
            import torch.nn as nn
          </div>
        </div>

        {/* Right Side Elements */}
        <div className="absolute top-[15%] right-[25%] animate-float-delayed rotate-6">
          <div className="glass-light px-4 py-2 rounded-lg border border-[#059669]/30 text-[#059669] font-mono text-[12px] font-medium shadow-sm bg-[#D1FAE5]/40">
            [output]
          </div>
        </div>

        <div className="absolute top-[68%] right-[28%] animate-float -rotate-3">
          <div className="glass px-5 py-3 rounded-xl border border-black/10 text-text-primary font-mono text-[13px] shadow-[0_8px_24px_rgba(26,24,20,0.06)] bg-white/40 backdrop-blur-md flex flex-col gap-1">
            <div className="text-[11px] uppercase text-[#A8A49E]">line 2</div>
            <div>type: List[str]</div>
            <div>shape: (128,)</div>
          </div>
        </div>
        
        <div className="absolute top-[85%] right-[15%] animate-float-delayed rotate-12">
          <div className="glass-light px-4 py-2 rounded-lg border border-[#DC2626]/30 text-[#DC2626] font-mono text-[12px] font-medium shadow-sm bg-[#FEE2E2]/40">
            Exception: CUDA out of memory
          </div>
        </div>

        {/* Top Elements: QWERTYUIOP */}
        <div className="absolute top-[6%] left-0 w-full flex justify-center gap-4 sm:gap-8 animate-float px-4">
          {['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'].map((char) => (
            <div key={char} className="relative group cursor-pointer w-10 sm:w-14 h-10 sm:h-14 flex-shrink-0">
              <div className="absolute inset-0 bg-[#E5E5E5] rounded-lg sm:rounded-xl translate-y-[4px] sm:translate-y-[6px] shadow-[0_12px_24px_rgba(0,0,0,0.08)] border border-[#D4D4D4]"></div>
              <div className="absolute inset-0 bg-white border border-[#E5E5E5] rounded-lg sm:rounded-xl flex items-center justify-center font-mono text-text-secondary text-[13px] sm:text-[16px] font-bold transform transition-all duration-75 group-hover:translate-y-[2px] group-active:translate-y-[4px] sm:group-active:translate-y-[6px]">
                {char}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Elements: ZXCVBNM */}
        <div className="absolute bottom-[6%] left-0 w-full flex justify-center gap-4 sm:gap-8 animate-float-delayed px-4">
          {['Z', 'X', 'C', 'V', 'B', 'N', 'M'].map((char) => (
            <div key={char} className="relative group cursor-pointer w-10 sm:w-14 h-10 sm:h-14 flex-shrink-0">
              <div className="absolute inset-0 bg-[#E5E5E5] rounded-lg sm:rounded-xl translate-y-[4px] sm:translate-y-[6px] shadow-[0_12px_24px_rgba(0,0,0,0.08)] border border-[#D4D4D4]"></div>
              <div className="absolute inset-0 bg-white border border-[#E5E5E5] rounded-lg sm:rounded-xl flex items-center justify-center font-mono text-text-secondary text-[13px] sm:text-[16px] font-bold transform transition-all duration-75 group-hover:translate-y-[2px] group-active:translate-y-[4px] sm:group-active:translate-y-[6px]">
                {char}
              </div>
            </div>
          ))}
        </div>

        {/* MacOS Style White Tabs on Sides */}
        {/* Left macOS Tab */}
        <div className="absolute top-1/2 left-6 -translate-y-1/2 w-[240px] h-[360px] glass-heavy rounded-2xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.05)] flex flex-col p-4 gap-4">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-[#FC5F57]"></div>
            <div className="w-3 h-3 rounded-full bg-[#FDBC2C]"></div>
            <div className="w-3 h-3 rounded-full bg-[#34C749]"></div>
          </div>
          <div className="font-mono text-[13px] text-text-primary whitespace-pre-line mt-2 leading-relaxed">
            {typedText}<span className="animate-pulse">_</span>
          </div>
        </div>
        
        {/* Right macOS Tab */}
        <div className="absolute top-1/2 right-6 -translate-y-1/2 w-[240px] h-[360px] glass-heavy rounded-2xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.05)] flex flex-col p-4 gap-4">
          <div className="flex gap-2 justify-end">
            <div className="w-3 h-3 rounded-full bg-black/10"></div>
            <div className="w-3 h-3 rounded-full bg-black/10"></div>
            <div className="w-3 h-3 rounded-full bg-black/10"></div>
          </div>
          <div className="font-mono text-[13px] text-text-tertiary whitespace-pre-line mt-2 text-right leading-relaxed">
            [process isolated]<br/><br/>
            threads: 4<br/>
            memory: 12MB<br/>
            cache: HIT<br/>
          </div>
        </div>

      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center max-w-2xl mx-auto w-full px-6 text-center transform -translate-y-[12%]">
        
        <h1 className="font-mono text-[72px] font-extrabold text-text-primary tracking-tight leading-tight flex items-center justify-center">
          <span className="text-text-tertiary font-normal mr-2">/</span>graduent<span className="animate-pulse text-accent-core ml-1">_</span>
        </h1>
        <p className="font-mono text-[16px] text-text-secondary tracking-[0.02em] mt-3 mb-8">
          learn to understand code. not recognize it.
        </p>

        {/* Floating Control Panel */}
        <div className="glass-heavy rounded-[24px] p-4 flex flex-col items-center gap-4 shadow-[0_12px_48px_rgba(26,24,20,0.12)] border border-white/60 w-full max-w-lg">
          
          {/* Stream Selector */}
          <div className="flex w-full gap-2 bg-black/5 p-2 rounded-2xl">
            {streams.map((s) => (
              <button
                key={s.id}
                onClick={() => setStream(s.id)}
                className={`flex-1 py-4 px-2 rounded-xl text-center font-mono transition-all duration-200 ease-in-out flex flex-col items-center justify-center gap-3 ${
                  stream === s.id
                    ? 'bg-[#1A1814] text-[#F8F5F0] shadow-[0_8px_24px_rgba(26,24,20,0.2)] -translate-y-1'
                    : 'text-text-secondary hover:text-text-primary hover:bg-black/10'
                }`}
              >
                <s.icon size={28} className={stream === s.id ? "text-[#00f2fe]" : "opacity-60"} />
                <div className="flex flex-col gap-1">
                  <span className="text-[14px] font-bold tracking-wide">{s.id}</span>
                  <span className={`text-[11px] ${stream === s.id ? 'text-[#F8F5F0]/70' : 'text-text-tertiary'}`}>
                    {s.desc}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="w-full h-[1px] bg-black/10"></div>

          {/* Theme Input & Start */}
          <div className="flex w-full gap-3">
            <input
              type="text"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              onKeyDown={(e) => { if(e.key === 'Enter') handleStart() }}
              placeholder="e.g. pokémon, marvel..."
              className="flex-1 h-12 bg-black/5 rounded-xl px-4 font-mono text-[14px] text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-[#1A1814]/10 transition-all"
            />
            
            <button 
              onClick={handleStart}
              disabled={!theme.trim() || isLoading}
              className="group flex items-center justify-center gap-2 h-12 px-6 rounded-xl transition-all duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed bg-text-primary text-background hover:bg-[#2C2A26] hover:shadow-[0_4px_16px_rgba(26,24,20,0.2)] w-[120px]"
            >
              {isLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  <span className="font-mono font-bold text-[14px]">Start</span>
                  <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
