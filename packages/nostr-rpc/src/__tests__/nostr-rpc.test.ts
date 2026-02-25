import { describe, it, expect } from 'vitest';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import {
  getConversationKey,
  encrypt,
  decrypt,
  PeerEncryption,
  generatePairingCode,
  parsePairingCode,
  generateKeypair,
  generateSecret,
  isProtocolCompatible,
} from '../index.js';
import { PROTOCOL_VERSION } from '@keepai/proto/constants.js';

// Deterministic test keypairs (from secp256k1)
import { schnorr } from '@noble/curves/secp256k1';

function makeKeypair(seed: string) {
  // Use a deterministic private key for testing
  const hash = new Uint8Array(32);
  const encoder = new TextEncoder();
  const encoded = encoder.encode(seed);
  for (let i = 0; i < encoded.length; i++) {
    hash[i % 32] ^= encoded[i];
  }
  // Ensure it's a valid private key (nonzero)
  hash[0] = hash[0] || 1;
  const privkey = bytesToHex(hash);
  const pubkey = bytesToHex(schnorr.getPublicKey(hash));
  return { privkey, pubkey };
}

describe('NIP-44 v3 encryption', () => {
  const alice = makeKeypair('alice-test-seed-1234');
  const bob = makeKeypair('bob-test-seed-5678');

  it('should derive a conversation key', () => {
    const key = getConversationKey(hexToBytes(alice.privkey), bob.pubkey);
    expect(key).toBeInstanceOf(Uint8Array);
    expect(key.length).toBe(32);
  });

  it('should produce symmetric conversation keys', () => {
    const keyAB = getConversationKey(hexToBytes(alice.privkey), bob.pubkey);
    const keyBA = getConversationKey(hexToBytes(bob.privkey), alice.pubkey);
    expect(bytesToHex(keyAB)).toBe(bytesToHex(keyBA));
  });

  it('should encrypt and decrypt a message', () => {
    const conversationKey = getConversationKey(hexToBytes(alice.privkey), bob.pubkey);
    const plaintext = 'Hello, World!';
    const encrypted = encrypt(plaintext, conversationKey);
    const decrypted = decrypt(encrypted, conversationKey);
    expect(decrypted).toBe(plaintext);
  });

  it('should handle empty-ish plaintext (min 1 byte)', () => {
    const conversationKey = getConversationKey(hexToBytes(alice.privkey), bob.pubkey);
    const plaintext = 'x';
    const encrypted = encrypt(plaintext, conversationKey);
    const decrypted = decrypt(encrypted, conversationKey);
    expect(decrypted).toBe(plaintext);
  });

  it('should handle unicode content', () => {
    const conversationKey = getConversationKey(hexToBytes(alice.privkey), bob.pubkey);
    const plaintext = 'Hello 🌍 Привет мир 日本語';
    const encrypted = encrypt(plaintext, conversationKey);
    const decrypted = decrypt(encrypted, conversationKey);
    expect(decrypted).toBe(plaintext);
  });

  it('should handle large payloads', () => {
    const conversationKey = getConversationKey(hexToBytes(alice.privkey), bob.pubkey);
    const plaintext = 'A'.repeat(50000);
    const encrypted = encrypt(plaintext, conversationKey);
    const decrypted = decrypt(encrypted, conversationKey);
    expect(decrypted).toBe(plaintext);
  });

  it('should produce different ciphertexts for same plaintext (random nonce)', () => {
    const conversationKey = getConversationKey(hexToBytes(alice.privkey), bob.pubkey);
    const plaintext = 'deterministic?';
    const enc1 = encrypt(plaintext, conversationKey);
    const enc2 = encrypt(plaintext, conversationKey);
    expect(enc1).not.toBe(enc2);
  });

  it('should fail to decrypt with wrong key', () => {
    const conversationKey = getConversationKey(hexToBytes(alice.privkey), bob.pubkey);
    const wrongKey = new Uint8Array(32);
    wrongKey[0] = 1;
    const encrypted = encrypt('secret', conversationKey);
    expect(() => decrypt(encrypted, wrongKey)).toThrow();
  });

  it('should fail on tampered ciphertext', () => {
    const conversationKey = getConversationKey(hexToBytes(alice.privkey), bob.pubkey);
    const encrypted = encrypt('test', conversationKey);
    // Tamper with a character in the middle
    const tampered = encrypted.slice(0, 20) + 'X' + encrypted.slice(21);
    expect(() => decrypt(tampered, conversationKey)).toThrow();
  });
});

