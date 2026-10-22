import { request } from "@/api/client";
import { ENDPOINTS } from "@/api/endpoints";
import type { Dashboard } from "@/types/health";

export const getDashboard = () => {
  return request<Dashboard>(ENDPOINTS.health.dashboard);
};
