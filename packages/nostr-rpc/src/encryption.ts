import { hexToBytes } from '@noble/hashes/utils';
import { getConversationKey, encrypt, decrypt } from './nip44-v3.js';

/**
 * Manages NIP-44 v3 encryption between two peers.
 * Caches the conversation key for efficiency.
 */
export class PeerEncryption {
  private conversationKey: Uint8Array;

  constructor(privkeyHex: string, peerPubkeyHex: string) {
    const privkey = hexToBytes(privkeyHex);
    this.conversationKey = getConversationKey(privkey, peerPubkeyHex);
  }

  encrypt(plaintext: string): string {
    return encrypt(plaintext, this.conversationKey);
  }

  decrypt(payload: string): string {
    return decrypt(payload, this.conversationKey);
  }

  encryptJSON(data: unknown): string {
    return this.encrypt(JSON.stringify(data));
  }

  decryptJSON<T = unknown>(payload: string): T {
    return JSON.parse(this.decrypt(payload));
  }
}
