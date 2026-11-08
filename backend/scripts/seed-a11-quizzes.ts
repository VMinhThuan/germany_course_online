import "dotenv/config";
import mongoose from "mongoose";
import { AdminService, type AuditActor } from "../src/modules/admin/service.js";
import {
  createExerciseSchema,
  createLessonSchema,
  exercisePatchSchema,
  quizWriteSchema,
} from "../src/modules/admin/schemas.js";
import {
  Course,
  CourseSection,
  Exercise,
  Lesson,
  Quiz,
  QuizAttempt,
} from "../src/db/models/index.js";
import { UnconfiguredMediaStorage } from "../src/modules/learning/media-storage.js";
import {
  readQuizWorkbook,
  type ImportedQuizQuestion,
} from "./quiz-seed/workbook.js";
import { hasWriteAccess } from "./quiz-seed/permissions.js";

const APPROVED_DATABASE = "paniverse_lms";
const APPROVED_HOST = "cluster0.arsopo1.mongodb.net";
const PRACTICE_LESSON_TITLE = "Luyện tập chia động từ";
const SYSTEM_ACTOR: AuditActor = {
  userId: null,
  ipAddress: null,
  source: "course-import",
};
const admin = new AdminService(new UnconfiguredMediaStorage());

type QuizSource = {
  title: "Verbkonjugation" | "Unregelmäßige Verben";
  description: string;
  filePath: string;
  questions: ImportedQuizQuestion[];
};

type PlannedQuiz = {
  source: QuizSource;
  exercise?: Awaited<ReturnType<typeof Exercise.findOne>>;
  definition?: Awaited<ReturnType<typeof Quiz.findOne>>;
  action: "create" | "complete-draft" | "publish" | "skip";
  attemptCount: number;
  exerciseSortOrder: number;
};

