/**
 * AIP Client — discover agents and send task requests
 */
import { Manifest, Envelope, TaskRequestPayload, TaskResultPayload, TaskErrorPayload, SearchParams } from './types';
import { createEnvelope, validateEnvelope } from './envelope';
import { RegistryClient } from './registry';

export class AIPClient {
  private agentId: string;
  private registry?: RegistryClient;

  constructor(agentId: string, registryUrl?: string) {
    this.agentId = agentId;
    if (registryUrl) this.registry = new RegistryClient(registryUrl);
  }

  /** Discover agents via registry */
  async discover(params: SearchParams) {
    if (!this.registry) throw new Error('No registry configured');
    return this.registry.search(params);
  }

  /** Fetch manifest directly from an agent endpoint */
  async fetchManifest(endpoint: string): Promise<Manifest> {
    const url = endpoint.replace(/\/+$/, '') + '/.well-known/aip-manifest.json';
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch manifest: ${res.status}`);
    return res.json() as Promise<Manifest>;
  }

  /** Send a task request to a provider agent */
  async sendTask(
    toAgentId: string,
    endpoint: string,
    payload: TaskRequestPayload
  ): Promise<Envelope<TaskResultPayload | TaskErrorPayload>> {
    const env = createEnvelope('task.request', this.agentId, toAgentId, payload);

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(env),
    });

    if (!res.ok) throw new Error(`Task request failed: ${res.status}`);
    const response = await res.json();
    if (!validateEnvelope(response)) throw new Error('Invalid response envelope');
    return response as Envelope<TaskResultPayload | TaskErrorPayload>;
  }

  /** Send a ping to check agent liveness */
  async ping(toAgentId: string, endpoint: string): Promise<Envelope> {
    const env = createEnvelope('ping', this.agentId, toAgentId, {});
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(env),
    });
    if (!res.ok) throw new Error(`Ping failed: ${res.status}`);
    return res.json() as Promise<Envelope>;
  }
}
