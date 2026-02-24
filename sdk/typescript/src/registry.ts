/**
 * Registry client — register, search, and deregister agents
 */
import { Manifest, SearchParams, SearchResponse } from './types';

export class RegistryClient {
  constructor(private baseUrl: string) {}

  /** Register an agent manifest with the registry */
  async register(manifest: Manifest): Promise<{ id: string }> {
    const res = await fetch(`${this.baseUrl}/v1/agents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(manifest),
    });
    if (!res.ok) throw new Error(`Registry register failed: ${res.status} ${await res.text()}`);
    return res.json() as Promise<{ id: string }>;
  }

  /** Search for agents by capability, tags, etc. */
  async search(params: SearchParams): Promise<SearchResponse> {
    const qs = new URLSearchParams();
    if (params.capability) qs.set('capability', params.capability);
    if (params.tags) qs.set('tags', params.tags.join(','));
    if (params.maxPrice !== undefined) qs.set('maxPrice', String(params.maxPrice));
    if (params.minTrust !== undefined) qs.set('minTrust', String(params.minTrust));
    if (params.available !== undefined) qs.set('available', String(params.available));
    if (params.operator) qs.set('operator', params.operator);

    const res = await fetch(`${this.baseUrl}/v1/agents/search?${qs}`);
    if (!res.ok) throw new Error(`Registry search failed: ${res.status}`);
    return res.json() as Promise<SearchResponse>;
  }

  /** Get a specific agent's manifest */
  async get(agentId: string): Promise<Manifest> {
    const res = await fetch(`${this.baseUrl}/v1/agents/${agentId}`);
    if (!res.ok) throw new Error(`Registry get failed: ${res.status}`);
    return res.json() as Promise<Manifest>;
  }

  /** Deregister an agent */
  async deregister(agentId: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/v1/agents/${agentId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Registry deregister failed: ${res.status}`);
  }
}
