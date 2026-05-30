import { createLocalServices, LocalEngineeringServices } from '../../services/local';
import type { AdapterConfig } from '../../types/localEngineering';

let services: LocalEngineeringServices | null = null;

export function getServices(): LocalEngineeringServices {
  if (!services) {
    const config: AdapterConfig = {
      enableMock: false, // Server always uses real adapters
      defaultTimeout: 30000,
      projectRoot: process.cwd(),
    };
    services = createLocalServices(config);
  }
  return services;
}
