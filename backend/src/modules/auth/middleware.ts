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
      // These checks are independent. Running them together removes one full
      // database round trip from every protected API request.
      const [session, user] = await Promise.all([
        UserSession.findOne({
          _id: claims.sid,
          userId: claims.sub,
        })
          .select("status expiresAt roleAtIssue")
          .lean(),
        User.findById(claims.sub).select("status role").lean(),
      ]);
      if (
        !session ||
        session.status !== "ACTIVE" ||
        session.expiresAt.getTime() <= Date.now()
      ) {
        return next(
          unauthorized("SESSION_REVOKED", "This session is no longer active."),
        );
      }
      if (!user) return next(unauthorized());
      if (user.status !== "ACTIVE")
        return next(forbidden("ACCOUNT_BLOCKED", "This account is blocked."));
      if (
        user.role !== claims.role ||
        session.roleAtIssue !== claims.role
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
