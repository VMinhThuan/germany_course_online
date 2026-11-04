import mongoose, {
  model,
  Schema,
  type InferSchemaType,
  type Model,
} from "mongoose";

const models = mongoose.models;

const snapshotOptionSchema = new Schema(
  {
    optionId: { type: Schema.Types.ObjectId, required: true },
    label: { type: String, required: true },
    isCorrect: { type: Boolean, required: true },
    sortOrder: { type: Number, required: true },
  },
  { _id: false, strict: "throw" },
);

const snapshotQuestionSchema = new Schema(
  {
    questionId: { type: Schema.Types.ObjectId, required: true },
    prompt: { type: String, required: true },
    questionType: { type: String, enum: ["SINGLE_CHOICE"], required: true },
    explanation: { type: String, default: null },
    points: { type: Schema.Types.Decimal128, required: true },
    sortOrder: { type: Number, required: true },
    options: { type: [snapshotOptionSchema], required: true },
  },
  { _id: false, strict: "throw" },
);

const gradingSnapshotSchema = new Schema(
  {
    title: { type: String, required: true },
    showCorrectAnswers: { type: Boolean, required: true },
    passScorePercent: { type: Number, default: null },
    questions: { type: [snapshotQuestionSchema], required: true },
  },
  { _id: false, strict: "throw" },
);

const answerSchema = new Schema(
  {
    questionId: { type: Schema.Types.ObjectId, required: true },
    selectedOptionId: { type: Schema.Types.ObjectId, default: null },
    isCorrect: { type: Boolean, required: true, default: false },
    awardedPoints: { type: Schema.Types.Decimal128, required: true },
  },
  { _id: false, strict: "throw" },
);

const quizAttemptSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    quizId: { type: Schema.Types.ObjectId, ref: "Quiz", required: true },
    exerciseId: {
      type: Schema.Types.ObjectId,
      ref: "Exercise",
      required: true,
    },
    status: {
      type: String,
      enum: ["IN_PROGRESS", "SUBMITTED"],
      required: true,
    },
    score: { type: Schema.Types.Decimal128, default: null },
    maxScore: { type: Schema.Types.Decimal128, required: true },
    correctCount: {
      type: Number,
      required: true,
      min: 0,
      validate: Number.isInteger,
    },
    totalQuestions: {
      type: Number,
      required: true,
      min: 1,
      validate: Number.isInteger,
    },
    gradingSnapshot: { type: gradingSnapshotSchema, required: true },
    answers: { type: [answerSchema], default: [] },
    startedAt: { type: Date, required: true },
    submittedAt: { type: Date, default: null },
    idempotencyScope: { type: String, default: null, select: false },
    idempotencyKey: { type: String, default: null, select: false },
  },
  {
    collection: "quiz_attempts",
    versionKey: "__v",
    optimisticConcurrency: true,
    strict: "throw",
  },
);

quizAttemptSchema.index(
  { userId: 1, quizId: 1, startedAt: -1 },
  { name: "ix_quiz_attempts_student_history" },
);
quizAttemptSchema.index(
  { exerciseId: 1, userId: 1, submittedAt: -1 },
  { name: "ix_quiz_attempts_latest_exercise" },
);
quizAttemptSchema.index(
  { userId: 1, quizId: 1, idempotencyScope: 1, idempotencyKey: 1 },
  {
    unique: true,
    name: "uq_quiz_attempts_idempotency",
    partialFilterExpression: { idempotencyKey: { $type: "string" } },
  },
);

export type QuizAttemptFields = InferSchemaType<typeof quizAttemptSchema>;
export const QuizAttempt: Model<QuizAttemptFields> =
  (models.QuizAttempt as Model<QuizAttemptFields> | undefined) ??
  model<QuizAttemptFields>("QuizAttempt", quizAttemptSchema, "quiz_attempts");