type Plan = {
  courseId: string;
  courseTitle: string;
  sectionId: string;
  sectionTitle: string;
  lesson?: Awaited<ReturnType<typeof Lesson.findOne>>;
  lessonAction: "create" | "reuse";
  lessonSortOrder: number;
  quizzes: PlannedQuiz[];
  conflicts: string[];
};

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const mode = args.get("mode");
  const targetDb = args.get("target-db");
  const conjugationPath = args.get("verbkonjugation");
  const irregularPath = args.get("irregular");
  if (!["dry-run", "apply", "verify"].includes(mode ?? ""))
    throw new CliError("INVALID_MODE", "Use --mode dry-run, apply, or verify.");
  if (targetDb !== APPROVED_DATABASE)
    throw new CliError(
      "TARGET_REJECTED",
      "Provide --target-db paniverse_lms explicitly.",
    );
  if (process.env.MONGODB_DB_NAME !== targetDb)
    throw new CliError(
      "DATABASE_ENV_MISMATCH",
      "MONGODB_DB_NAME must match the approved target.",
    );
  if (!conjugationPath || !irregularPath)
    throw new CliError(
      "SOURCE_FILES_REQUIRED",
      "Provide --verbkonjugation and --irregular workbook paths.",
    );
  const uri = process.env.MONGODB_URI;
  if (!uri)
    throw new CliError(
      "MONGODB_URI_MISSING",
      "MONGODB_URI is required in the process environment.",
    );
  if (getMongoHost(uri) !== APPROVED_HOST)
    throw new CliError(
      "CLUSTER_REJECTED",
      "MongoDB URI does not match the user-confirmed cluster.",
    );

  try {
    await mongoose.connect(uri, {
      dbName: targetDb,
      autoIndex: false,
      serverSelectionTimeoutMS: 10_000,
      appName: "paniverse-lms-ui10-quiz-seed",
    });
    const database = mongoose.connection.db;
    if (!database || mongoose.connection.name !== targetDb)
      throw new CliError(
        "DATABASE_UNVERIFIED",
        "Connected database does not match the approved target.",
      );
    const hello = await database.admin().command({ hello: 1 });
    if (typeof hello.setName !== "string" || !hello.setName)
      throw new CliError(
        "TRANSACTIONS_UNAVAILABLE",
        "The target does not report replica-set transaction support.",
      );
    const status = await database
      .admin()
      .command({ connectionStatus: 1, showPrivileges: true });
    if (!hasWriteAccess(status, targetDb))
      throw new CliError(
        "WRITE_ACCESS_UNVERIFIED",
        "The connection does not report write access to the required target collections.",
      );

    const sources: QuizSource[] = [
      {
        title: "Verbkonjugation",
        description: "Luyện tập chia động từ tiếng Đức theo ngôi.",
        filePath: conjugationPath,
        questions: await readQuizWorkbook(conjugationPath),
      },
      {
        title: "Unregelmäßige Verben",
        description: "Luyện tập chia các động từ bất quy tắc trong tiếng Đức.",
        filePath: irregularPath,
        questions: await readQuizWorkbook(irregularPath),
      },
    ];
    for (const source of sources)
      if (source.questions.length !== 20)
        throw new CliError(
          "QUESTION_COUNT_INVALID",
          `${source.title} must contain exactly 20 valid questions.`,
        );

    if (mode === "dry-run") {
      const plan = await buildPlan(sources);
      emit({
        mode,
        databaseName: targetDb,
        databaseConnected: true,
        writeAccessVerified: true,
        transactionSupportVerified: true,
        plan: summarize(plan),
      });
      if (plan.conflicts.length) process.exitCode = 2;
      return;
    }

    if (mode === "verify") {
      const plan = await buildPlan(sources);
      const complete =
        !plan.conflicts.length &&
        plan.lessonAction === "reuse" &&
        plan.quizzes.every((quiz) => quiz.action === "skip");
      const quizIds = plan.quizzes.flatMap(
        (quiz) => quiz.definition?._id ?? [],
      );
      const duplicateQuizCount = await Quiz.countDocuments({
        _id: { $in: quizIds },
      });
      const targetAttemptCount = await QuizAttempt.countDocuments({
        quizId: { $in: quizIds },
      });
      emit({
        mode,
        databaseName: targetDb,
        databaseConnected: true,
        complete,
        course: { id: plan.courseId, title: plan.courseTitle },
        section: { id: plan.sectionId, title: plan.sectionTitle },
        lesson: plan.lesson
          ? { id: plan.lesson._id.toString(), title: PRACTICE_LESSON_TITLE }
          : null,
        quizzes: plan.quizzes.map((quiz) => ({
          title: quiz.source.title,
          exerciseId: quiz.exercise?._id.toString() ?? null,
          quizId: quiz.definition?._id.toString() ?? null,
          questionCount: quiz.definition?.questions.length ?? 0,
          maximumPoints:
            quiz.definition?.questions.reduce(
              (sum, question) => sum + Number(question.points.toString()),
              0,
            ) ?? 0,
          exerciseStatus: quiz.exercise?.status ?? null,
          attemptCount: quiz.attemptCount,
          exactSourceMatch: quiz.action === "skip",
        })),
        quizRecordsVerified: duplicateQuizCount === 2,
        sourceQuestionCountVerified:
          plan.quizzes.reduce(
            (sum, quiz) => sum + (quiz.definition?.questions.length ?? 0),
            0,
          ) === 40,
        quizAttemptCount: targetAttemptCount,
        conflicts: plan.conflicts,
      });
      if (!complete || duplicateQuizCount !== 2) process.exitCode = 2;
      return;
    }

    const initial = await buildPlan(sources);
    if (initial.conflicts.length)
      throw new CliError("IMPORT_CONFLICT", initial.conflicts.join(" "));

    let lessonId = initial.lesson?._id.toString();
    if (!lessonId) {
      const lesson = await admin.createLesson(
        initial.sectionId,
        createLessonSchema.parse({
          title: PRACTICE_LESSON_TITLE,
          description: "Bài luyện tập tự chọn về cách chia động từ tiếng Đức.",
          lessonType: "PRACTICE",
          countsTowardProgress: false,
          sortOrder: initial.lessonSortOrder,
          status: "PUBLISHED",
        }),
        SYSTEM_ACTOR,
      );
      lessonId = lesson.id;
    }

    for (const planned of initial.quizzes) {
      let exerciseId = planned.exercise?._id.toString();
      if (!exerciseId) {
        const exercise = await admin.createExercise(
          lessonId,
          createExerciseSchema.parse({
            title: planned.source.title,
            description: planned.source.description,
            instructions:
              "Chọn một đáp án đúng cho mỗi câu. Bạn vẫn có thể nộp bài khi còn câu chưa trả lời.",
            exerciseType: "QUIZ",
            completionMode: "QUIZ_SUBMISSION",
            isRequired: false,
            sortOrder: planned.exerciseSortOrder,
            status: "DRAFT",
          }),
          SYSTEM_ACTOR,
        );
        exerciseId = exercise.id;
      }

      if (!planned.definition) {
        await admin.replaceQuiz(
          exerciseId,
          quizWriteSchema.parse(toQuizWrite(planned.source)),
          SYSTEM_ACTOR,
        );
      }
      if (planned.exercise?.status !== "PUBLISHED") {
        await admin.updateExercise(
          exerciseId,
          exercisePatchSchema.parse({ status: "PUBLISHED" }),
          SYSTEM_ACTOR,
        );
      }
    }

    const finalPlan = await buildPlan(sources);
    if (
      finalPlan.conflicts.length ||
      finalPlan.lessonAction !== "reuse" ||
      finalPlan.quizzes.some((quiz) => quiz.action !== "skip")
    )
      throw new CliError(
        "POST_APPLY_VERIFY_FAILED",
        "A fresh database read found unfinished work or conflicts.",
      );
    emit({
      mode,
      databaseName: targetDb,
      databaseConnected: true,
      applied: true,
      idempotencyVerified: true,
      plan: summarize(finalPlan),
    });
  } finally {
    await mongoose.disconnect();
  }
}

