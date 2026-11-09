import { Types, type ClientSession } from "mongoose";
import { ExerciseProgress, Quiz, QuizAttempt } from "../../db/models/index.js";
import type { QuizFields } from "../../db/models/quiz.js";
import type { QuizAttemptFields } from "../../db/models/quiz-attempt.js";
import { withTransaction } from "../../db/connection.js";
import { AppError, notFound } from "../../shared/errors.js";
import type { LearningService } from "./service.js";

type DecimalValue = { toString(): string };

type DecimalParts = { coefficient: bigint; scale: number };

function parseDecimal(value: string): DecimalParts {
  const match = /^([+-]?)(\d+)(?:\.(\d*))?(?:e([+-]?\d+))?$/i.exec(value);
  if (!match || match[1] === "-") {
    throw new AppError(
      409,
      "QUIZ_CONFIGURATION_INVALID",
      "Quiz points are invalid.",
    );
  }
  const fraction = match[3] ?? "";
  const exponent = Number(match[4] ?? "0");
  let coefficient = BigInt(`${match[2]}${fraction}` || "0");
  let scale = fraction.length - exponent;
  if (scale < 0) {
    coefficient *= 10n ** BigInt(-scale);
    scale = 0;
  }
  while (scale > 0 && coefficient % 10n === 0n) {
    coefficient /= 10n;
    scale -= 1;
  }
  return { coefficient, scale };
}

function addDecimals(values: string[]): string {
  const parts = values.map(parseDecimal);
  const scale = Math.max(0, ...parts.map((part) => part.scale));
  const coefficient = parts.reduce(
    (sum, part) => sum + part.coefficient * 10n ** BigInt(scale - part.scale),
    0n,
  );
  return formatDecimal({ coefficient, scale });
}

function formatDecimal(value: DecimalParts): string {
  let coefficient = value.coefficient;
  let scale = value.scale;
  while (scale > 0 && coefficient % 10n === 0n) {
    coefficient /= 10n;
    scale -= 1;
  }
  const digits = coefficient.toString();
  if (scale === 0) return digits;
  const padded = digits.padStart(scale + 1, "0");
  const split = padded.length - scale;
  return `${padded.slice(0, split)}.${padded.slice(split)}`;
}

function compareDecimals(left: DecimalParts, right: DecimalParts): number {
  const scale = Math.max(left.scale, right.scale);
  const leftValue = left.coefficient * 10n ** BigInt(scale - left.scale);
  const rightValue = right.coefficient * 10n ** BigInt(scale - right.scale);
  return leftValue < rightValue ? -1 : leftValue > rightValue ? 1 : 0;
}

function meetsPassScore(
  score: string,
  maxScore: string,
  passScorePercent: number | null,
): boolean | null {
  if (passScorePercent === null) return null;
  const scaledScore = parseDecimal(score);
  scaledScore.coefficient *= 100n;
  const scaledMax = parseDecimal(maxScore);
  const threshold = parseDecimal(String(passScorePercent));
  const right = {
    coefficient: scaledMax.coefficient * threshold.coefficient,
    scale: scaledMax.scale + threshold.scale,
  };
  return compareDecimals(scaledScore, right) >= 0;
}

function decimalString(value: DecimalValue): string {
  const parsed = parseDecimal(value.toString());
  return formatDecimal(parsed);
}

function conflict(code: string, message: string): AppError {
  return new AppError(409, code, message);
}

export class QuizService {
  constructor(private readonly learning: LearningService) {}

