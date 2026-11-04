import { randomUUID } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import type { AppConfig } from "../../config/env.js";

export type AccessClaims = {
  sub: string;
  sid: string;
  role: "STUDENT" | "ADMIN";
  jti: string;
};

const key = (config: AppConfig) =>
  new TextEncoder().encode(config.jwtAccessSecret);

export async function issueAccessToken(
  config: AppConfig,
  claims: Omit<AccessClaims, "jti">,
): Promise<string> {
  return new SignJWT({ sid: claims.sid, role: claims.role })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(claims.sub)
    .setIssuer(config.jwtIssuer)
    .setAudience(config.jwtAudience)
    .setIssuedAt()
    .setExpirationTime(`${config.accessTokenTtlSeconds}s`)
    .setJti(randomUUID())
    .sign(key(config));
}

export async function verifyAccessToken(
  config: AppConfig,
  token: string,
): Promise<AccessClaims> {
  const { payload, protectedHeader } = await jwtVerify(token, key(config), {
    algorithms: ["HS256"],
    issuer: config.jwtIssuer,
    audience: config.jwtAudience,
  });
  if (
    protectedHeader.alg !== "HS256" ||
    typeof payload.sub !== "string" ||
    typeof payload.sid !== "string" ||
    (payload.role !== "STUDENT" && payload.role !== "ADMIN") ||
    typeof payload.jti !== "string" ||
    typeof payload.iat !== "number" ||
    typeof payload.exp !== "number"
  ) {
    throw new Error("Invalid access token claims.");
  }
  return {
    sub: payload.sub,
    sid: payload.sid,
    role: payload.role,
    jti: payload.jti,
  };
}
