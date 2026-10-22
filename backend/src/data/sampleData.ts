import healthData from "./health-data.json" with { type: "json" };
import type { HealthData } from "../types/health.js";

// The fictional persona + 8 weeks of device data. It never changes; manual entries are stored separately.
export const getSampleData = (): HealthData => healthData as HealthData;
