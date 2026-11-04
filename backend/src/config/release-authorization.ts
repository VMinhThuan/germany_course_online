import type { AppConfig } from "./env.js";

export type StagingTargetAuthorization = {
  targetDatabase: string | undefined;
  confirmedHosts: string | undefined;
  confirmedReplicaSet: string | undefined;
  backupCheckpoint: string | undefined;
};

export class ReleaseAuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReleaseAuthorizationError";
  }
}

export function mongoHosts(uri: string): string[] {
  const withoutScheme = uri.replace(/^mongodb(?:\+srv)?:\/\//, "");
  const authority = withoutScheme.split(/[/?#]/, 1)[0];
  if (!authority)
    throw new ReleaseAuthorizationError("Invalid MongoDB target host.");
  const serverList = authority.slice(authority.lastIndexOf("@") + 1);
  const hosts = serverList
    .split(",")
    .map((server) => {
      try {
        return new URL(`http://${server}`).hostname
          .replace(/^\[|\]$/g, "")
          .toLowerCase();
      } catch {
        throw new ReleaseAuthorizationError("Invalid MongoDB target host.");
      }
    })
    .sort();
  if (hosts.length === 0 || hosts.some((host) => !host))
    throw new ReleaseAuthorizationError("Invalid MongoDB target host.");
  return hosts;
}

export function isStagingDatabaseName(databaseName: string): boolean {
  return /(^|[_-])stage(?:ing)?([_-]|$)/i.test(databaseName);
}

export function validateStagingTargetAuthorization(
  config: AppConfig,
  authorization: StagingTargetAuthorization,
): { expectedHosts: string[]; expectedDatabase: string } {
  if (config.nodeEnv !== "production")
    throw new ReleaseAuthorizationError(
      "Remote release operations require NODE_ENV=production.",
    );
  if (!isStagingDatabaseName(config.databaseName))
    throw new ReleaseAuthorizationError(
      "Remote release operations are restricted to a staging-named database.",
    );
  if (authorization.targetDatabase !== config.databaseName)
    throw new ReleaseAuthorizationError(
      "--target-db must exactly match MONGODB_DB_NAME.",
    );

  const expectedHosts = mongoHosts(config.mongoUri);
  if (authorization.confirmedHosts?.toLowerCase() !== expectedHosts.join(",")) {
    throw new ReleaseAuthorizationError(
      "--confirm-host must exactly match the MongoDB URI host list.",
    );
  }
  if (!authorization.confirmedReplicaSet?.trim())
    throw new ReleaseAuthorizationError("--confirm-replica-set is required.");
  if (!authorization.backupCheckpoint?.trim())
    throw new ReleaseAuthorizationError(
      "--backup-checkpoint is required before applying changes.",
    );
  if (
    !/^[A-Za-z0-9][A-Za-z0-9._:/-]{2,127}$/.test(authorization.backupCheckpoint)
  )
    throw new ReleaseAuthorizationError(
      "--backup-checkpoint must be a non-secret identifier containing only letters, digits, dot, underscore, colon, slash, or hyphen.",
    );

  return { expectedHosts, expectedDatabase: config.databaseName };
}
