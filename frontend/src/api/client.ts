export interface CreateAgentRequest {
  description: string;
  selected_tools: string[];
  resource_scopes: Record<string, string[]>;
}

export interface AgentResponse {
  id: string;
  name: string;
  description: string;
  status: string;
  policy_text: string;
  created_at: string;
  config: any;
}

export interface RunAgentRequest {
  session_id: string;
  prompt: string;
}

export interface AuditRecord {
  id: number;
  agent_id: string;
  event_type: string;
  tool_name: string;
  resource: string;
  policy_decision: string;
  policy_reason: string;
  latency_ms: number;
  timestamp: string;
}

export interface AuditStats {
  total: number;
  allow_count: number;
  deny_count: number;
  by_agent: Record<string, number>;
}

// Dummy client implementation since the backend is assumed to exist at /api.
// In a real scenario, this would use fetch or axios.
export const apiClient = {
  createAgent: async (req: CreateAgentRequest): Promise<AgentResponse> => {
    const res = await fetch('/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req)
    });
    if (!res.ok) throw new Error('Failed to create agent');
    return res.json();
  },
  listAgents: async (): Promise<AgentResponse[]> => {
    const res = await fetch('/api/agents');
    if (!res.ok) throw new Error('Failed to list agents');
    return res.json();
  },
  getAgent: async (id: string): Promise<AgentResponse> => {
    const res = await fetch(`/api/agents/${id}`);
    if (!res.ok) throw new Error('Failed to get agent');
    return res.json();
  },
  deleteAgent: async (id: string): Promise<void> => {
    const res = await fetch(`/api/agents/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete agent');
  },
  startAgent: async (id: string): Promise<void> => {
    const res = await fetch(`/api/agents/${id}/start`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to start agent');
  },
  stopAgent: async (id: string): Promise<void> => {
    const res = await fetch(`/api/agents/${id}/stop`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to stop agent');
  },
  runAgent: async (id: string, req: RunAgentRequest): Promise<{ session_id: string; result: string }> => {
    const res = await fetch(`/api/agents/${id}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req)
    });
    if (!res.ok) throw new Error('Failed to run agent');
    return res.json();
  },
  getAgentLogs: async (id: string): Promise<string> => {
    const res = await fetch(`/api/agents/${id}/logs`);
    if (!res.ok) throw new Error('Failed to get agent logs');
    return res.text();
  },
  getPolicy: async (id: string): Promise<{ policy_text: string }> => {
    const res = await fetch(`/api/agents/${id}/policy`);
    if (!res.ok) throw new Error('Failed to get policy');
    return res.json();
  },
  checkPolicy: async (id: string, req: { principal: string; action: string; resource: string }): Promise<{ decision: string; reason: string }> => {
    const res = await fetch(`/api/agents/${id}/policy/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req)
    });
    if (!res.ok) throw new Error('Failed to check policy');
    return res.json();
  },
  queryAudit: async (params: { agent_id?: string; policy_decision?: string; limit?: number }): Promise<{ records: AuditRecord[]; total: number }> => {
    const q = new URLSearchParams();
    if (params.agent_id) q.append('agent_id', params.agent_id);
    if (params.policy_decision && params.policy_decision !== 'All') q.append('policy_decision', params.policy_decision);
    if (params.limit) q.append('limit', params.limit.toString());
    const res = await fetch(`/api/audit?${q.toString()}`);
    if (!res.ok) throw new Error('Failed to query audit');
    return res.json();
  },
  getAuditStats: async (): Promise<AuditStats> => {
    const res = await fetch('/api/audit/stats');
    if (!res.ok) throw new Error('Failed to get audit stats');
    return res.json();
  }
};
