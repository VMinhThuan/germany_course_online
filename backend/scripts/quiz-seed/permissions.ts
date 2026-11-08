const REQUIRED_ACTIONS = [
  ["course_sections", "find"],
  ["course_sections", "insert"],
  ["course_sections", "update"],
  ["lessons", "find"],
  ["lessons", "insert"],
  ["lessons", "update"],
  ["exercises", "find"],
  ["exercises", "insert"],
  ["exercises", "update"],
  ["quizzes", "find"],
  ["quizzes", "insert"],
  ["quizzes", "update"],
  ["quiz_attempts", "find"],
  ["audit_logs", "insert"],
] as const;

type MongoPrivilege = {
  resource?: { db?: unknown; collection?: unknown };
  actions?: unknown;
};

export function hasWriteAccess(status: unknown, database: string) {
  const authInfo = (
    status as {
      authInfo?: {
        authenticatedUserRoles?: unknown;
        authenticatedUserPrivileges?: unknown;
      };
    } | null
  )?.authInfo;
  const roles = authInfo?.authenticatedUserRoles;
  if (
    Array.isArray(roles) &&
    roles.some((entry) => {
      const row = entry as { role?: unknown; db?: unknown };
      return (
        (row.db === database &&
          ["readWrite", "dbOwner"].includes(String(row.role))) ||
        (row.db === "admin" &&
          ["readWriteAnyDatabase", "root"].includes(String(row.role)))
      );
    })
  )
    return true;

  const privileges = authInfo?.authenticatedUserPrivileges;
  return (
    Array.isArray(privileges) &&
    REQUIRED_ACTIONS.every(([collection, action]) =>
      privileges.some((entry) => {
        const row = entry as MongoPrivilege;
        const resourceDb = row.resource?.db;
        const resourceCollection = row.resource?.collection;
        return (
          (resourceDb === database || resourceDb === "") &&
          (resourceCollection === collection || resourceCollection === "") &&
          Array.isArray(row.actions) &&
          row.actions.includes(action)
        );
      }),
    )
  );
}
