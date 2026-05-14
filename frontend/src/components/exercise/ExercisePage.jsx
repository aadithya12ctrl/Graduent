import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useSession } from '../../context/SessionContext';
import { api } from '../../api/client';
import { Loader2, CheckCircle2, XCircle, ArrowRight, BookOpen, Code2, Sparkles, ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';

export default function ExercisePage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { session } = useSession();
  
  const topic = searchParams.get('topic');
  const nodeIndex = parseInt(searchParams.get('node') || '1');
  
  const [loading, setLoading] = useState(true);
  const [exercise, setExercise] = useState(null);
  const [inputs, setInputs] = useState({});
  const [results, setResults] = useState({}); // { blankId: { correct, feedback } }
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedLines, setExpandedLines] = useState({}); // { lineIndex: boolean }

  useEffect(() => {
    if (!session) {
      navigate('/');
      return;
    }
    
    async function fetchExercise() {
      try {
        setLoading(true);
        const data = await api.generateExercise({
          session_id: session.session_id,
          topic,
          node_index: nodeIndex,
          stream: session.stream
        });
        setExercise(data);
        // Initialize inputs safely
        const initInputs = {};
        if (Array.isArray(data.blanks)) {
          data.blanks.forEach(b => initInputs[b.blank_id] = '');
        } else {
          data.blanks = [];
        }
        setInputs(initInputs);
      } catch (err) {
        console.error("Failed to fetch exercise", err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchExercise();
  }, [session, topic, nodeIndex]);

  const handleInputChange = (blankId, val) => {
    setInputs(prev => ({ ...prev, [blankId]: val }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const submissions = await Promise.all(
        exercise.blanks.map(async (blank) => {
          const res = await api.submitBlank({
            session_id: session.session_id,
            exercise_id: exercise.exercise_id,
            blank_id: blank.blank_id,
            what_written: inputs[blank.blank_id],
            expected_answer: blank.expected_answer,
            line_context: blank.line_context,
            topic,
            node_index: nodeIndex
          });
          return { blankId: blank.blank_id, ...res };
        })
      );

      const newResults = {};
      submissions.forEach(s => {
        newResults[s.blankId] = { correct: s.correct, feedback: s.feedback };
      });
      setResults(newResults);
    } catch (err) {
      console.error("Submission failed", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextNode = async () => {
    try {
      await api.completeNode({
        session_id: session.session_id,
        topic,
        node_index: nodeIndex
      });
      navigate('/app');
    } catch (err) {
      console.error("Failed to complete node", err);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-[#7C3AED]" />
        <p className="font-mono text-text-secondary">Synthesizing {topic} exercise...</p>
      </div>
    );
  }

  if (!exercise) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4">
        <XCircle className="w-12 h-12 text-[#DC2626]" />
        <p className="font-mono text-text-primary font-bold text-lg">Failed to generate exercise</p>
        <p className="font-mono text-text-secondary text-sm">The AI encountered an error. Please try again.</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 px-6 py-2 bg-text-primary text-background rounded-xl font-mono hover:bg-[#2C2A26] transition-all"
        >
          Retry
        </button>
      </div>
    );
  }

  const allCorrect = Object.keys(results).length > 0 && 
                     Object.values(results).every(r => r.correct);

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-20">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <div className="text-[#7C3AED] font-mono text-[12px] font-bold uppercase tracking-widest">
              Node {nodeIndex} of 3
            </div>
            {exercise.scaffold_percent !== undefined && (
              <div className={`px-3 py-1 rounded-full text-[11px] font-bold font-mono border shadow-sm flex items-center gap-2 ${
                exercise.scaffold_percent >= 80 ? 'bg-blue-500/10 text-blue-600 border-blue-200' :
                exercise.scaffold_percent >= 50 ? 'bg-amber-500/10 text-amber-600 border-amber-200' :
                'bg-rose-500/10 text-rose-600 border-rose-200'
              }`}>
                <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                  exercise.scaffold_percent >= 80 ? 'bg-blue-500' :
                  exercise.scaffold_percent >= 50 ? 'bg-amber-500' :
                  'bg-rose-500'
                }`}></div>
                SCAFFOLD L{exercise.scaffold_percent >= 80 ? '1' : exercise.scaffold_percent >= 50 ? '2' : '3'}: {100 - exercise.scaffold_percent}% FADED
              </div>
            )}
          </div>
          <h1 className="text-[32px] font-mono font-extrabold text-text-primary">
            {topic.replace(/_/g, ' ')}
          </h1>
        </div>
        
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Editor Area */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="glass-heavy rounded-3xl border border-white/60 overflow-hidden">
              <div className="bg-[#1A1814] px-6 py-4 flex items-center justify-between">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#FC5F57]"></div>
                  <div className="w-3 h-3 rounded-full bg-[#FDBC2C]"></div>
                  <div className="w-3 h-3 rounded-full bg-[#34C749]"></div>
                </div>
                <div className="text-white/40 font-mono text-[11px]">{topic}.py</div>
              </div>
              
              <div className="p-8 bg-[#1A1814] font-mono text-[15px] leading-relaxed overflow-x-auto min-h-[300px]">
                {(() => {
                  let globalBlankIndex = 0;
                  return (exercise.code_with_blanks_lines || []).map((line, lineIdx) => {
                    const parts = line.split('___');
                    const lineBlanks = [];
                    for (let i = 0; i < parts.length - 1; i++) {
                      lineBlanks.push(exercise.blanks[globalBlankIndex++]);
                    }
                    const hasBlanks = lineBlanks.length > 0;
                    const isExpanded = expandedLines[lineIdx];

                    return (
                      <div key={lineIdx} className="flex flex-col mb-1">
                        <div className="flex items-center min-h-[28px] whitespace-pre">
                          <span className="text-white/30 mr-4 text-xs select-none w-6 text-right">{lineIdx + 1}</span>
                          <span className="text-white/90 flex flex-wrap items-center">
                            {parts.map((part, i) => {
                              const isLast = i === parts.length - 1;
                              const blank = lineBlanks[i];
                              return (
                                <React.Fragment key={i}>
                                  {part}
                                  {!isLast && blank && (
                                    <input
                                      type="text"
                                      value={inputs[blank.blank_id] || ''}
                                      onChange={(e) => handleInputChange(blank.blank_id, e.target.value)}
                                      className={`mx-1 px-2 py-0.5 rounded border-b-2 bg-[#2A2824] outline-none transition-all w-[120px] ${
                                        results[blank.blank_id]?.correct === true ? 'border-[#059669] text-[#059669]' :
                                        results[blank.blank_id]?.correct === false ? 'border-[#DC2626] text-[#DC2626]' :
                                        'border-[#7C3AED] text-[#7C3AED] focus:bg-[#7C3AED]/20'
                                      }`}
                                      placeholder="___"
                                      disabled={results[blank.blank_id]?.correct}
                                    />
                                  )}
                                  {!isLast && !blank && (
                                    <span className="text-[#DC2626] border-b-2 border-[#DC2626] mx-1">___ (missing data)</span>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </span>
                        </div>
                        {hasBlanks && (
                          <div className="ml-10 mt-1 mb-3 flex flex-col gap-2">
                            <button 
                              onClick={() => setExpandedLines(prev => ({ ...prev, [lineIdx]: !prev[lineIdx] }))}
                              className="self-start flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2A2824] text-text-secondary hover:text-white hover:bg-[#3A3834] transition-all text-xs font-sans font-medium"
                            >
                              <Lightbulb size={14} className={isExpanded ? "text-yellow-400" : ""} />
                              {isExpanded ? "Hide Theory" : "View Theory & Alternatives"}
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>
                            
                            {isExpanded && (
                              <div className="bg-[#2A2824] border border-white/10 rounded-xl p-4 flex flex-col gap-3 font-sans max-w-2xl animate-in slide-in-from-top-2 fade-in duration-200">
                                {lineBlanks.map((b, idx) => (
                                  <div key={idx} className="flex flex-col gap-2">
                                    <div className="flex gap-2 items-start">
                                      <div className="bg-[#7C3AED]/20 text-[#7C3AED] px-2 py-0.5 rounded text-[10px] font-bold mt-0.5 uppercase tracking-wide">Theory</div>
                                      <p className="text-white/80 text-sm leading-relaxed">{b.theory_explanation || "No theory available."}</p>
                                    </div>
                                    {b.alternative_approaches && b.alternative_approaches !== "null" && (
                                      <div className="flex gap-2 items-start">
                                        <div className="bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded text-[10px] font-bold mt-0.5 uppercase tracking-wide">Alternative</div>
                                        <p className="text-white/70 text-sm leading-relaxed italic">{b.alternative_approaches}</p>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* Scaffold Slider */}
            <div className="glass p-4 rounded-2xl border border-white/60 flex flex-col gap-3 relative overflow-hidden">
              {isSubmitting && <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] z-10 flex items-center justify-center font-mono text-[10px] text-[#7C3AED] animate-pulse">regenerating...</div>}
              <div className="flex justify-between items-center px-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] font-bold text-text-secondary uppercase tracking-widest">Scaffold Control</span>
                </div>
                <span className={`font-mono text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  exercise.scaffold_percent >= 80 ? 'bg-blue-500/10 text-blue-600' :
                  exercise.scaffold_percent >= 50 ? 'bg-amber-500/10 text-amber-600' :
                  'bg-rose-500/10 text-rose-600'
                }`}>
                  {exercise.scaffold_percent}% Visible
                </span>
              </div>
              <div className="relative px-2">
                <input 
                  type="range" 
                  min="0" 
                  max="3" 
                  step="1"
                  value={exercise.scaffold_percent === 80 ? 3 : exercise.scaffold_percent === 50 ? 2 : exercise.scaffold_percent === 20 ? 1 : 0}
                  onChange={async (e) => {
                    const val = parseInt(e.target.value);
                    const levels = [0, 20, 50, 80];
                    const newPercent = levels[val];
                    
                    setIsSubmitting(true);
                    try {
                      const data = await api.generateExercise({
                        session_id: session.session_id,
                        topic,
                        node_index: nodeIndex,
                        stream: session.stream,
                        scaffold_percent: newPercent
                      });
                      setExercise(data);
                      // Reset inputs for new exercise safely
                      const initInputs = {};
                      if (Array.isArray(data.blanks)) {
                        data.blanks.forEach(b => initInputs[b.blank_id] = '');
                      } else {
                        data.blanks = [];
                      }
                      setInputs(initInputs);
                      setResults({});
                    } catch (err) {
                      console.error("Slider generation failed", err);
                      setExercise(null);
                    } finally {
                      setIsSubmitting(false);
                    }
                  }}
                  className="w-full h-1.5 bg-black/10 rounded-lg appearance-none cursor-pointer accent-[#7C3AED] relative z-20"
                />
                <div className="flex justify-between mt-2 px-1">
                  {['0%', '20%', '50%', '80%'].map((l, i) => (
                    <span key={i} className="text-[9px] font-mono text-text-tertiary font-bold">{l}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="glass p-6 rounded-3xl border border-white/60">
              <h3 className="font-mono text-[14px] font-bold text-text-secondary mb-3">// problem_statement</h3>
              <p className="text-text-primary leading-relaxed">
                {exercise.problem_statement}
              </p>
            </div>
          </div>

          {/* Feedback Area */}
          <div className="flex flex-col gap-4">
            <div className="glass-heavy p-6 rounded-3xl border border-white/60 flex-1 flex flex-col gap-4">
              <h3 className="font-mono text-[14px] font-bold text-text-secondary mb-2">// feedback_engine</h3>
              
              <div className="flex-1 overflow-y-auto space-y-4 max-h-[400px] pr-2 custom-scrollbar">
                {Object.keys(results).length === 0 ? (
                  <div className="text-text-tertiary italic text-[13px] text-center mt-10">
                    Submit your answers to receive AI-driven diagnostic feedback.
                  </div>
                ) : (
                  Object.entries(results).map(([id, res]) => (
                    <div key={id} className={`p-4 rounded-2xl border ${res.correct ? 'bg-[#059669]/5 border-[#059669]/20' : 'bg-[#DC2626]/5 border-[#DC2626]/20'}`}>
                      <div className="flex items-center gap-2 mb-2">
                        {res.correct ? <CheckCircle2 size={16} className="text-[#059669]" /> : <XCircle size={16} className="text-[#DC2626]" />}
                        <span className={`text-[12px] font-bold uppercase ${res.correct ? 'text-[#059669]' : 'text-[#DC2626]'}`}>
                          {res.correct ? 'Correct' : 'Diagnostic'}
                        </span>
                      </div>
                      <p className="text-[13px] text-text-secondary leading-relaxed">
                        {res.feedback?.why || (res.correct ? "Great understanding!" : "Check the logic here.")}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {!allCorrect ? (
                <button 
                  onClick={handleSubmit}
                  disabled={isSubmitting || Object.values(inputs).some(v => !v.trim())}
                  className="w-full bg-text-primary text-background py-4 rounded-2xl font-mono font-bold hover:bg-[#2C2A26] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : "Validate Solution"}
                </button>
              ) : (
                <button 
                  onClick={handleNextNode}
                  className="w-full bg-[#059669] text-white py-4 rounded-2xl font-mono font-bold hover:bg-[#047857] transition-all flex items-center justify-center gap-2 mt-4 shadow-[0_8px_20px_rgba(5,150,105,0.3)]"
                >
                  Next Module <ArrowRight size={20} />
                </button>
              )}
            </div>
          </div>
        </div>
    </div>
  );
}