async function buildPlan(sources: QuizSource[]): Promise<Plan> {
  const conflicts: string[] = [];
  const courses = await Course.find({
    code: "NIVEAU_A1_1",
    deletedAt: null,
  }).lean();
  if (courses.length !== 1)
    throw new CliError(
      "COURSE_NOT_UNIQUE",
      `Expected one active NIVEAU_A1_1 course, found ${courses.length}.`,
    );
  const course = courses[0]!;
  if (course.status !== "PUBLISHED" || course.title !== "Niveau A1.1")
    throw new CliError(
      "COURSE_UNEXPECTED",
      "The NIVEAU_A1_1 course is not the expected published Niveau A1.1 course.",
    );
  const sections = await CourseSection.find({
    courseId: course._id,
    deletedAt: null,
  }).lean();
  const sectionMatches = sections.filter(
    (section) =>
      section.title === "Lektion 1" && section.sectionType === "CHAPTER",
  );
  if (sectionMatches.length !== 1 || sectionMatches[0]!.status !== "PUBLISHED")
    throw new CliError(
      "SECTION_UNEXPECTED",
      "Expected one published Lektion 1 chapter in Niveau A1.1.",
    );
  const section = sectionMatches[0]!;
  const lessons = await Lesson.find({
    sectionId: { $in: sections.map((row) => row._id) },
    deletedAt: null,
  }).lean();
  const practiceTitleHistory = await Lesson.find({
    sectionId: { $in: sections.map((row) => row._id) },
    title: PRACTICE_LESSON_TITLE,
  }).lean();
  const targetPractice = lessons.filter(
    (lesson) => lesson.title === PRACTICE_LESSON_TITLE,
  );
  if (targetPractice.length > 1)
    conflicts.push("Multiple active practice lessons share the target title.");
  if (
    targetPractice.some(
      (lesson) => lesson.sectionId.toString() !== section._id.toString(),
    )
  )
    conflicts.push(
      "The target practice lesson already exists under a different section.",
    );
  const lesson = targetPractice[0] ?? null;
  if (
    lesson &&
    (lesson.lessonType !== "PRACTICE" ||
      lesson.countsTowardProgress ||
      lesson.status !== "PUBLISHED")
  )
    conflicts.push(
      "The existing practice lesson has incompatible type, progress, or publish settings.",
    );
  const targetLessonSort =
    lessons
      .filter((row) => row.sectionId.toString() === section._id.toString())
      .reduce((highest, current) => Math.max(highest, current.sortOrder), -1) +
    1;

  const exercisesInCourse = await Exercise.find({
    lessonId: { $in: lessons.map((row) => row._id) },
  }).lean();
  const firstQuizSortOrder = lesson
    ? exercisesInCourse
        .filter((row) => row.lessonId.toString() === lesson!._id.toString())
        .reduce(
          (highest, current) => Math.max(highest, current.sortOrder),
          -1,
        ) + 1
    : 0;
  const quizzesInCourse = await Quiz.find({
    exerciseId: { $in: exercisesInCourse.map((row) => row._id) },
  }).lean();
  const quizzesByExercise = new Map(
    quizzesInCourse.map((quiz) => [quiz.exerciseId.toString(), quiz]),
  );
  const quizByTitle = new Map<string, typeof quizzesInCourse>();
  for (const quiz of quizzesInCourse) {
    const list = quizByTitle.get(quiz.title) ?? [];
    list.push(quiz);
    quizByTitle.set(quiz.title, list);
  }

  const plannedQuizzes: PlannedQuiz[] = [];
  for (const source of sources) {
    const duplicateDefinitions = quizByTitle.get(source.title) ?? [];
    const sameTitleExercises = exercisesInCourse.filter(
      (exercise) => exercise.title === source.title,
    );
    const titleExercises = lesson
      ? sameTitleExercises.filter(
          (exercise) => exercise.lessonId.toString() === lesson!._id.toString(),
        )
      : [];
    if (
      sameTitleExercises.some(
        (exercise) =>
          !lesson || exercise.lessonId.toString() !== lesson._id.toString(),
      )
    )
      conflicts.push(
        `An exercise titled ${source.title} already exists outside the target practice lesson.`,
      );
    if (titleExercises.length > 1)
      conflicts.push(
        `Multiple exercises share the target title ${source.title}.`,
      );
    const exercise = titleExercises[0] ?? null;
    const definition = exercise
      ? (quizzesByExercise.get(exercise._id.toString()) ?? null)
      : null;
    const otherDefinitions = duplicateDefinitions.filter(
      (row) => row.exerciseId.toString() !== exercise?._id.toString(),
    );
    if (otherDefinitions.length)
      conflicts.push(
        `A quiz titled ${source.title} already exists on another exercise in Niveau A1.1.`,
      );
    if (
      exercise &&
      (exercise.deletedAt ||
        exercise.exerciseType !== "QUIZ" ||
        exercise.completionMode !== "QUIZ_SUBMISSION" ||
        exercise.isRequired ||
        exercise.status === "HIDDEN")
    )
      conflicts.push(
        `The existing ${source.title} exercise has incompatible settings.`,
      );
    if (definition && !matchesQuiz(definition, source))
      conflicts.push(
        `The existing ${source.title} quiz differs from its workbook source; it was not overwritten.`,
      );
    if (!exercise && duplicateDefinitions.length)
      conflicts.push(
        `A quiz titled ${source.title} already exists without a reusable target exercise.`,
      );

    const action: PlannedQuiz["action"] = !exercise
      ? "create"
      : !definition
        ? "complete-draft"
        : exercise.status !== "PUBLISHED"
          ? "publish"
          : "skip";
    const attemptCount = definition
      ? await QuizAttempt.countDocuments({ quizId: definition._id })
      : 0;
    plannedQuizzes.push({
      source,
      ...(exercise ? { exercise: Exercise.hydrate(exercise) } : {}),
      ...(definition ? { definition: Quiz.hydrate(definition) } : {}),
      action,
      attemptCount,
      exerciseSortOrder:
        exercise?.sortOrder ?? firstQuizSortOrder + plannedQuizzes.length,
    });
  }

  if (practiceTitleHistory.some((row) => row.deletedAt))
    conflicts.push(
      "A soft-deleted practice lesson uses the target title; manual review is required.",
    );
  for (const source of sources)
    if (source.questions.length !== 20)
      conflicts.push(
        `${source.title} has ${source.questions.length} valid questions instead of 20.`,
      );

  return {
    courseId: course._id.toString(),
    courseTitle: course.title,
    sectionId: section._id.toString(),
    sectionTitle: section.title,
    ...(lesson ? { lesson: Lesson.hydrate(lesson) } : {}),
    lessonAction: lesson ? "reuse" : "create",
    lessonSortOrder: targetLessonSort,
    quizzes: plannedQuizzes,
    conflicts,
  };
}