describe('PeerEncryption', () => {
  const alice = makeKeypair('peer-alice-1234');
  const bob = makeKeypair('peer-bob-5678');

  it('should encrypt and decrypt strings', () => {
    const encAlice = new PeerEncryption(alice.privkey, bob.pubkey);
    const encBob = new PeerEncryption(bob.privkey, alice.pubkey);

    const ciphertext = encAlice.encrypt('hello');
    const plaintext = encBob.decrypt(ciphertext);
    expect(plaintext).toBe('hello');
  });

  it('should encrypt and decrypt JSON', () => {
    const encAlice = new PeerEncryption(alice.privkey, bob.pubkey);
    const encBob = new PeerEncryption(bob.privkey, alice.pubkey);

    const data = { method: 'test', params: { foo: 'bar' }, id: 123 };
    const ciphertext = encAlice.encryptJSON(data);
    const decrypted = encBob.decryptJSON(ciphertext);
    expect(decrypted).toEqual(data);
  });

  it('should work bidirectionally', () => {
    const encAlice = new PeerEncryption(alice.privkey, bob.pubkey);
    const encBob = new PeerEncryption(bob.privkey, alice.pubkey);

    // Alice -> Bob
    const ct1 = encAlice.encrypt('from alice');
    expect(encBob.decrypt(ct1)).toBe('from alice');

    // Bob -> Alice
    const ct2 = encBob.encrypt('from bob');
    expect(encAlice.decrypt(ct2)).toBe('from bob');
  });
});

describe('Pairing', () => {
  it('should encode and decode a pairing code', () => {
    const data = {
      pubkey: 'abc123def456',
      relays: ['wss://relay1.example.com', 'wss://relay2.example.com'],
      secret: 'deadbeef',
      protocolVersion: 1,
    };

    const code = generatePairingCode(data);
    expect(typeof code).toBe('string');
    expect(code.length).toBeGreaterThan(0);

    const parsed = parsePairingCode(code);
    expect(parsed).toEqual(data);
  });

  it('should produce base64url-safe strings', () => {
    const data = {
      pubkey: 'test',
      relays: ['wss://r.example.com'],
      secret: 'sec',
      protocolVersion: 1,
    };
    const code = generatePairingCode(data);
    // base64url doesn't contain +, /, or =
    expect(code).not.toMatch(/[+/=]/);
  });

  it('should throw on missing pubkey', () => {
    const code = Buffer.from(JSON.stringify({ relays: ['wss://r'], secret: 's', protocolVersion: 1 })).toString('base64url');
    expect(() => parsePairingCode(code)).toThrow('missing pubkey');
  });

  it('should throw on missing relays', () => {
    const code = Buffer.from(JSON.stringify({ pubkey: 'pk', secret: 's', protocolVersion: 1 })).toString('base64url');
    expect(() => parsePairingCode(code)).toThrow('missing relays');
  });

  it('should throw on empty relays array', () => {
    const code = Buffer.from(JSON.stringify({ pubkey: 'pk', relays: [], secret: 's', protocolVersion: 1 })).toString('base64url');
    expect(() => parsePairingCode(code)).toThrow('missing relays');
  });

  it('should throw on missing secret', () => {
    const code = Buffer.from(JSON.stringify({ pubkey: 'pk', relays: ['wss://r'], protocolVersion: 1 })).toString('base64url');
    expect(() => parsePairingCode(code)).toThrow('missing secret');
  });

  it('should throw on missing protocolVersion', () => {
    const code = Buffer.from(JSON.stringify({ pubkey: 'pk', relays: ['wss://r'], secret: 's' })).toString('base64url');
    expect(() => parsePairingCode(code)).toThrow('missing protocolVersion');
  });

  it('should throw on invalid base64', () => {
    expect(() => parsePairingCode('not-valid-json-base64!!!')).toThrow();
  });
});

describe('Keypair generation', () => {
  it('should generate valid keypairs', () => {
    const kp = generateKeypair();
    expect(typeof kp.privkey).toBe('string');
    expect(typeof kp.pubkey).toBe('string');
    expect(kp.privkey.length).toBe(64); // 32 bytes hex
    expect(kp.pubkey.length).toBe(64); // 32 bytes hex
  });

  it('should generate unique keypairs', () => {
    const kp1 = generateKeypair();
    const kp2 = generateKeypair();
    expect(kp1.privkey).not.toBe(kp2.privkey);
    expect(kp1.pubkey).not.toBe(kp2.pubkey);
  });

  it('should derive correct pubkey from privkey', () => {
    const kp = generateKeypair();
    const derivedPubkey = bytesToHex(schnorr.getPublicKey(hexToBytes(kp.privkey)));
    expect(kp.pubkey).toBe(derivedPubkey);
  });
});

describe('Secret generation', () => {
  it('should generate a 64-char hex string by default (32 bytes)', () => {
    const secret = generateSecret();
    expect(typeof secret).toBe('string');
    expect(secret.length).toBe(64);
    expect(secret).toMatch(/^[0-9a-f]+$/);
  });

  it('should generate secrets of custom length', () => {
    const secret = generateSecret(16);
    expect(secret.length).toBe(32); // 16 bytes = 32 hex chars
  });

  it('should generate unique secrets', () => {
    const s1 = generateSecret();
    const s2 = generateSecret();
    expect(s1).not.toBe(s2);
  });
});

describe('Protocol compatibility', () => {
  it('should return true for matching protocol version', () => {
    expect(isProtocolCompatible(PROTOCOL_VERSION)).toBe(true);
  });

  it('should return false for different protocol version', () => {
    expect(isProtocolCompatible(PROTOCOL_VERSION + 1)).toBe(false);
    expect(isProtocolCompatible(0)).toBe(false);
    expect(isProtocolCompatible(999)).toBe(false);
  });
});
