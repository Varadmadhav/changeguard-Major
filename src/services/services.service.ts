import { Service } from '../types/service';
import { mockServices } from '../data/mockServices';

class ServicesService {
  private services: Service[] = [...mockServices];

<<<<<<< Updated upstream
=======
  private isMockMode(): boolean {
    try {
      if (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_USE_MOCK_DATA !== undefined) {
        return (import.meta as any).env.VITE_USE_MOCK_DATA !== 'false';
      }
    } catch {
      // ignore
    }
    if (typeof process !== 'undefined' && process.env?.VITE_USE_MOCK_DATA !== undefined) {
      return process.env.VITE_USE_MOCK_DATA !== 'false';
    }
    return true;
  }

>>>>>>> Stashed changes
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