function toQuizWrite(source: QuizSource) {
  return {
    title: source.title,
    description: source.description,
    passScorePercent: null,
    showCorrectAnswers: true,
    questions: source.questions.map((question, sortOrder) => ({
      questionText: question.questionText,
      questionType: "SINGLE_CHOICE" as const,
      explanation: null,
      points: "1",
      sortOrder,
      options: question.options.map((option, optionSortOrder) => ({
        optionText: option.optionText,
        isCorrect: option.isCorrect,
        sortOrder: optionSortOrder,
      })),
    })),
  };
}

function matchesQuiz(
  quiz: {
    title: string;
    description?: string | null;
    passScorePercent?: number | null;
    showCorrectAnswers: boolean;
    questions: Array<{
      questionText: string;
      questionType: string;
      points: { toString(): string };
      sortOrder: number;
      options: Array<{
        optionText: string;
        isCorrect: boolean;
        sortOrder: number;
      }>;
    }>;
  },
  source: QuizSource,
) {
  if (
    quiz.title !== source.title ||
    (quiz.description ?? null) !== source.description ||
    (quiz.passScorePercent ?? null) !== null ||
    !quiz.showCorrectAnswers ||
    quiz.questions.length !== source.questions.length
  )
    return false;
  const actual = [...quiz.questions].sort(
    (left, right) => left.sortOrder - right.sortOrder,
  );
  return source.questions.every((expected, index) => {
    const question = actual[index];
    if (
      !question ||
      question.sortOrder !== index ||
      question.questionText !== expected.questionText ||
      question.questionType !== "SINGLE_CHOICE" ||
      question.points.toString() !== "1" ||
      question.options.length !== expected.options.length
    )
      return false;
    const options = [...question.options].sort(
      (left, right) => left.sortOrder - right.sortOrder,
    );
    return expected.options.every((expectedOption, optionIndex) => {
      const option = options[optionIndex];
      return (
        Boolean(option) &&
        option!.optionText === expectedOption.optionText &&
        option!.isCorrect === expectedOption.isCorrect &&
        option!.sortOrder === optionIndex
      );
    });
  });
}

