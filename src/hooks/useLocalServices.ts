import { useContext } from 'react';
import { ServiceContext } from '../context/ServiceContext';
import type { LocalEngineeringServices } from '../services/local';

export function useLocalServices(): LocalEngineeringServices {
  const services = useContext(ServiceContext);
  if (!services) {
    // 浏览器环境返回 mock 服务
    if (typeof window !== 'undefined') {
      return createMockServices();
    }
    throw new Error('useLocalServices must be used within ServiceProvider');
  }
  return services;
}

function createMockServices(): LocalEngineeringServices {
  const { createLocalServices } = require('../services/local');
  return createLocalServices({ enableMock: true });
}
