import type { DailyRecord } from "../types/health.js";
import type { ProfileUpdate } from "../utils/validateProfile.js";

// Where the user's own changes are kept: added days and the edited profile. The sample data itself is read-only.
export interface EntryStore {
  getAll: () => Promise<DailyRecord[]>;
  upsertMany: (records: DailyRecord[]) => Promise<void>;
  getProfile: () => Promise<ProfileUpdate | null>;
  setProfile: (profile: ProfileUpdate) => Promise<void>;
  clear: () => Promise<void>;
}

// Default: in memory. Simple, but it resets when the server restarts or Vercel starts a new instance.
const createMemoryStore = (): EntryStore => {
  const entries = new Map<string, DailyRecord>();
  let profile: ProfileUpdate | null = null;
  return {
    getAll: async () => [...entries.values()],
    upsertMany: async records => {
      records.forEach(record => entries.set(record.date, record));
    },
    getProfile: async () => profile,
    setProfile: async next => {
      profile = next;
    },
    clear: async () => {
      entries.clear();
      profile = null;
    },
  };
};

// Optional: Upstash Redis over its REST API (free tier, available from the Vercel Marketplace).
// Uses plain fetch, so no extra dependency. One hash per persona: field = date, value = JSON record.
const createRedisStore = (url: string, token: string, key: string, profileKey: string): EntryStore => {
  const run = async (command: (string | number)[]) => {
    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(command),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok || body?.error) throw new Error(`Redis error: ${body?.error || response.status}`);
    return body?.result;
  };

  return {
    getAll: async () => {
      const result: string[] = (await run(["HGETALL", key])) || [];
      const records: DailyRecord[] = [];
      for (let i = 1; i < result.length; i += 2) records.push(JSON.parse(result[i]));
      return records;
    },
    upsertMany: async records => {
      if (!records.length) return;
      await run(["HSET", key, ...records.flatMap(record => [record.date, JSON.stringify(record)])]);
    },
    getProfile: async () => {
      const value: string | null = await run(["GET", profileKey]);
      return value ? JSON.parse(value) : null;
    },
    setProfile: async profile => {
      await run(["SET", profileKey, JSON.stringify(profile)]);
    },
    clear: async () => {
      await run(["DEL", key, profileKey]);
    },
  };
};

let store: EntryStore | null = null;

export const getEntryStore = (personaId: string) => {
  if (store) return store;
  const url = process?.env?.UPSTASH_REDIS_REST_URL || process?.env?.KV_REST_API_URL;
  const token = process?.env?.UPSTASH_REDIS_REST_TOKEN || process?.env?.KV_REST_API_TOKEN;
  store =
    url && token
      ? createRedisStore(url, token, `health:${personaId}:entries`, `health:${personaId}:profile`)
      : createMemoryStore();
  return store;
};

export const getStoreType = () =>
  process?.env?.UPSTASH_REDIS_REST_URL || process?.env?.KV_REST_API_URL ? "redis" : "memory";
