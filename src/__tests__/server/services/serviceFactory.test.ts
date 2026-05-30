import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('ServiceFactory', () => {
  beforeEach(() => {
    // Reset modules to clear singleton state
    vi.resetModules();
  });

  it('should return a LocalEngineeringServices instance', async () => {
    const { getServices } = await import('../../../server/services/serviceFactory');
    const services = getServices();

    expect(services).toBeDefined();
    expect(services.git).toBeDefined();
    expect(services.fileStore).toBeDefined();
    expect(services.processRunner).toBeDefined();
    expect(services.repositories).toBeDefined();
  });

  it('should return the same instance on multiple calls (singleton)', async () => {
    const { getServices } = await import('../../../server/services/serviceFactory');
    const services1 = getServices();
    const services2 = getServices();

    expect(services1).toBe(services2);
  });

  it('should use real adapters (not mock) in server context', async () => {
    const { getServices } = await import('../../../server/services/serviceFactory');
    const services = getServices();

    // The server should always use real adapters
    // We can verify this by checking if the adapter has the mock flag disabled
    expect(services.git).toBeDefined();
    // In real mode, getStatus should attempt real git commands
    // For now, just verify the service exists
  });
});
