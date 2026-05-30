import React from 'react';
import type { LocalEngineeringServices } from '../services/local';

export const ServiceContext = React.createContext<LocalEngineeringServices | null>(null);

export function ServiceProvider({
  children,
  services
}: {
  children: React.ReactNode;
  services: LocalEngineeringServices;
}) {
  return (
    <ServiceContext.Provider value={services}>
      {children}
    </ServiceContext.Provider>
  );
}
