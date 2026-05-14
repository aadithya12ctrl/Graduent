const BASE = 'http://localhost:8000';

async function request(path, options = {}) {
  try {
    console.log(`[API REQUEST] ${options.method || 'GET'} ${BASE + path}`, options.body);
    const res = await fetch(BASE + path, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    
    if (!res.ok) {
      if (res.status === 404) {
        alert("Session Expired or Not Found. Please go back to the landing page and start a new session.");
      }
      const err = await res.json().catch(() => ({ detail: 'Request failed' }));
      throw new Error(err.detail || 'Request failed');
    }
    
    return await res.json();
  } catch (error) {
    console.error(`!!! GRADUENT API ERROR !!! \nPath: ${path}\nMessage:`, error);
    alert("API Connection Error. Please check if the backend server is running on port 8000.");
    throw error;
  }
}

export const api = {
  createSession: (stream, theme) =>
    request('/api/session', { method: 'POST', body: { stream, theme } }),
    
  getRoadmap: (session_id) =>
    request(`/api/roadmap?session_id=${Number(session_id)}`),
    
  getPipeline: (session_id, cluster) =>
    request(`/api/pipeline?session_id=${Number(session_id)}&cluster=${cluster}`),
    
  getPipelineDetails: (session_id, cluster, block) =>
    request(`/api/pipeline/details?session_id=${Number(session_id)}&cluster=${cluster}&block=${block}`),
    
  getErrorProfile: (session_id) =>
    request(`/api/error_profile?session_id=${Number(session_id)}`),
    
  getErrorLog: (session_id) =>
    request(`/api/error_log?session_id=${Number(session_id)}`),
    
  generateExercise: (body) =>
    request('/api/exercise/generate', { 
      method: 'POST', 
      body: { ...body, session_id: Number(body.session_id) } 
    }),
    
  submitBlank: (body) =>
    request('/api/submission', { 
      method: 'POST', 
      body: { ...body, session_id: Number(body.session_id) } 
    }),
    
  completeNode: (body) =>
    request('/api/node/complete', { 
      method: 'POST', 
      body: { ...body, session_id: Number(body.session_id) } 
    }),
    
  submitStitch: (body) =>
    request('/api/stitch/submit', { method: 'POST', body }),
    
  getDueBlocks: (session_id) =>
    request(`/api/spaced_rep/due?session_id=${session_id}`),
    
  updateSpacedRep: (body) =>
    request('/api/spaced_rep/update', { method: 'POST', body }),
};