  async startAttempt(
    userId: string,
    exerciseId: string,
    idempotencyKey?: string,
  ) {
    const exercise = await this.learning.getExercise(userId, exerciseId);
    if (
      exercise.exerciseType !== "QUIZ" ||
      exercise.completionMode !== "QUIZ_SUBMISSION"
    ) {
      throw notFound();
    }
    const quiz = await Quiz.findOne({
      exerciseId: new Types.ObjectId(exerciseId),
    }).lean();
    if (!quiz || quiz.questions.length === 0) throw notFound();
    const scope = `START:${exerciseId}`;
    const existing = await this.findIdempotentAttempt(
      userId,
      quiz._id,
      scope,
      idempotencyKey,
    );
    if (existing) return this.toAttemptDto(existing);

    const snapshotQuestions = quiz.questions
      .slice()
      .sort(
        (left, right) =>
          left.sortOrder - right.sortOrder ||
          left._id.toString().localeCompare(right._id.toString()),
      )
      .map((question) => ({
        questionId: question._id,
        prompt: question.questionText,
        questionType: question.questionType,
        explanation: question.explanation ?? null,
        points: question.points,
        sortOrder: question.sortOrder,
        options: question.options
          .slice()
          .sort(
            (left, right) =>
              left.sortOrder - right.sortOrder ||
              left._id.toString().localeCompare(right._id.toString()),
          )
          .map((option) => ({
            optionId: option._id,
            label: option.optionText,
            isCorrect: option.isCorrect,
            sortOrder: option.sortOrder,
          })),
      }));
    const maxScoreText = addDecimals(
      snapshotQuestions.map((question) => decimalString(question.points)),
    );
    if (parseDecimal(maxScoreText).coefficient <= 0n) {
      throw conflict(
        "QUIZ_CONFIGURATION_INVALID",
        "Quiz maximum score must be greater than zero.",
      );
    }
    try {
      const [attempt] = await QuizAttempt.create([
        {
          userId: new Types.ObjectId(userId),
          quizId: quiz._id,
          exerciseId: new Types.ObjectId(exerciseId),
          status: "IN_PROGRESS",
          score: null,
          maxScore: Types.Decimal128.fromString(maxScoreText),
          correctCount: 0,
          totalQuestions: snapshotQuestions.length,
          gradingSnapshot: {
            title: quiz.title,
            showCorrectAnswers: quiz.showCorrectAnswers,
            passScorePercent: quiz.passScorePercent ?? null,
            questions: snapshotQuestions,
          },
          answers: [],
          startedAt: new Date(),
          submittedAt: null,
          idempotencyScope: idempotencyKey ? scope : null,
          idempotencyKey: idempotencyKey ?? null,
        },
      ]);
      if (!attempt) throw new Error("Quiz attempt insert returned no record.");
      return this.toAttemptDto(attempt);
    } catch (error) {
      if (!idempotencyKey || !isDuplicateKey(error)) throw error;
      const replay = await this.findIdempotentAttempt(
        userId,
        quiz._id,
        scope,
        idempotencyKey,
      );
      if (replay) return this.toAttemptDto(replay);
      throw error;
    }
  }

  async getAttempt(userId: string, attemptId: string) {
    const attempt = await this.findOwnedAttempt(userId, attemptId);
    await this.learning.assertExerciseAccess(
      userId,
      attempt.exerciseId.toString(),
    );
    return this.toAttemptDto(attempt);
  }

  async selectAnswer(
    userId: string,
    attemptId: string,
    questionId: string,
    selectedOptionId: string,
  ) {
    const attempt = await this.findOwnedAttempt(userId, attemptId);
    await this.learning.assertExerciseAccess(
      userId,
      attempt.exerciseId.toString(),
    );
    if (attempt.status !== "IN_PROGRESS") {
      throw conflict(
        "QUIZ_ATTEMPT_SUBMITTED",
        "Submitted quiz attempts cannot be edited.",
      );
    }
    const questionObjectId = new Types.ObjectId(questionId);
    const optionObjectId = new Types.ObjectId(selectedOptionId);
    const question = attempt.gradingSnapshot.questions.find((row) =>
      row.questionId.equals(questionObjectId),
    );
    if (!question) throw notFound();
    if (
      !question.options.some((option) => option.optionId.equals(optionObjectId))
    ) {
      throw new AppError(
        400,
        "QUIZ_OPTION_INVALID",
        "Selected option does not belong to this question.",
      );
    }
    const answer = attempt.answers.find((row) =>
      row.questionId.equals(questionObjectId),
    );
    if (answer) {
      answer.selectedOptionId = optionObjectId;
    } else {
      attempt.answers.push({
        questionId: questionObjectId,
        selectedOptionId: optionObjectId,
        isCorrect: false,
        awardedPoints: Types.Decimal128.fromString("0"),
      });
    }
    try {
      await attempt.save();
    } catch (error) {
      if (error instanceof Error && error.name === "VersionError") {
        throw conflict(
          "QUIZ_ANSWER_CONFLICT",
          "The answer changed concurrently. Reload the attempt and retry.",
        );
      }
      throw error;
    }
    return this.toAttemptDto(attempt);
  }

