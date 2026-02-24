/**
 * Trust — Ed25519 signing and verification using Node.js built-in crypto
 */
import { generateKeyPairSync, sign, verify, KeyObject } from 'crypto';
import { Envelope } from './types';
import { canonicalPayload } from './envelope';

export interface KeyPair {
  publicKey: KeyObject;
  privateKey: KeyObject;
}

/** Generate a new Ed25519 key pair */
export function generateKeyPair(): KeyPair {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  return { publicKey, privateKey };
}

/** Export a public key as the AIP format string: "ed25519:<base64>" */
export function exportPublicKey(key: KeyObject): string {
  const raw = key.export({ type: 'spki', format: 'der' });
  return `ed25519:${Buffer.from(raw).toString('base64')}`;
}

/** Sign an envelope, returning the signature string */
export function signEnvelope(env: Envelope, privateKey: KeyObject): string {
  const data = Buffer.from(canonicalPayload(env));
  const sig = sign(null, data, privateKey);
  return `ed25519:${sig.toString('base64')}`;
}

/** Verify an envelope's signature */
export function verifyEnvelope(env: Envelope, publicKey: KeyObject): boolean {
  if (!env.signature) return false;
  const sigBase64 = env.signature.replace('ed25519:', '');
  const sig = Buffer.from(sigBase64, 'base64');
  const data = Buffer.from(canonicalPayload(env));
  return verify(null, data, publicKey, sig);
}
