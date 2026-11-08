import { describe, expect, it } from "vitest";
import { hasWriteAccess } from "../../scripts/quiz-seed/permissions.js";

const collections = [
  "course_sections",
  "lessons",
  "exercises",
  "quizzes",
  "quiz_attempts",
  "audit_logs",
];

describe("quiz seed write permission guard", () => {
  it("accepts an explicitly scoped write role for the approved database", () => {
    expect(
      hasWriteAccess(
        {
          authInfo: {
            authenticatedUserRoles: [
              { role: "readWrite", db: "paniverse_lms" },
            ],
          },
        },
        "paniverse_lms",
      ),
    ).toBe(true);
  });

  it("accepts MongoDB wildcard privileges only when every required action is present", () => {
    const wildcardPrivilege = {
      resource: { db: "", collection: "" },
      actions: ["find", "insert", "update"],
    };
    expect(
      hasWriteAccess(
        { authInfo: { authenticatedUserPrivileges: [wildcardPrivilege] } },
        "paniverse_lms",
      ),
    ).toBe(true);
    expect(
      hasWriteAccess(
        {
          authInfo: {
            authenticatedUserPrivileges: [
              { ...wildcardPrivilege, actions: ["find"] },
            ],
          },
        },
        "paniverse_lms",
      ),
    ).toBe(false);
  });

  it("rejects privileges scoped to another database", () => {
    const rows = collections.flatMap((collection) =>
      ["find", "insert", "update"].map((action) => ({
        resource: { db: "another_db", collection },
        actions: [action],
      })),
    );
    expect(
      hasWriteAccess(
        { authInfo: { authenticatedUserPrivileges: rows } },
        "paniverse_lms",
      ),
    ).toBe(false);
  });
});
