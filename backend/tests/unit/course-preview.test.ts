import { describe, expect, it } from "vitest";
import {
  getPreviewSectionIds,
  normalizePreviewChapterCount,
} from "../../src/shared/course-preview.js";
import {
  coursePatchSchema,
  createCourseSchema,
  previewConfigSchema,
} from "../../src/modules/admin/schemas.js";

describe("course preview chapter configuration", () => {
  const sections = [
    { _id: "late", sectionType: "CHAPTER", sortOrder: 30 },
    { _id: "exam", sectionType: "EXAM_PREP", sortOrder: 5 },
    { _id: "first", sectionType: "CHAPTER", sortOrder: 10 },
    { _id: "second", sectionType: "CHAPTER", sortOrder: 20 },
  ];

  it("selects the first N CHAPTER sections by sortOrder and excludes EXAM_PREP", () => {
    expect(getPreviewSectionIds(sections, 2)).toEqual(["first", "second"]);
    expect(getPreviewSectionIds(sections, 3)).toEqual([
      "first",
      "second",
      "late",
    ]);
  });

  it("returns no preview sections for zero, negative, or fractional counts", () => {
    expect(getPreviewSectionIds(sections, 0)).toEqual([]);
    expect(getPreviewSectionIds(sections, -1)).toEqual([]);
    expect(getPreviewSectionIds(sections, 1.5)).toEqual([]);
  });

  it("uses explicit chapter selection when the Admin has saved one", () => {
    expect(
      getPreviewSectionIds(
        sections.map((section) => ({
          ...section,
          previewEnabled: section._id === "late",
        })),
        1,
      ),
    ).toEqual(["late"]);
  });

  it("normalizes only non-negative integers", () => {
    expect(normalizePreviewChapterCount(2)).toBe(2);
    expect(normalizePreviewChapterCount(-1)).toBe(0);
    expect(normalizePreviewChapterCount(1.5)).toBe(0);
    expect(normalizePreviewChapterCount("2")).toBe(0);
  });

  it("rejects negative and fractional admin values", () => {
    const base = {
      code: "A1-1",
      slug: "a1-1",
      title: "German A1.1",
      description: "A sufficiently long course description.",
      shortDescription: "Beginner course",
      objectives: [],
      requirements: [],
      level: "A1",
      price: "1000000",
      accessDurationMonths: 12,
      previewChapterCount: 1,
      sortOrder: 0,
    };
    expect(createCourseSchema.safeParse(base).success).toBe(true);
    expect(
      createCourseSchema.safeParse({ ...base, previewChapterCount: -1 })
        .success,
    ).toBe(false);
    expect(
      coursePatchSchema.safeParse({ previewChapterCount: 1.5 }).success,
    ).toBe(false);
    expect(
      previewConfigSchema.safeParse({
        chapterIds: ["507f1f77bcf86cd799439011"],
        lessonIds: [],
        exerciseIds: [],
      }).success,
    ).toBe(true);
  });
});
