/**
 * Replay Protection - Timestamp and nonce tracking
 */

import type { ReplayCheckResult } from './types';

// TODO: Implement in Task 6
export function checkMessage(ts: number, nonce: string): ReplayCheckResult {
  throw new Error('Not implemented - Task 6.1');
}

export function recordNonce(nonce: string, ts: number): void {
  throw new Error('Not implemented - Task 6.1');
}

export function cleanup(): number {
  throw new Error('Not implemented - Task 6.2');
}

export function setReplayWindow(seconds: number): void {
  throw new Error('Not implemented - Task 6.2');
}
