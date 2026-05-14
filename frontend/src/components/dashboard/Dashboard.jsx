import React, { useEffect, useState } from 'react';
import { useSession } from '../../context/SessionContext';
import { api } from '../../api/client';
import { Navigate, useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { session } = useSession();
  const navigate = useNavigate();
  const [roadmap, setRoadmap] = useState(null);
  const [dueBlocks, setDueBlocks] = useState(null);
  const [loading, setLoading] = useState(true);

  if (!session) {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    async function loadData() {
      try {
        const [roadmapData, dueData] = await Promise.all([
          api.getRoadmap(session.session_id),
          api.getDueBlocks(session.session_id)
        ]);
        setRoadmap(roadmapData);
        setDueBlocks(dueData);
      } catch (err) {
        console.error("Failed to load dashboard data", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [session.session_id]);

  const handleStartExercise = () => {
    if (activeNode) {
      navigate(`/exercise?topic=${activeNode.topic}&node=${activeNode.node_index}`);
    }
  };

  if (loading) {
    return <div className="text-text-secondary font-mono animate-pulse">loading session data...</div>;
  }

  // Find active node
  let activeNode = null;
  let activeCluster = null;
  
  if (roadmap?.clusters) {
    for (const cluster of roadmap.clusters) {
      for (const node of cluster.nodes) {
        if (node.status === 'in_progress') {
          activeNode = node;
          activeCluster = cluster.cluster_name;
          break;
        }
      }
      if (activeNode) break;
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h2 className="font-mono text-[24px] font-bold text-text-primary">/dashboard</h2>
        <div className="glass px-4 py-2 rounded-xl font-mono text-[12px] text-[#7C3AED] border border-[#7C3AED]/20">
          session_id: {session.session_id}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
        {/* Active Module */}
        <div 
          onClick={handleStartExercise}
          className="glass-heavy p-6 rounded-3xl h-[200px] border border-white/60 relative overflow-hidden flex flex-col justify-between group cursor-pointer hover:border-[#7C3AED]/50 transition-colors"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#7C3AED]/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
          <div>
            <div className="font-mono text-[14px] font-bold mb-4 text-text-secondary">// active_module</div>
            <div className="text-[28px] font-mono font-extrabold text-text-primary leading-tight">
              {activeNode ? activeNode.display_name : 'Session Complete'}
            </div>
            {activeCluster && (
              <div className="text-[12px] font-mono text-text-tertiary mt-2">
                Cluster: {activeCluster} • Node {activeNode?.node_index}/3
              </div>
            )}
          </div>
          {activeNode && (
            <button className="self-start text-[14px] font-mono font-bold text-[#7C3AED] flex items-center gap-2 group-hover:translate-x-1 transition-transform">
              Start Exercise →
            </button>
          )}
        </div>

        {/* Spaced Repetition Queue */}
        <div className="glass-heavy p-6 rounded-3xl h-[200px] border border-white/60 flex flex-col justify-between">
          <div>
            <div className="font-mono text-[14px] font-bold mb-4 text-text-secondary flex justify-between">
              <span>// spaced_repetition</span>
              <span className="text-[#D97706]">{dueBlocks?.due_count || 0} due</span>
            </div>
            {dueBlocks?.due_count > 0 ? (
              <div className="text-[18px] font-mono text-text-primary">
                {dueBlocks.blocks[0].display_name} (Node {dueBlocks.blocks[0].node_index})
              </div>
            ) : (
              <div className="text-[14px] font-mono text-text-tertiary">
                No blocks due for review right now.
              </div>
            )}
          </div>
          <button 
            disabled={!dueBlocks || dueBlocks.due_count === 0}
            className="bg-text-primary text-background font-mono font-bold py-3 rounded-xl hover:bg-[#2C2A26] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Review Queue
          </button>
        </div>
      </div>
    </div>
  );
}
