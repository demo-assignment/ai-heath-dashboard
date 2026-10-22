import type { ChartBlock } from "../services/tools.service.js";

export interface StoredMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  status: "pending" | "done" | "error" | "stopped";
  createdAt: string;
  charts?: ChartBlock[];
  meta?: { truncated: boolean; filtered: boolean; sources: string[]; unverifiedNumbers: string[] };
  error?: { code: string; message: string; retryable: boolean };
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: StoredMessage[];
}

const memory = new Map<string, Map<string, Conversation>>();
const locks = new Map<string, { token: string; expires: number }>();
const LOCK_SECONDS = 300;
const config = () => ({
  url: process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN,
});
const key = (owner: string) => `health:${owner}:conversations`;
const lockKey = (owner: string, id: string) => `${key(owner)}:lock:${id}`;
const redis = async (command: (string | number)[]) => {
  const { url, token } = config();
  const response = await fetch(url!, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || body?.error) throw new Error("Conversation storage is unavailable.");
  return body?.result;
};
const usesRedis = () => {
  const c = config();
  return !!(c.url && c.token);
};
const bucket = (owner: string) => {
  if (!memory.has(owner)) memory.set(owner, new Map());
  return memory.get(owner)!;
};
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

export const conversationStore = {
  list: async (owner: string): Promise<Conversation[]> => {
    if (usesRedis()) {
      const values: string[] = (await redis(["HVALS", key(owner)])) || [];
      return values.map(value => JSON.parse(value));
    }
    return clone([...bucket(owner).values()]);
  },
  get: async (owner: string, id: string): Promise<Conversation | null> => {
    if (usesRedis()) {
      const value = await redis(["HGET", key(owner), id]);
      return value ? JSON.parse(value) : null;
    }
    const value = bucket(owner).get(id);
    return value ? clone(value) : null;
  },
  put: async (owner: string, conversation: Conversation) => {
    if (usesRedis()) {
      await redis(["HSET", key(owner), conversation.id, JSON.stringify(conversation)]);
      return;
    }
    bucket(owner).set(conversation.id, clone(conversation));
  },
  remove: async (owner: string, id: string) => {
    if (usesRedis()) {
      await redis(["HDEL", key(owner), id]);
      return;
    }
    bucket(owner).delete(id);
  },
  lock: async (owner: string, id: string): Promise<string | null> => {
    const token = crypto.randomUUID();
    const k = lockKey(owner, id);
    if (usesRedis()) return (await redis(["SET", k, token, "NX", "EX", LOCK_SECONDS])) === "OK" ? token : null;
    const previous = locks.get(k);
    if (previous && previous.expires > Date.now()) return null;
    locks.set(k, { token, expires: Date.now() + LOCK_SECONDS * 1000 });
    return token;
  },
  unlock: async (owner: string, id: string, token: string) => {
    const k = lockKey(owner, id);
    if (usesRedis()) {
      await redis([
        "EVAL",
        "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) else return 0 end",
        1,
        k,
        token,
      ]);
      return;
    }
    if (locks.get(k)?.token === token) locks.delete(k);
  },
};
