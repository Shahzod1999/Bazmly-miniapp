import { apiFetch } from "../config";
import { AmenityRead, ServiceCatalogRead } from "../types";

export const catalogService = {
  async getAmenities(): Promise<AmenityRead[]> {
    return apiFetch<AmenityRead[]>("/api/v1/amenities", { skipAuth: true });
  },

  async getServiceCatalog(): Promise<ServiceCatalogRead[]> {
    return apiFetch<ServiceCatalogRead[]>("/api/v1/service-catalog", { skipAuth: true });
  },
};
