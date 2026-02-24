import { describe, it, expect } from 'vitest';
import { ManifestBuilder, validateManifest } from '../src/manifest';

describe('ManifestBuilder', () => {
  const validCapability = {
    id: 'summarize',
    name: 'Summarize',
    description: 'Summarizes text',
    tags: ['nlp'],
  };

  it('builds a valid manifest', () => {
    const m = new ManifestBuilder()
      .agent({ name: 'Test Agent', description: 'A test' })
      .capability(validCapability)
      .endpoints({ aip: 'http://localhost:4000/aip' })
      .build();

    expect(m.aip).toBe('0.1');
    expect(m.agent.name).toBe('Test Agent');
    expect(m.agent.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(m.capabilities).toHaveLength(1);
    expect(m.capabilities[0].id).toBe('summarize');
    expect(m.endpoints.aip).toBe('http://localhost:4000/aip');
  });

  it('throws without agent name', () => {
    expect(() =>
      new ManifestBuilder()
        .capability(validCapability)
        .endpoints({ aip: 'http://localhost:4000/aip' })
        .build()
    ).toThrow('Agent name is required');
  });

  it('throws without endpoint', () => {
    expect(() =>
      new ManifestBuilder()
        .agent({ name: 'Test' })
        .capability(validCapability)
        .build()
    ).toThrow('AIP endpoint is required');
  });

  it('throws without capabilities', () => {
    expect(() =>
      new ManifestBuilder()
        .agent({ name: 'Test' })
        .endpoints({ aip: 'http://localhost:4000/aip' })
        .build()
    ).toThrow('At least one capability is required');
  });

  it('returns a deep clone (mutations do not affect original)', () => {
    const builder = new ManifestBuilder()
      .agent({ name: 'Test' })
      .capability(validCapability)
      .endpoints({ aip: 'http://localhost:4000/aip' });
    const m1 = builder.build();
    const m2 = builder.build();
    m1.agent.name = 'Mutated';
    expect(m2.agent.name).toBe('Test');
  });

  it('supports auth and trust config', () => {
    const m = new ManifestBuilder()
      .agent({ name: 'Secure Agent' })
      .capability(validCapability)
      .endpoints({ aip: 'http://localhost:4000/aip' })
      .auth({ schemes: ['bearer'] })
      .trust({ publicKey: 'ed25519:abc123' })
      .build();

    expect(m.auth?.schemes).toEqual(['bearer']);
    expect(m.trust?.publicKey).toBe('ed25519:abc123');
  });
});

describe('validateManifest', () => {
  it('returns true for valid manifests', () => {
    const m = new ManifestBuilder()
      .agent({ name: 'Test' })
      .capability({ id: 'x', name: 'X' })
      .endpoints({ aip: 'http://localhost:4000/aip' })
      .build();
    expect(validateManifest(m)).toBe(true);
  });

  it('returns false for empty object', () => {
    expect(validateManifest({})).toBe(false);
  });

  it('returns false for missing capabilities', () => {
    expect(validateManifest({ aip: '0.1', agent: { id: 'x', name: 'x' }, capabilities: [], endpoints: { aip: 'x' } })).toBe(false);
  });

  it('returns false for null', () => {
    expect(validateManifest(null)).toBe(false);
  });
});
