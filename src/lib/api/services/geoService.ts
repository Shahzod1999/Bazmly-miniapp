import { apiFetch } from "../config";
import { LanguageRead, RegionRead, DistrictRead, NearestDistrictRead } from "../types";

// Mijoz ilovasi uchun faqat o'qish metodlari
export const geoService = {
  async getLanguages(): Promise<LanguageRead[]> {
    return apiFetch<LanguageRead[]>("/api/v1/languages", { skipAuth: true });
  },

  async getRegions(): Promise<RegionRead[]> {
    return apiFetch<RegionRead[]>("/api/v1/regions", { skipAuth: true });
  },

  async getDistricts(regionId: number): Promise<DistrictRead[]> {
    return apiFetch<DistrictRead[]>(`/api/v1/regions/${regionId}/districts`, { skipAuth: true });
  },

  async getNearestDistrict(lat: number, lng: number): Promise<NearestDistrictRead> {
    return apiFetch<NearestDistrictRead>("/api/v1/districts/nearest", {
      params: { lat, lng },
      skipAuth: true,
    });
  },
};
