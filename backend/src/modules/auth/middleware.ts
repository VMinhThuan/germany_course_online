import type { RequestHandler } from "express";
import type { AppConfig } from "../../config/env.js";
import { User, UserSession } from "../../db/models/index.js";
import { forbidden, unauthorized } from "../../shared/errors.js";
import { verifyAccessToken } from "./jwt.js";
import type { AccessClaims } from "./jwt.js";

export function authenticate(config: AppConfig): RequestHandler {
  return async (req, _res, next) => {
    const authorization = req.header("authorization");
    const token = authorization?.match(/^Bearer ([^\s]+)$/i)?.[1];
    if (!token) return next(unauthorized());
    let claims: AccessClaims;
    try {
      claims = await verifyAccessToken(config, token);
    } catch {
      next(unauthorized());
      return;
    }
    try {
      const session = await UserSession.findOne({
        _id: claims.sid,
        userId: claims.sub,
      });
      if (
        !session ||
        session.get("status") !== "ACTIVE" ||
        (session.get("expiresAt") as Date).getTime() <= Date.now()
      ) {
        return next(
          unauthorized("SESSION_REVOKED", "This session is no longer active."),
        );
      }
      const user = await User.findById(claims.sub);
      if (!user) return next(unauthorized());
      if (user.get("status") !== "ACTIVE")
        return next(forbidden("ACCOUNT_BLOCKED", "This account is blocked."));
      if (
        user.get("role") !== claims.role ||
        session.get("roleAtIssue") !== claims.role
      )
        return next(
          unauthorized("SESSION_REVOKED", "This session is no longer valid."),
        );
      req.auth = claims;
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function requireRole(
  ...roles: Array<"STUDENT" | "ADMIN">
): RequestHandler {
  return (req, _res, next) => {
    if (!req.auth) return next(unauthorized());
    if (!roles.includes(req.auth.role)) return next(forbidden());
    next();
  };
}
