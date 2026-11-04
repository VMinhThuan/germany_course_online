import { Types } from "mongoose";
import {
  Course,
  CourseSection,
  Enrollment,
  Exercise,
  Lesson,
} from "../../db/models/index.js";
import { notFound } from "../../shared/errors.js";

export class EntitlementService {
  constructor(private readonly now: () => Date = () => new Date()) {}

  async assertCourseAccess(userId: string, courseId: string) {
    const courseObjectId = new Types.ObjectId(courseId);
    const userObjectId = new Types.ObjectId(userId);
    const course = await Course.findOne({
      _id: courseObjectId,
      status: "PUBLISHED",
      deletedAt: null,
    }).lean();
    if (!course) throw notFound();

    const enrollment = await Enrollment.findOne({
      userId: userObjectId,
      courseId: course._id,
      status: "ACTIVE",
      expiresAt: { $gt: this.now() },
    }).lean();
    if (!enrollment) throw notFound();
    return { course, enrollment };
  }

  async assertSectionAccess(
    userId: string,
    courseId: string,
    sectionId: string,
  ) {
    const context = await this.assertCourseAccess(userId, courseId);
    const section = await CourseSection.findOne({
      _id: new Types.ObjectId(sectionId),
      courseId: context.course._id,
      status: "PUBLISHED",
      deletedAt: null,
    }).lean();
    if (!section) throw notFound();
    return { ...context, section };
  }

  async assertLessonAccess(userId: string, lessonId: string) {
    const lesson = await Lesson.findOne({
      _id: new Types.ObjectId(lessonId),
      status: "PUBLISHED",
      deletedAt: null,
    })
      .select("+content")
      .lean();
    if (!lesson) throw notFound();

    const section = await CourseSection.findOne({
      _id: lesson.sectionId,
      status: "PUBLISHED",
      deletedAt: null,
    }).lean();
    if (!section) throw notFound();
    const context = await this.assertCourseAccess(
      userId,
      section.courseId.toString(),
    );
    return { ...context, section, lesson };
  }

  async assertExerciseAccess(userId: string, exerciseId: string) {
    const exercise = await Exercise.findOne({
      _id: new Types.ObjectId(exerciseId),
      status: "PUBLISHED",
      deletedAt: null,
    }).lean();
    if (!exercise) throw notFound();
    const context = await this.assertLessonAccess(
      userId,
      exercise.lessonId.toString(),
    );
    return { ...context, exercise };
  }
}
