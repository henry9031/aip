/**
 * Manifest builder — fluent API for constructing AIP agent manifests
 */
import { randomUUID } from 'crypto';
import { Manifest, AgentInfo, Capability, Endpoints, AuthConfig, TrustConfig } from './types';

export class ManifestBuilder {
  private manifest: Manifest;

  constructor() {
    this.manifest = {
      aip: '0.1',
      agent: { id: randomUUID(), name: '' },
      capabilities: [],
      endpoints: { aip: '' },
    };
  }

  agent(info: Partial<AgentInfo> & { name: string }): this {
    this.manifest.agent = { id: this.manifest.agent.id, ...info };
    return this;
  }

  capability(cap: Capability): this {
    this.manifest.capabilities.push(cap);
    return this;
  }

  endpoints(ep: Endpoints): this {
    this.manifest.endpoints = ep;
    return this;
  }

  auth(auth: AuthConfig): this {
    this.manifest.auth = auth;
    return this;
  }

  trust(trust: TrustConfig): this {
    this.manifest.trust = trust;
    return this;
  }

  build(): Manifest {
    if (!this.manifest.agent.name) throw new Error('Agent name is required');
    if (!this.manifest.endpoints.aip) throw new Error('AIP endpoint is required');
    if (this.manifest.capabilities.length === 0) throw new Error('At least one capability is required');
    return structuredClone(this.manifest);
  }
}

/** Validate a manifest object has required fields */
export function validateManifest(m: unknown): m is Manifest {
  const obj = m as Manifest;
  return (
    typeof obj?.aip === 'string' &&
    typeof obj?.agent?.id === 'string' &&
    typeof obj?.agent?.name === 'string' &&
    Array.isArray(obj?.capabilities) &&
    obj.capabilities.length > 0 &&
    typeof obj?.endpoints?.aip === 'string'
  );
}
