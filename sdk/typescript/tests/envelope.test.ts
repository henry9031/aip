import { describe, it, expect } from 'vitest';
import { createEnvelope, validateEnvelope, canonicalPayload } from '../src/envelope';

describe('createEnvelope', () => {
  it('creates a valid envelope with defaults', () => {
    const env = createEnvelope('task.request', 'agent-a', 'agent-b', { capability: 'test', input: {} });
    expect(env.aip).toBe('0.1');
    expect(env.type).toBe('task.request');
    expect(env.from).toBe('agent-a');
    expect(env.to).toBe('agent-b');
    expect(env.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(env.timestamp).toBeTruthy();
    expect(env.payload).toEqual({ capability: 'test', input: {} });
  });

  it('includes replyTo and correlationId when provided', () => {
    const env = createEnvelope('task.result', 'b', 'a', {}, { replyTo: 'msg-1', correlationId: 'corr-1' });
    expect(env.replyTo).toBe('msg-1');
    expect(env.correlationId).toBe('corr-1');
  });

  it('generates unique IDs', () => {
    const e1 = createEnvelope('ping', 'a', 'b', {});
    const e2 = createEnvelope('ping', 'a', 'b', {});
    expect(e1.id).not.toBe(e2.id);
  });
});

describe('validateEnvelope', () => {
  it('returns true for valid envelopes', () => {
    const env = createEnvelope('ping', 'a', 'b', {});
    expect(validateEnvelope(env)).toBe(true);
  });

  it('returns false for null/undefined', () => {
    expect(validateEnvelope(null)).toBe(false);
    expect(validateEnvelope(undefined)).toBe(false);
  });

  it('returns false for missing fields', () => {
    expect(validateEnvelope({ aip: '0.1' })).toBe(false);
    expect(validateEnvelope({ aip: '0.1', id: '1', type: 'ping', from: 'a', to: 'b' })).toBe(false);
  });

  it('returns false for wrong types', () => {
    expect(validateEnvelope({ aip: 1, id: '1', type: 'ping', from: 'a', to: 'b', timestamp: 'x', payload: {} })).toBe(false);
  });
});

describe('canonicalPayload', () => {
  it('produces deterministic output', () => {
    const env = createEnvelope('task.request', 'a', 'b', { key: 'value' });
    const c1 = canonicalPayload(env);
    const c2 = canonicalPayload(env);
    expect(c1).toBe(c2);
  });

  it('only includes signing-relevant fields', () => {
    const env = createEnvelope('ping', 'a', 'b', {});
    const parsed = JSON.parse(canonicalPayload(env));
    expect(Object.keys(parsed)).toEqual(['id', 'type', 'from', 'to', 'timestamp', 'payload']);
  });
});
