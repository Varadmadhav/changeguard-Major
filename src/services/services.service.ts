import { Service } from '../types/service';
import { mockServices } from '../data/mockServices';

class ServicesService {
  private services: Service[] = [...mockServices];

  async getServices(): Promise<Service[]> {
    return Promise.resolve([...this.services]);
  }

  async getServiceById(id: string): Promise<Service | undefined> {
    return Promise.resolve(
      this.services.find(s => s.id === id || s.slug === id || s.name.toLowerCase().includes(id.toLowerCase()))
    );
  }
}

export const servicesService = new ServicesService();
