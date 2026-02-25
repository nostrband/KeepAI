import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { schnorr } from '@noble/curves/secp256k1';
import type { PairingCode } from '@keepai/proto/types.js';
import { PROTOCOL_VERSION } from '@keepai/proto/constants.js';

/**
 * Generate a pairing code containing the keepd pubkey, relays, secret, and protocol version.
 * Encoded as base64url.
 */
export function generatePairingCode(data: PairingCode): string {
  const json = JSON.stringify(data);
  return Buffer.from(json, 'utf-8').toString('base64url');
}

/**
 * Parse a pairing code back to its components.
 */
export function parsePairingCode(code: string): PairingCode {
  const json = Buffer.from(code, 'base64url').toString('utf-8');
  const data = JSON.parse(json);

  if (!data.pubkey || typeof data.pubkey !== 'string') {
    throw new Error('Invalid pairing code: missing pubkey');
  }
  if (!Array.isArray(data.relays) || data.relays.length === 0) {
    throw new Error('Invalid pairing code: missing relays');
  }
  if (!data.secret || typeof data.secret !== 'string') {
    throw new Error('Invalid pairing code: missing secret');
  }
  if (typeof data.protocolVersion !== 'number') {
    throw new Error('Invalid pairing code: missing protocolVersion');
  }

  return {
    pubkey: data.pubkey,
    relays: data.relays,
    secret: data.secret,
    protocolVersion: data.protocolVersion,
  };
}

/**
 * Generate a new keypair for nostr usage.
 * Returns { privkey, pubkey } as hex strings.
 */
export function generateKeypair(): { privkey: string; pubkey: string } {
  const privkeyBytes = schnorr.utils.randomPrivateKey();
  const pubkeyBytes = schnorr.getPublicKey(privkeyBytes);
  return {
    privkey: bytesToHex(privkeyBytes),
    pubkey: bytesToHex(pubkeyBytes),
  };
}

/**
 * Generate a random hex secret for pairing.
 */
export function generateSecret(bytes = 32): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return bytesToHex(arr);
}

/**
 * Check if the given protocol version is compatible with ours.
 */
export function isProtocolCompatible(remoteVersion: number): boolean {
  return remoteVersion === PROTOCOL_VERSION;
}
