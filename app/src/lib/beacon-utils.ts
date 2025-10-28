import { PublicKey } from '@solana/web3.js';

/**
 * Generate a unique mock PublicKey for beacons
 * This ensures each beacon has a unique identifier even when using mock keys
 */
export function generateUniqueBeaconKey(beaconId?: string | number): PublicKey {
  const mockKeyBytes = new Uint8Array(32);
  
  // Fill with random data for uniqueness
  crypto.getRandomValues(mockKeyBytes);
  
  // Mark as beacon type
  mockKeyBytes[0] = 1; // Mark as beacon
  mockKeyBytes[31] = 0x42; // Mark as beacon
  
  // If we have a beacon ID, incorporate it for additional uniqueness
  if (beaconId) {
    const idBytes = new TextEncoder().encode(beaconId.toString());
    for (let i = 0; i < Math.min(idBytes.length, 16); i++) {
      mockKeyBytes[i + 1] = idBytes[i];
    }
  }
  
  return new PublicKey(mockKeyBytes);
}

/**
 * Generate a unique beacon ID
 */
export function generateUniqueBeaconId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substr(2, 9);
  return `beacon_${timestamp}_${random}`;
}

/**
 * Generate unique transaction signature for beacons
 */
export function generateUniqueTransactionId(): string {
  const timestamp = Date.now();
  const random = crypto.getRandomValues(new Uint8Array(8));
  const randomHex = Array.from(random).map(b => b.toString(16).padStart(2, '0')).join('');
  return `tx_${timestamp}_${randomHex}`;
}
