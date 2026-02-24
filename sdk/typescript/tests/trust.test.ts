import { describe, it, expect } from 'vitest';
import { generateKeyPair, exportPublicKey, signEnvelope, verifyEnvelope } from '../src/trust';
import { createEnvelope } from '../src/envelope';

describe('trust', () => {
  it('generates a key pair', () => {
    const kp = generateKeyPair();
    expect(kp.publicKey).toBeDefined();
    expect(kp.privateKey).toBeDefined();
  });

  it('exports public key in AIP format', () => {
    const kp = generateKeyPair();
    const exported = exportPublicKey(kp.publicKey);
    expect(exported).toMatch(/^ed25519:.+/);
  });

  it('signs and verifies an envelope', () => {
    const kp = generateKeyPair();
    const env = createEnvelope('task.request', 'a', 'b', { capability: 'test', input: {} });
    const sig = signEnvelope(env, kp.privateKey);
    expect(sig).toMatch(/^ed25519:.+/);

    env.signature = sig;
    expect(verifyEnvelope(env, kp.publicKey)).toBe(true);
  });

  it('rejects tampered envelope', () => {
    const kp = generateKeyPair();
    const env = createEnvelope('task.request', 'a', 'b', { capability: 'test', input: {} });
    env.signature = signEnvelope(env, kp.privateKey);

    // Tamper with payload
    (env.payload as any).capability = 'hacked';
    expect(verifyEnvelope(env, kp.publicKey)).toBe(false);
  });

  it('rejects unsigned envelopes', () => {
    const kp = generateKeyPair();
    const env = createEnvelope('ping', 'a', 'b', {});
    expect(verifyEnvelope(env, kp.publicKey)).toBe(false);
  });

  it('rejects verification with wrong key', () => {
    const kp1 = generateKeyPair();
    const kp2 = generateKeyPair();
    const env = createEnvelope('ping', 'a', 'b', {});
    env.signature = signEnvelope(env, kp1.privateKey);
    expect(verifyEnvelope(env, kp2.publicKey)).toBe(false);
  });
});