  async submitAttempt(userId: string, attemptId: string) {
    const attemptObjectId = new Types.ObjectId(attemptId);
    await this.findOwnedAttempt(userId, attemptId).then((attempt) =>
      this.learning.assertExerciseAccess(userId, attempt.exerciseId.toString()),
    );
    return withTransaction(async (session) => {
      const attempt = await QuizAttempt.findOne({
        _id: attemptObjectId,
        userId: new Types.ObjectId(userId),
      }).session(session);
      if (!attempt) throw notFound();
      if (attempt.status === "SUBMITTED") {
        await this.completeQuizExercise(userId, attempt.exerciseId, session);
        return this.toResultDto(attempt);
      }

      const answerByQuestion = new Map(
        attempt.answers.map((answer) => [
          answer.questionId.toString(),
          answer.selectedOptionId?.toString() ?? null,
        ]),
      );
      const graded = attempt.gradingSnapshot.questions.map((question) => {
        const selectedId =
          answerByQuestion.get(question.questionId.toString()) ?? null;
        const selected = selectedId
          ? question.options.find(
              (option) => option.optionId.toString() === selectedId,
            )
          : undefined;
        const isCorrect = selected?.isCorrect === true;
        return {
          questionId: question.questionId,
          selectedOptionId: selected?.optionId ?? null,
          isCorrect,
          awardedPoints: Types.Decimal128.fromString(
            isCorrect ? decimalString(question.points) : "0",
          ),
        };
      });
      const correctCount = graded.filter((answer) => answer.isCorrect).length;
      const scoreText = addDecimals(
        graded.map((answer) => decimalString(answer.awardedPoints)),
      );
      const updated = await QuizAttempt.findOneAndUpdate(
        { _id: attempt._id, userId: attempt.userId, status: "IN_PROGRESS" },
        {
          $set: {
            answers: graded,
            score: Types.Decimal128.fromString(scoreText),
            correctCount,
            totalQuestions: attempt.gradingSnapshot.questions.length,
            status: "SUBMITTED",
            submittedAt: new Date(),
          },
        },
        { returnDocument: "after", session, runValidators: true },
      );
      if (!updated) {
        const current = await QuizAttempt.findOne({
          _id: attempt._id,
          userId: attempt.userId,
        }).session(session);
        if (current?.status === "SUBMITTED") return this.toResultDto(current);
        throw conflict(
          "QUIZ_SUBMIT_CONFLICT",
          "Quiz submission changed concurrently.",
        );
      }
      await this.completeQuizExercise(userId, attempt.exerciseId, session);
      return this.toResultDto(updated);
    });
  }

  private async completeQuizExercise(
    userId: string,
    exerciseId: Types.ObjectId,
    session: ClientSession,
  ) {
    const now = new Date();
    await ExerciseProgress.findOneAndUpdate(
      {
        userId: new Types.ObjectId(userId),
        exerciseId,
      },
      [
        {
          $set: {
            status: "COMPLETED",
            completionSource: "QUIZ",
            startedAt: { $ifNull: ["$startedAt", now] },
            completedAt: { $ifNull: ["$completedAt", now] },
          },
        },
      ],
      {
        upsert: true,
        returnDocument: "after",
        session,
        updatePipeline: true,
      },
    );
  }