function summarize(plan: Plan) {
  return {
    course: { id: plan.courseId, title: plan.courseTitle },
    section: { id: plan.sectionId, title: plan.sectionTitle },
    lesson: {
      title: PRACTICE_LESSON_TITLE,
      action: plan.lessonAction,
      countsTowardProgress: false,
      sortOrder: plan.lessonSortOrder,
    },
    quizzes: plan.quizzes.map((quiz) => ({
      title: quiz.source.title,
      exerciseId: quiz.exercise?._id.toString() ?? null,
      quizId: quiz.definition?._id.toString() ?? null,
      questionCount: quiz.source.questions.length,
      action: quiz.action,
      exerciseSortOrder: quiz.exerciseSortOrder,
      existingAttemptCount: quiz.attemptCount,
    })),
    conflicts: plan.conflicts,
  };
}

function parseArgs(argv: string[]) {
  const result = new Map<string, string>();
  for (const value of argv) {
    const match =
      /^--([a-z-]+)=(.*)$/.exec(value) ?? /^--([a-z-]+)$/.exec(value);
    if (!match)
      throw new CliError(
        "INVALID_ARGUMENT",
        `Invalid CLI argument: ${value.split("=")[0]}.`,
      );
    result.set(match[1]!, match[2] ?? "true");
  }
  return result;
}

function getMongoHost(uri: string) {
  const match = /^mongodb(?:\+srv)?:\/\/(?:[^@/]+@)?([^/?#]+)/i.exec(uri);
  if (!match)
    throw new CliError(
      "MONGODB_URI_INVALID",
      "MONGODB_URI could not be parsed.",
    );
  return match[1]!.split(":")[0]!.toLocaleLowerCase("en");
}

function emit(value: unknown) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

class CliError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "CliError";
  }
}

main().catch((error: unknown) => {
  const known = error instanceof CliError;
  const message =
    error instanceof Error ? error.message : "Unexpected seed error.";
  const safeMessage = message.replace(
    /mongodb(?:\+srv)?:\/\/[^@\s]+@/gi,
    "mongodb://[redacted]@",
  );
  process.stderr.write(
    `${JSON.stringify({ error: known ? error.code : "SEED_FAILED", message: safeMessage })}\n`,
  );
  process.exitCode = 1;
});
