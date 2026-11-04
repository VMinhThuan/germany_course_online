import mongoose, { Types } from "mongoose";
import { decimalIntegerString } from "../catalog/service.js";

export type CourseProjection = {
  _id: Types.ObjectId;
  code: string;
  slug: string;
  title: string;
  level: string;
  shortDescription: string;
  price: mongoose.Types.Decimal128;
  accessDurationMonths: number;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
};

export function courseSummary(
  course: CourseProjection,
  chapterCount: number,
  lessonCount: number,
) {
  return {
    id: course._id.toString(),
    code: course.code,
    slug: course.slug,
    title: course.title,
    level: course.level,
    shortDescription: course.shortDescription,
    thumbnailUrl: null,
    price: decimalIntegerString(course.price),
    accessDurationMonths: course.accessDurationMonths,
    status: course.status,
    chapterCount,
    lessonCount,
  };
}

export function objectIdString(value: { toString(): string }): string {
  return value.toString();
}

const forbiddenContentKeys = new Set([
  "__proto__",
  "constructor",
  "prototype",
  "passwordhash",
  "refreshtokenhash",
  "storagekey",
  "secretaccesskey",
]);

export function safeLessonContent(value: unknown): unknown {
  const state = { nodes: 0 };

  function visit(candidate: unknown, depth: number): unknown {
    state.nodes += 1;
    if (state.nodes > 5000 || depth > 20) return null;
    if (
      candidate === null ||
      typeof candidate === "string" ||
      typeof candidate === "boolean"
    )
      return candidate;
    if (typeof candidate === "number")
      return Number.isFinite(candidate) ? candidate : null;
    if (candidate instanceof Date) return candidate.toISOString();
    if (candidate instanceof Types.ObjectId) return candidate.toString();
    if (candidate instanceof mongoose.Types.Decimal128)
      return candidate.toString();
    if (Array.isArray(candidate))
      return candidate.map((item) => visit(item, depth + 1));
    if (typeof candidate !== "object") return null;

    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(candidate)) {
      if (forbiddenContentKeys.has(key.toLowerCase())) continue;
      output[key] = visit(item, depth + 1);
    }
    return output;
  }

  return value === undefined ? null : visit(value, 0);
}
