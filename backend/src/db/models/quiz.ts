import mongoose, {
  model,
  Schema,
  type InferSchemaType,
  type Model,
} from "mongoose";

const models = mongoose.models;

function isNonnegativeDecimal(value: { toString(): string } | null): boolean {
  if (!value) return false;
  const text = value.toString();
  return !text.startsWith("-") && !/^(?:NaN|Infinity|-Infinity)$/i.test(text);
}

const optionSchema = new Schema(
  {
    optionText: { type: String, required: true, trim: true, maxlength: 1000 },
    isCorrect: { type: Boolean, required: true },
    sortOrder: {
      type: Number,
      required: true,
      min: 0,
      validate: Number.isInteger,
    },
  },
  { _id: true, strict: "throw" },
);

const questionSchema = new Schema(
  {
    questionText: {
      type: String,
      required: true,
      trim: true,
      maxlength: 4000,
    },
    questionType: {
      type: String,
      enum: ["SINGLE_CHOICE"],
      required: true,
    },
    explanation: { type: String, default: null, maxlength: 4000 },
    points: {
      type: Schema.Types.Decimal128,
      required: true,
      validate: {
        validator: isNonnegativeDecimal,
        message: "Question points must be a nonnegative decimal.",
      },
    },
    sortOrder: {
      type: Number,
      required: true,
      min: 0,
      validate: Number.isInteger,
    },
    options: {
      type: [optionSchema],
      required: true,
      validate: {
        validator: (options: Array<{ isCorrect: boolean }>) =>
          options.length >= 2 &&
          options.filter((option) => option.isCorrect).length === 1,
        message:
          "A single-choice question needs at least two options and one correct option.",
      },
    },
  },
  { _id: true, strict: "throw" },
);

const quizSchema = new Schema(
  {
    exerciseId: {
      type: Schema.Types.ObjectId,
      ref: "Exercise",
      required: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 180 },
    description: { type: String, default: null, maxlength: 4000 },
    passScorePercent: {
      type: Number,
      default: null,
      min: 0,
      max: 100,
    },
    showCorrectAnswers: { type: Boolean, required: true },
    questions: {
      type: [questionSchema],
      required: true,
      validate: {
        validator: (questions: unknown[]) => questions.length > 0,
        message: "A quiz must contain at least one question.",
      },
    },
  },
  { collection: "quizzes", versionKey: false, strict: "throw" },
);

quizSchema.index(
  { exerciseId: 1 },
  { unique: true, name: "uq_quizzes_exercise" },
);

export type QuizFields = InferSchemaType<typeof quizSchema>;
export const Quiz: Model<QuizFields> =
  (models.Quiz as Model<QuizFields> | undefined) ??
  model<QuizFields>("Quiz", quizSchema, "quizzes");
