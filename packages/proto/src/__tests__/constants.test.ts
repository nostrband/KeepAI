import { describe, it, expect } from 'vitest';
import {
  EVENT_KINDS,
  PROTOCOL_VERSION,
  DEFAULT_RELAYS,
  TIMEOUTS,
  DEFAULT_POLICY,
  EXIT_CODES,
  CLEANUP,
} from '../constants.js';

describe('constants', () => {
  it('EVENT_KINDS has correct values', () => {
    expect(EVENT_KINDS.RPC_REQUEST).toBe(21700);
    expect(EVENT_KINDS.RPC_READY).toBe(21701);
    expect(EVENT_KINDS.RPC_REJECT).toBe(21702);
    expect(EVENT_KINDS.RPC_RESPONSE).toBe(21703);
    expect(EVENT_KINDS.RPC_READY_RESPONSE).toBe(21704);
    expect(EVENT_KINDS.STREAM_CHUNK).toBe(20173);
    expect(EVENT_KINDS.STREAM_METADATA).toBe(173);
  });

  it('PROTOCOL_VERSION is 1', () => {
    expect(PROTOCOL_VERSION).toBe(1);
  });

  it('DEFAULT_RELAYS has expected relay URLs', () => {
    expect(DEFAULT_RELAYS).toHaveLength(2);
    expect(DEFAULT_RELAYS[0]).toMatch(/^wss:\/\//);
  });

  it('TIMEOUTS has sane values', () => {
    expect(TIMEOUTS.REQUEST).toBe(300_000);
    expect(TIMEOUTS.READY_RESPONSE).toBe(60_000);
    expect(TIMEOUTS.PAIRING).toBe(600_000);
    expect(TIMEOUTS.APPROVAL_POLL).toBe(500);
  });

  it('DEFAULT_POLICY allows reads and asks for writes', () => {
    expect(DEFAULT_POLICY.default).toBe('ask');
    expect(DEFAULT_POLICY.rules).toHaveLength(2);
    expect(DEFAULT_POLICY.rules[0].action).toBe('allow');
    expect(DEFAULT_POLICY.rules[0].operations).toEqual(['read']);
    expect(DEFAULT_POLICY.rules[1].action).toBe('ask');
    expect(DEFAULT_POLICY.rules[1].operations).toEqual(['write', 'delete']);
  });

  it('EXIT_CODES has correct values', () => {
    expect(EXIT_CODES.SUCCESS).toBe(0);
    expect(EXIT_CODES.NOT_PAIRED).toBe(2);
    expect(EXIT_CODES.PERMISSION_DENIED).toBe(3);
    expect(EXIT_CODES.APPROVAL_TIMEOUT).toBe(4);
    expect(EXIT_CODES.SERVICE_ERROR).toBe(5);
  });

  it('CLEANUP intervals are reasonable', () => {
    expect(CLEANUP.INTERVAL).toBe(5 * 60 * 1000);
    expect(CLEANUP.RPC_REQUESTS_MAX_AGE).toBe(60 * 60 * 1000);
    expect(CLEANUP.APPROVALS_MAX_AGE).toBe(7 * 24 * 60 * 60 * 1000);
    expect(CLEANUP.AUDIT_LOG_MAX_AGE).toBe(30 * 24 * 60 * 60 * 1000);
  });
});