  async getResult(userId: string, attemptId: string) {
    const attempt = await this.findOwnedAttempt(userId, attemptId);
    await this.learning.assertExerciseAccess(
      userId,
      attempt.exerciseId.toString(),
    );
    if (attempt.status !== "SUBMITTED") {
      throw conflict(
        "QUIZ_NOT_SUBMITTED",
        "Submit this quiz before reading its result.",
      );
    }
    return this.toResultDto(attempt);
  }

  async retryAttempt(
    userId: string,
    attemptId: string,
    idempotencyKey?: string,
  ) {
    const original = await this.findOwnedAttempt(userId, attemptId);
    await this.learning.assertExerciseAccess(
      userId,
      original.exerciseId.toString(),
    );
    if (original.status !== "SUBMITTED") {
      throw conflict(
        "QUIZ_NOT_SUBMITTED",
        "Submit this quiz before starting a retry.",
      );
    }
    const quiz = await Quiz.findOne({ _id: original.quizId }).lean();
    if (!quiz) throw notFound();
    return this.createRetryAttempt(userId, original, quiz, idempotencyKey);
  }

  private async createRetryAttempt(
    userId: string,
    original: QuizAttemptFields & { _id: Types.ObjectId },
    quiz: QuizFields & { _id: Types.ObjectId },
    idempotencyKey?: string,
  ) {
    const scope = `RETRY:${original._id.toString()}`;
    const existing = await this.findIdempotentAttempt(
      userId,
      quiz._id,
      scope,
      idempotencyKey,
    );
    if (existing) return this.toAttemptDto(existing);
    const questions = quiz.questions
      .slice()
      .sort(
        (left, right) =>
          left.sortOrder - right.sortOrder ||
          left._id.toString().localeCompare(right._id.toString()),
      )
      .map((question) => ({
        questionId: question._id,
        prompt: question.questionText,
        questionType: question.questionType,
        explanation: question.explanation ?? null,
        points: question.points,
        sortOrder: question.sortOrder,
        options: question.options
          .slice()
          .sort(
            (left, right) =>
              left.sortOrder - right.sortOrder ||
              left._id.toString().localeCompare(right._id.toString()),
          )
          .map((option) => ({
            optionId: option._id,
            label: option.optionText,
            isCorrect: option.isCorrect,
            sortOrder: option.sortOrder,
          })),
      }));
    const maxScoreText = addDecimals(
      questions.map((question) => decimalString(question.points)),
    );
    if (parseDecimal(maxScoreText).coefficient <= 0n) {
      throw conflict(
        "QUIZ_CONFIGURATION_INVALID",
        "Quiz maximum score must be greater than zero.",
      );
    }
    try {
      const [attempt] = await QuizAttempt.create([
        {
          userId: new Types.ObjectId(userId),
          quizId: quiz._id,
          exerciseId: original.exerciseId,
          status: "IN_PROGRESS",
          score: null,
          maxScore: Types.Decimal128.fromString(maxScoreText),
          correctCount: 0,
          totalQuestions: questions.length,
          gradingSnapshot: {
            title: quiz.title,
            showCorrectAnswers: quiz.showCorrectAnswers,
            passScorePercent: quiz.passScorePercent ?? null,
            questions,
          },
          answers: [],
          startedAt: new Date(),
          submittedAt: null,
          idempotencyScope: idempotencyKey ? scope : null,
          idempotencyKey: idempotencyKey ?? null,
        },
      ]);
      if (!attempt) throw new Error("Quiz retry insert returned no record.");
      return this.toAttemptDto(attempt);
    } catch (error) {
      if (!idempotencyKey || !isDuplicateKey(error)) throw error;
      const replay = await this.findIdempotentAttempt(
        userId,
        quiz._id,
        scope,
        idempotencyKey,
      );
      if (replay) return this.toAttemptDto(replay);
      throw error;
    }
  }

  private async findOwnedAttempt(userId: string, attemptId: string) {
    const attempt = await QuizAttempt.findOne({
      _id: new Types.ObjectId(attemptId),
      userId: new Types.ObjectId(userId),
    });
    if (!attempt) throw notFound();
    return attempt;
  }

