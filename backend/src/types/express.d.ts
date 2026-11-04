import type { AccessClaims } from "../modules/auth/jwt.js";

declare global {
  namespace Express {
    interface Request {
      auth?: AccessClaims;
    }
  }
}

export {};
