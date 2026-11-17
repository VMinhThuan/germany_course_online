import "dotenv/config";
import { parseEnvironment } from "../src/config/env.js";
import { connectMongo, disconnectMongo } from "../src/db/connection.js";
import { Course, CourseSection } from "../src/db/models/index.js";

const apply = process.argv.includes("--apply");

async function main() {
  const config = parseEnvironment(process.env);
  await connectMongo(config);
  try {
    const course = await Course.findOne({
      $or: [{ code: "A1.1" }, { slug: "niveau-a1-1" }],
      deletedAt: null,
    })
      .select("_id code title previewChapterCount")
      .lean();
    if (!course) throw new Error("Niveau A1.1 course was not found.");
    const sections = await CourseSection.find({
      courseId: course._id,
      sectionType: "CHAPTER",
      deletedAt: null,
      status: { $ne: "HIDDEN" },
    })
      .sort({ sortOrder: 1, _id: 1 })
      .select("_id title sortOrder status")
      .lean();
    if (sections.length < 2)
      throw new Error("Niveau A1.1 must have at least two CHAPTER sections.");
    const needsInitialization = typeof course.previewChapterCount !== "number";
    const result =
      apply && needsInitialization
        ? await Course.updateOne(
            { _id: course._id, previewChapterCount: { $exists: false } },
            { $set: { previewChapterCount: 1 } },
          )
        : { modifiedCount: 0 };
    const latestCourse = await Course.findById(course._id)
      .select("previewChapterCount")
      .lean();
    console.log(
      JSON.stringify(
        {
          mode: apply ? "APPLY" : "PLAN_ONLY",
          course: {
            id: course._id.toString(),
            code: course.code,
            title: course.title,
          },
          previewChapterCount: {
            before: Number(course.previewChapterCount ?? 0),
            after: Number(latestCourse?.previewChapterCount ?? 0),
            changed: result.modifiedCount === 1,
          },
          chapterSections: sections.map((section) => ({
            id: section._id.toString(),
            title: section.title,
            sortOrder: section.sortOrder,
            status: section.status,
          })),
          modifiedCount: result.modifiedCount,
        },
        null,
        2,
      ),
    );
  } finally {
    await disconnectMongo();
  }
}

void main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "Preview seed failed.",
  );
  process.exitCode = 1;
});