  private async findIdempotentAttempt(
    userId: string,
    quizId: Types.ObjectId,
    scope: string,
    idempotencyKey?: string,
  ) {
    if (!idempotencyKey) return undefined;
    return QuizAttempt.findOne({
      userId: new Types.ObjectId(userId),
      quizId,
      idempotencyScope: scope,
      idempotencyKey,
    });
  }

  private toAttemptDto(attempt: {
    _id: Types.ObjectId;
    status: "IN_PROGRESS" | "SUBMITTED";
    gradingSnapshot: {
      questions: Array<{
        questionId: Types.ObjectId;
        prompt: string;
        sortOrder: number;
        options: Array<{
          optionId: Types.ObjectId;
          label: string;
          sortOrder: number;
        }>;
      }>;
    };
    answers: Array<{
      questionId: Types.ObjectId;
      selectedOptionId?: Types.ObjectId | null;
    }>;
  }) {
    return {
      id: attempt._id.toString(),
      status: attempt.status,
      questions: attempt.gradingSnapshot.questions
        .slice()
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map((question) => ({
          id: question.questionId.toString(),
          prompt: question.prompt,
          options: question.options
            .slice()
            .sort((left, right) => left.sortOrder - right.sortOrder)
            .map((option) => ({
              id: option.optionId.toString(),
              label: option.label,
            })),
        })),
      selectedAnswers: Object.fromEntries(
        attempt.answers.map((answer) => [
          answer.questionId.toString(),
          answer.selectedOptionId?.toString() ?? null,
        ]),
      ),
    };
  }

  private toResultDto(attempt: {
    _id: Types.ObjectId;
    status: "IN_PROGRESS" | "SUBMITTED";
    score?: DecimalValue | null;
    maxScore: DecimalValue;
    correctCount: number;
    totalQuestions: number;
    gradingSnapshot: {
      showCorrectAnswers: boolean;
      passScorePercent?: number | null;
      questions: Array<{
        questionId: Types.ObjectId;
        prompt: string;
        explanation?: string | null;
        points: DecimalValue;
        options: Array<{
          optionId: Types.ObjectId;
          label: string;
          isCorrect: boolean;
        }>;
      }>;
    };
    answers: Array<{
      questionId: Types.ObjectId;
      selectedOptionId?: Types.ObjectId | null;
      isCorrect: boolean;
      awardedPoints: DecimalValue;
    }>;
  }) {
    const score = attempt.score ? decimalString(attempt.score) : "0";
    const maxScore = decimalString(attempt.maxScore);
    const review =
      attempt.gradingSnapshot.showCorrectAnswers &&
      attempt.status === "SUBMITTED"
        ? attempt.gradingSnapshot.questions.map((question) => {
            const answer = attempt.answers.find((row) =>
              row.questionId.equals(question.questionId),
            );
            const hasAnswer = Boolean(answer?.selectedOptionId);
            const correctOption = hasAnswer
              ? question.options.find((option) => option.isCorrect)
              : undefined;
            const selectedOption = hasAnswer
              ? question.options.find((option) =>
                  option.optionId.equals(answer!.selectedOptionId!),
                )
              : undefined;
            return {
              questionId: question.questionId.toString(),
              prompt: question.prompt,
              selectedOptionId: answer?.selectedOptionId?.toString() ?? null,
              selectedOption: selectedOption?.label ?? null,
              isCorrect: hasAnswer ? answer!.isCorrect : false,
              correctOptionId: correctOption?.optionId.toString() ?? null,
              correctOption: correctOption?.label ?? null,
              explanation: hasAnswer ? (question.explanation ?? null) : null,
              awardedPoints: decimalString(
                answer?.awardedPoints ?? Types.Decimal128.fromString("0"),
              ),
              points: decimalString(question.points),
            };
          })
        : [];
    return {
      attemptId: attempt._id.toString(),
      score,
      maxScore,
      correctCount: attempt.correctCount,
      totalQuestions: attempt.totalQuestions,
      passed: meetsPassScore(
        score,
        maxScore,
        attempt.gradingSnapshot.passScorePercent ?? null,
      ),
      review,
    };
  }
}

function isDuplicateKey(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
}
