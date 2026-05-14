import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useSession } from '../../context/SessionContext';
import { api } from '../../api/client';
import { Loader2, ArrowRight, Layers, Cpu, Zap, CheckCircle2, Code2 } from 'lucide-react';

export default function PipelinePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { session } = useSession();
  
  const clusterName = searchParams.get('cluster');
  const blockIndex = parseInt(searchParams.get('block') || '1');
  
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState(null);
  const [stitchCode, setStitchCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!session) {
      navigate('/');
      return;
    }
    
    async function loadDetails() {
      try {
        const data = await api.getPipelineDetails(session.session_id, clusterName, blockIndex);
        setDetails(data);
      } catch (err) {
        console.error("Failed to load pipeline details", err);
      } finally {
        setLoading(false);
      }
    }
    
    loadDetails();
  }, [session, clusterName, blockIndex]);

  const handleStitch = async () => {
    setIsSubmitting(true);
    try {
      await api.submitStitch({
        session_id: session.session_id,
        cluster_name: clusterName,
        block_index: blockIndex,
        stitch_attempt: stitchCode
      });
      setSuccess(true);
      setTimeout(() => {
        navigate('/app');
      }, 2000);
    } catch (err) {
      console.error("Stitch failed", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const cleanCode = (code) => {
    if (!code) return '';
    return code.replace(/```python/g, '').replace(/```/g, '').trim();
  };

  const cleanMission = (text) => {
    if (!text) return '';
    return text.replace(/.*?"Mission:?\s*(.*?)"/i, '$1')
               .replace(/Here is the.*?:/i, '')
               .trim();
  };

  const renderMarkdown = (text) => {
    // Basic bolding: **text** -> <strong>text</strong>
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-extrabold text-[#7C3AED]">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  if (loading) return (
    <div className="h-full flex flex-col items-center justify-center gap-4 font-mono">
      <Loader2 className="animate-spin text-[#7C3AED]" size={40} />
      <div className="animate-pulse text-text-secondary italic">AI is reconstructing module architecture...</div>
    </div>
  );

  return (
    <div className="flex flex-col gap-8 max-w-[1600px] mx-auto pb-20 px-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="text-[#7C3AED] font-mono text-[11px] font-bold uppercase tracking-[0.15em] flex items-center gap-2">
            <Layers size={14} /> Pipeline Block {blockIndex}
          </div>
          <div className="px-3 py-1 rounded-full bg-[#7C3AED]/10 text-[#7C3AED] text-[10px] font-bold font-mono border border-[#7C3AED]/20 uppercase tracking-wider">
            System Architecture
          </div>
        </div>
        <h1 className="text-[42px] font-extrabold text-text-primary tracking-tight leading-none">
          {clusterName} Pipeline
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Module A: Source */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <div className="flex items-center gap-2 px-2 text-text-secondary font-mono text-[11px] font-bold uppercase tracking-widest">
            <Code2 size={14} /> Source: {details.source_module_name}
          </div>
          <div className="glass-heavy rounded-3xl border border-white/60 overflow-hidden flex-1 min-h-[450px] shadow-sm">
            <div className="bg-[#1A1814] p-6 font-mono font-medium text-[12px] text-[#059669] h-full overflow-y-auto custom-scrollbar leading-relaxed">
              <pre className="whitespace-pre-wrap">{cleanCode(details.source_code)}</pre>
            </div>
          </div>
        </div>

        {/* Center: Stitch Editor */}
        <div className="lg:col-span-6 flex flex-col gap-6">
          <div className="glass-heavy p-8 rounded-[32px] border border-[#7C3AED]/40 bg-[#7C3AED]/5 relative overflow-hidden shadow-sm">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#7C3AED]/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#7C3AED] text-white flex items-center justify-center shadow-lg shadow-[#7C3AED]/20">
                <Zap size={18} fill="white" />
              </div>
              <h3 className="font-mono font-bold text-text-primary uppercase text-[12px] tracking-[0.2em]">The Stitch Mission</h3>
            </div>
            <p className="text-[17px] text-text-primary leading-[1.6] font-medium tracking-tight">
              {renderMarkdown(cleanMission(details.mission_description))}
            </p>
          </div>

          <div className="glass-heavy rounded-[32px] border border-white/60 overflow-hidden relative group shadow-2xl">
            <div className="bg-[#1A1814] px-8 py-5 flex items-center justify-between border-b border-white/5">
              <div className="flex gap-2">
                <div className="w-3.5 h-3.5 rounded-full bg-[#FC5F57]"></div>
                <div className="w-3.5 h-3.5 rounded-full bg-[#FDBC2C]"></div>
                <div className="w-3.5 h-3.5 rounded-full bg-[#34C749]"></div>
              </div>
              <div className="text-white/40 font-mono text-[11px] uppercase tracking-widest">bridge_logic.py</div>
            </div>
            
            <textarea
              value={stitchCode}
              onChange={(e) => setStitchCode(e.target.value)}
              placeholder="# Write your glue code here..."
              className="w-full h-[400px] bg-[#1A1814] text-white/90 font-mono text-[16px] p-10 outline-none resize-none leading-relaxed transition-all focus:bg-[#1C1A16]"
              spellCheck="false"
            />
            
            <div className="absolute bottom-8 right-8">
              {success ? (
                <div className="flex items-center gap-3 bg-[#059669] text-white px-10 py-5 rounded-2xl font-mono font-bold animate-in zoom-in-95 duration-300 shadow-xl shadow-[#059669]/20">
                  <CheckCircle2 size={24} /> STITCH VERIFIED
                </div>
              ) : (
                <button
                  onClick={handleStitch}
                  disabled={isSubmitting || !stitchCode.trim()}
                  className="bg-[#7C3AED] text-white px-12 py-6 rounded-2xl font-mono font-bold hover:bg-[#6D28D9] transition-all flex items-center gap-4 shadow-[0_15px_50px_rgba(124,58,237,0.5)] hover:shadow-[0_20px_60px_rgba(124,58,237,0.7)] disabled:opacity-50 hover:-translate-y-1 active:translate-y-0"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" /> : (
                    <>
                      Deploy Stitch <Zap size={22} fill="white" />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Module B: Target */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <div className="flex items-center gap-2 px-2 text-text-secondary font-mono text-[11px] font-bold uppercase tracking-widest justify-end">
            Target: {details.target_module_name} <Code2 size={14} />
          </div>
          <div className="glass-heavy rounded-3xl border border-white/60 overflow-hidden flex-1 min-h-[450px] shadow-sm">
            <div className="bg-[#1A1814] p-6 font-mono font-medium text-[12px] text-[#7C3AED] h-full overflow-y-auto custom-scrollbar leading-relaxed">
              <pre className="whitespace-pre-wrap">{cleanCode(details.target_code)}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
