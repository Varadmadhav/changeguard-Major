import { useState, useEffect } from 'react';
import { Service } from '../types/service';
import { servicesService } from '../services/services.service';

export function useServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    servicesService.getServices().then(res => {
      setServices(res);
      setLoading(false);
    });
  }, []);

  return { services, loading };
}

export function useService(id: string) {
  const [service, setService] = useState<Service | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    servicesService.getServiceById(id).then(res => {
      setService(res);
      setLoading(false);
    });
  }, [id]);

  return { service, loading };
}
