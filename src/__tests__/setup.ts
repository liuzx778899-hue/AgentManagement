/**
 * Global test setup for Vitest
 * Ensures proper cleanup of async operations
 */
import { afterEach, beforeEach } from 'vitest';
import { resetServerAvailability } from '../services/api/client';

beforeEach(() => {
  resetServerAvailability();
});

afterEach(() => {
  resetServerAvailability();
});
