import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const deriveKey = promisify(scrypt);
const SESSION_DURATION_SECONDS = 8 * 60 * 60;

// Public demo account, not a real person's password. Generated once with a random salt.
const DEMO_USER = {
  id: "demo-user",
  username: "user",
  name: "Long Phan",
  salt: "ba725f0a261df0b01f88418619e86668",
  passwordHash:
    "8d7fe7b11d1e8f0187f6d0c2f932fc8802e3f1a35676e3a9c2f510075879048b9e9f48ed192822357916b4ec41668dedd6a7558e33b83859b3c8441d18385d69",
};

export const publicUser = () => ({ id: DEMO_USER.id, username: DEMO_USER.username, name: DEMO_USER.name });
export const isProduction = () => process.env.NODE_ENV === "production" || !!process.env.VERCEL;
export const sessionDuration = SESSION_DURATION_SECONDS;

const getSecret = () => {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 32) return secret;
  if (isProduction()) throw new Error("SESSION_SECRET must contain at least 32 characters.");
  return "hearty-local-development-secret-not-for-production";
};

export const verifyCredentials = async (username: string, password: string) => {
  // Derive for unknown usernames too, so the result doesn't reveal whether a user exists.
  const candidate = (await deriveKey(password, Buffer.from(DEMO_USER.salt, "hex"), 64)) as Buffer;
  const matches = timingSafeEqual(candidate, Buffer.from(DEMO_USER.passwordHash, "hex"));
  return matches && username === DEMO_USER.username;
};

const sign = (payload: string) => createHmac("sha256", getSecret()).update(payload).digest("base64url");

export const createSession = (now = Date.now()) => {
  const payload = Buffer.from(
    JSON.stringify({
      sub: DEMO_USER.id,
      exp: Math.floor(now / 1000) + SESSION_DURATION_SECONDS,
      nonce: randomBytes(16).toString("hex"),
    }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
};

export const verifySession = (token: string | undefined, now = Date.now()) => {
  if (!token || token.length > 2048) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 2 || !parts.every(Boolean)) return null;
    const expected = Buffer.from(sign(parts[0]), "base64url");
    const supplied = Buffer.from(parts[1], "base64url");
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return null;
    const payload = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    if (payload.sub !== DEMO_USER.id || !Number.isInteger(payload.exp) || payload.exp <= Math.floor(now / 1000))
      return null;
    return publicUser();
  } catch {
    return null;
  }
};
