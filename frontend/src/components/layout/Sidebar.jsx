import React, { useState, useEffect } from 'react';
import { useSession } from '../../context/SessionContext';
import { api } from '../../api/client';
import { CheckCircle2, Circle, Lock, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Sidebar() {
  const [activeTab, setActiveTab] = useState('Roadmap');
  const navigate = useNavigate();
  const tabs = ['Roadmap', 'Error Log', 'Weights', 'Pipeline'];
  const { session } = useSession();
  const [roadmap, setRoadmap] = useState(null);
  const [errorLog, setErrorLog] = useState([]);
  const [weights, setWeights] = useState(null);
  const [pipeline, setPipeline] = useState(null);

  useEffect(() => {
    if (!session) return;

    if (activeTab === 'Roadmap') {
      api.getRoadmap(session.session_id)
        .then(setRoadmap)
        .catch(console.error);
    } else if (activeTab === 'Error Log') {
      api.getErrorLog(session.session_id)
        .then(setErrorLog)
        .catch(console.error);
    } else if (activeTab === 'Weights') {
      api.getErrorProfile(session.session_id)
        .then(setWeights)
        .catch(console.error);
    } else if (activeTab === 'Pipeline') {
      // Find the first cluster name to show
      const clusterName = roadmap?.clusters?.[0]?.cluster_name || 'Sorting';
      api.getPipeline(session.session_id, clusterName)
        .then(setPipeline)
        .catch(console.error);
    }
  }, [session, activeTab]);

  return (
    <div className="w-[320px] h-full glass-heavy border-r border-white/60 shadow-[4px_0_32px_rgba(0,0,0,0.06)] flex flex-col z-20">
      {/* Mac-style Window Controls in Sidebar */}
      <div className="p-4 flex gap-2">
        <div className="w-3 h-3 rounded-full bg-[#FC5F57]"></div>
        <div className="w-3 h-3 rounded-full bg-[#FDBC2C]"></div>
        <div className="w-3 h-3 rounded-full bg-[#34C749]"></div>
      </div>

      {/* Tabs */}
      <div className="h-[48px] border-b border-black/5 flex items-end px-2">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-2 text-[11px] uppercase tracking-[0.06em] font-mono transition-all ${
              activeTab === tab
                ? 'text-text-primary border-b-[2px] border-[#7C3AED] font-bold'
                : 'text-text-tertiary border-b-[2px] border-transparent hover:text-text-secondary'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar font-mono">
        {activeTab === 'Roadmap' ? (
          <div className="flex flex-col gap-6">
            {roadmap?.clusters?.map((cluster, idx) => (
              <div key={idx} className="flex flex-col gap-2">
                <div className="text-[12px] font-bold text-text-secondary uppercase tracking-wider mb-1">
                  {cluster.cluster_name}
                </div>
                {cluster.nodes.map((node, nIdx) => (
                  <div key={nIdx} className={`flex items-start gap-3 p-2 rounded-lg transition-colors ${node.status === 'in_progress' ? 'bg-[#7C3AED]/10 border border-[#7C3AED]/30' : 'hover:bg-black/5'}`}>
                    <div className="mt-0.5">
                      {node.status === 'complete' && <CheckCircle2 size={16} className="text-[#059669]" />}
                      {node.status === 'in_progress' && <Circle size={16} className="text-[#7C3AED] fill-[#7C3AED]/20" />}
                      {node.status === 'locked' && <Lock size={16} className="text-text-tertiary" />}
                    </div>
                    <div className="flex flex-col">
                      <span className={`text-[13px] ${node.status === 'in_progress' ? 'font-bold text-[#7C3AED]' : (node.status === 'complete' ? 'text-text-secondary' : 'text-text-tertiary')}`}>
                        {node.display_name}
                      </span>
                      {node.reason_for_position && (
                        <span className="text-[10px] text-[#D97706] mt-1 leading-tight">{node.reason_for_position}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : activeTab === 'Error Log' ? (
          <div className="flex flex-col gap-4">
            {errorLog.length === 0 ? (
              <p className="opacity-50 mt-4 text-center italic">// no errors logged yet</p>
            ) : (
              errorLog.map((err, i) => (
                <div key={i} className="p-3 bg-black/5 rounded-xl border border-black/5 flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-[#7C3AED] uppercase tracking-widest">{err.topic}</span>
                    <span className="text-[9px] text-text-tertiary">Line {err.node_index}</span>
                  </div>
                  <div className="text-[11px] leading-relaxed">
                    <div className="text-[#DC2626] line-through opacity-60 decoration-1">wrote: {err.what_written}</div>
                    <div className="text-[#059669] font-bold">expected: {err.expected}</div>
                  </div>
                  <div className="mt-1 px-2 py-0.5 bg-white/50 rounded text-[9px] text-text-secondary self-start">
                    {err.error_type} {err.error_subtype ? `(${err.error_subtype})` : ''}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : activeTab === 'Weights' ? (
          <div className="flex flex-col gap-4">
            {weights ? (
              Object.entries(weights.weights).map(([type, weight]) => (
                <div key={type} className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-[11px]">
                    <span className="capitalize text-text-secondary">{type}</span>
                    <span className="font-bold text-text-primary">{Math.round(weight * 100)}%</span>
                  </div>
                  <div className="h-1.5 bg-black/5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 ${weight > 0.6 ? 'bg-[#DC2626]' : weight > 0.3 ? 'bg-[#D97706]' : 'bg-[#7C3AED]'}`}
                      style={{ width: `${weight * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))
            ) : (
              <p className="opacity-50 mt-4 text-center italic">// calculating profile...</p>
            )}
          </div>
        ) : activeTab === 'Pipeline' ? (
          <div className="flex flex-col gap-4">
            <h3 className="text-[14px] font-bold text-text-primary mb-2 uppercase tracking-wide">
              {pipeline?.cluster_name || 'Project Pipeline'}
            </h3>
            {pipeline?.blocks?.length > 0 ? (
              <div className="flex flex-col gap-3">
                {pipeline.blocks.map((block, i) => (
                  <div 
                    key={i} 
                    onClick={() => {
                      if (block.unlocked && !block.stitch_complete) {
                        navigate(`/pipeline?cluster=${pipeline.cluster_name}&block=${block.block_index}`);
                      }
                    }}
                    className={`p-4 rounded-2xl border transition-all ${
                      block.stitch_complete ? 'bg-[#059669]/5 border-[#059669]/20' : 
                      block.unlocked ? 'bg-[#7C3AED]/5 border-[#7C3AED]/30 border-dashed cursor-pointer hover:bg-[#7C3AED]/10' : 
                      'bg-black/5 border-transparent opacity-40'
                    }`}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest">Block {block.block_index}</span>
                      {block.stitch_complete ? (
                        <CheckCircle2 size={14} className="text-[#059669]" />
                      ) : block.unlocked ? (
                        <Sparkles size={14} className="text-[#7C3AED] animate-pulse" />
                      ) : (
                        <Lock size={14} className="text-text-tertiary" />
                      )}
                    </div>
                    <div className="text-[12px] font-bold">
                      {block.stitch_complete ? 'STITCH COMPLETE' : block.unlocked ? 'READY TO STITCH' : 'LOCKED'}
                    </div>
                    {block.unlocked && !block.stitch_complete && (
                      <p className="text-[10px] text-text-secondary mt-2 leading-tight italic">
                        Stitch your previous lesson code to this block...
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 py-10 opacity-40 grayscale">
                <Lock size={32} />
                <p className="text-[11px] text-center italic leading-relaxed">
                  The Pipeline is currently locked.<br/>Complete all nodes in the current Roadmap cluster to unlock your final project.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-[12px] text-text-tertiary flex flex-col gap-2">
            <p className="opacity-50 mt-4 text-center italic">// {activeTab.toLowerCase()} empty_state</p>
          </div>
        )}
      </div>

      {/* Session Info */}
      <div className="p-6 border-t border-black/5 flex flex-col gap-2 glass-light rounded-t-2xl">
        <div className="text-[14px] text-text-secondary font-mono flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#00f2fe] animate-pulse"></div>
          <span className="font-bold text-text-primary">{session?.stream || 'Unknown'}</span> stream
        </div>
        <div className="text-[12px] text-text-tertiary font-mono">
          <span className="opacity-50"># theme:</span> <span className="text-[#7C3AED]">{session?.theme || 'None'}</span>
        </div>
      </div>
    </div>
  );
}
