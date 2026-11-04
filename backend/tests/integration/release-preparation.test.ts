import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import argon2 from "argon2";
import { AuditLog, BootstrapMarker, User } from "../../src/db/models/index.js";
import {
  AdminBootstrapError,
  createInitialAdmin,
} from "../../src/modules/admin/admin-bootstrap.js";
import { createIndexPlan } from "../../src/db/index-migration.js";
import {
  clearTestDatabase,
  startTestDatabase,
  stopTestDatabase,
} from "../support/test-database.js";

describe("release preparation controls", () => {
  beforeAll(async () => {
    await startTestDatabase();
  });

  afterAll(async () => {
    await stopTestDatabase();
  });

  beforeEach(async () => {
    await clearTestDatabase();
  });

  it("plans current indexes without dropping any existing index", async () => {
    const plan = await createIndexPlan();
    expect(
      plan.entries.filter(
        (entry) => !["CREATE", "PRESENT", "RETAINED"].includes(entry.status),
      ),
    ).toEqual([]);
    expect(plan.canApply).toBe(true);
    expect(plan.entries.some((entry) => entry.status === "CREATE")).toBe(false);
    expect(plan.entries.some((entry) => entry.status === "CONFLICT")).toBe(
      false,
    );
    expect(plan.entries.some((entry) => entry.status === "DUPLICATES")).toBe(
      false,
    );
    expect(plan.entries.some((entry) => entry.status === "RETAINED")).toBe(
      false,
    );
  });

  it("blocks a missing unique index when synthetic duplicate keys exist", async () => {
    await User.collection.dropIndex("uq_users_email_normalized");
    try {
      await User.create([
        {
          fullName: "Synthetic Duplicate A",
          email: "duplicate@example.test",
          passwordHash: "synthetic-test-hash",
          role: "STUDENT",
          status: "ACTIVE",
        },
        {
          fullName: "Synthetic Duplicate B",
          email: "duplicate@example.test",
          passwordHash: "synthetic-test-hash",
          role: "STUDENT",
          status: "ACTIVE",
        },
      ]);

      const plan = await createIndexPlan();
      expect(plan.canApply).toBe(false);
      expect(
        plan.entries.find((entry) => entry.name === "uq_users_email_normalized")
          ?.status,
      ).toBe("DUPLICATES");
      const serializedPlan = JSON.stringify(plan);
      expect(serializedPlan).not.toContain("duplicate@example.test");
    } finally {
      await User.deleteMany({ email: "duplicate@example.test" });
      await User.createIndexes();
    }
  });

  it("creates one audited initial Admin with Argon2id and refuses a second bootstrap", async () => {
    const input = {
      fullName: "BE-06A Synthetic Administrator",
      email: "admin.be06a@example.test",
      password: "Synthetic-BE06A-Password-123!",
      operator: "Local BE-06A test operator",
      approvalTicket: "BE06A-LOCAL-TEST-01",
    };
    const result = await createInitialAdmin(input);

    expect(result.email).toBe(input.email);
    const admin = await User.findById(result.userId).select("+passwordHash");
    const passwordHash = admin?.get("passwordHash") as string;
    expect(admin?.get("role")).toBe("ADMIN");
    expect(passwordHash).toMatch(/^\$argon2id\$/);
    expect(await argon2.verify(passwordHash, input.password)).toBe(true);

    const audit = await AuditLog.findOne({
      action: "ADMIN_BOOTSTRAPPED",
    }).lean();
    expect(audit).toMatchObject({
      actorUserId: null,
      entityType: "User",
      entityId: result.userId,
    });
    expect(audit?.newValue).toMatchObject({
      email: input.email,
      role: "ADMIN",
      bootstrapOperator: input.operator,
      approvalTicket: input.approvalTicket,
    });
    expect(JSON.stringify(audit)).not.toContain(input.password);
    expect(await BootstrapMarker.countDocuments({ _id: "initial-admin" })).toBe(
      1,
    );

    await expect(createInitialAdmin(input)).rejects.toBeInstanceOf(
      AdminBootstrapError,
    );
    expect(await User.countDocuments({ role: "ADMIN" })).toBe(1);
    expect(
      await AuditLog.countDocuments({ action: "ADMIN_BOOTSTRAPPED" }),
    ).toBe(1);
  });

  it("rejects weak bootstrap credentials without creating an account", async () => {
    await expect(
      createInitialAdmin({
        fullName: "Synthetic Administrator",
        email: "admin-weak@example.test",
        password: "short",
        operator: "Local test operator",
        approvalTicket: "BE06A-LOCAL-TEST-02",
      }),
    ).rejects.toBeInstanceOf(AdminBootstrapError);
    expect(await User.countDocuments({ role: "ADMIN" })).toBe(0);
  });
});
