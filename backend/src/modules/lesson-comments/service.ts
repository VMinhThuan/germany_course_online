import { Types, type ClientSession } from "mongoose";
import {
  AuditLog,
  Course,
  CourseSection,
  Lesson,
  LessonComment,
  LessonCommentEdit,
  LessonCommentRateLimit,
  LessonCommentReaction,
  User,
} from "../../db/models/index.js";
import { withTransaction } from "../../db/connection.js";
import { AppError, notFound } from "../../shared/errors.js";
import { EntitlementService } from "../learning/entitlement.js";

export const LESSON_COMMENT_REACTIONS = [
  "LIKE",
  "LOVE",
  "HAHA",
  "WOW",
  "CLAP",
] as const;
export type LessonCommentReactionType =
  (typeof LESSON_COMMENT_REACTIONS)[number];
export type CommentSort = "newest" | "oldest";

type PageInput = { limit: number; cursor?: string };
type CommentRecord = {
  _id: Types.ObjectId;
  lessonId: Types.ObjectId;
  authorId: Types.ObjectId;
  authorRole: "STUDENT" | "ADMIN";
  parentId?: Types.ObjectId | null;
  rootId: Types.ObjectId;
  ancestorIds?: Types.ObjectId[];
  content: string;
  isAnonymous: boolean;
  revision: number;
  editedAt?: Date | null;
  moderationEditedAt?: Date | null;
  deletedAt?: Date | null;
  deletedBy?: Types.ObjectId | null;
  deletionReason?: string | null;
  createdAt: Date;
  updatedAt: Date;
};
type StudentCommentPageInput = PageInput & { sort: CommentSort };
type AdminCommentFilters = {
  page: number;
  pageSize: number;
  courseId?: string;
  lessonId?: string;
  authorId?: string;
  anonymous?: "true" | "false";
  status: "ACTIVE" | "DELETED" | "ALL";
  type: "ROOT" | "REPLY" | "ALL";
  from?: string;
  to?: string;
  search?: string;
  sort: CommentSort;
};

export type StudentCommentDto = {
  id: string;
  lessonId: string;
  parentId: string | null;
  rootId: string;
  content: string;
  isAnonymous: boolean;
  isModerated: boolean;
  revision: number;
  editedAt: string | null;
  createdAt: string;
  updatedAt: string;
  author: {
    displayName: string;
    avatarUrl: null;
    isAnonymous: boolean;
    role: "STUDENT" | "ADMIN";
  };
  isMine: boolean;
  canEdit: boolean;
  canDelete: boolean;
  replyCount: number;
  reactions: Array<{
    reactionType: LessonCommentReactionType;
    count: number;
    isMine: boolean;
  }>;
};

export type AdminCommentDto = {
  id: string;
  lessonId: string;
  parentId: string | null;
  rootId: string;
  depth: number;
  content: string;
  isAnonymous: boolean;
  author: {
    id: string;
    fullName: string;
    email: string;
    role: "STUDENT" | "ADMIN";
    status: "ACTIVE" | "BLOCKED";
  } | null;
  revision: number;
  editedAt: string | null;
  moderationEditedAt: string | null;
  deletedAt: string | null;
  deletedBy: string | null;
  deletionReason: string | null;
  createdAt: string;
  updatedAt: string;
  replyCount: number;
  reactionCount: number;
  reactions: Array<{ reactionType: LessonCommentReactionType; count: number }>;
  myReaction: LessonCommentReactionType | null;
  context: {
    courseId: string | null;
    courseTitle: string | null;
    sectionId: string | null;
    sectionTitle: string | null;
    lessonId: string;
    lessonTitle: string | null;
  };
};

type AdminHistoryDto = {
  id: string;
  previousContent: string;
  newContent: string;
  previousRevision: number;
  newRevision: number;
  editedAt: string;
  reason: string | null;
  editedBy: {
    id: string;
    fullName: string;
    email: string;
    role: "STUDENT" | "ADMIN";
  } | null;
};

const EDIT_WINDOW_MS = 10 * 60_000;
const RATE_WINDOW_MS = 60_000;
const MAX_REPLY_DEPTH = 5;
const MAX_ADMIN_THREAD_ITEMS = 500;

export class LessonCommentService {
  constructor(
    private readonly studentFeatureEnabled: boolean,
    private readonly now: () => Date = () => new Date(),
  ) {}

  private assertStudentFeature(): void {
    if (!this.studentFeatureEnabled)
      throw new AppError(
        404,
        "FEATURE_DISABLED",
        "Lesson discussions are not available.",
      );
  }

  private async assertStudentLessonAccess(userId: string, lessonId: string) {
    this.assertStudentFeature();
    return new EntitlementService(() => this.now()).assertLessonAccess(
      userId,
      lessonId,
    );
  }

  private async assertAdminLesson(lessonId: string) {
    const lesson = await Lesson.findOne({
      _id: new Types.ObjectId(lessonId),
      deletedAt: null,
    }).lean();
    if (!lesson) throw notFound();
    return lesson;
  }

  private async consumeRateLimit(
    userId: string,
    action: "CREATE" | "EDIT" | "DELETE" | "REACTION",
    limit: number,
  ) {
    const now = this.now();
    const windowStart = new Date(
      Math.floor(now.getTime() / RATE_WINDOW_MS) * RATE_WINDOW_MS,
    );
    const filter = {
      userId: new Types.ObjectId(userId),
      action,
      windowStart,
    };
    let counter;
    try {
      counter = await LessonCommentRateLimit.findOneAndUpdate(
        filter,
        {
          $inc: { count: 1 },
          $setOnInsert: {
            userId: filter.userId,
            action,
            windowStart,
            expiresAt: new Date(windowStart.getTime() + 2 * RATE_WINDOW_MS),
          },
        },
        { upsert: true, returnDocument: "after" },
      ).lean();
    } catch (error) {
      if (
        typeof error !== "object" ||
        error === null ||
        !("code" in error) ||
        error.code !== 11000
      )
        throw error;
      counter = await LessonCommentRateLimit.findOneAndUpdate(
        filter,
        { $inc: { count: 1 } },
        { returnDocument: "after" },
      ).lean();
    }
    if (!counter || counter.count > limit)
      throw new AppError(
        429,
        "RATE_LIMITED",
        "Too many comment actions. Please try again shortly.",
      );
  }

  private async lockThread(
    rootId: Types.ObjectId,
    session: ClientSession,
  ): Promise<void> {
    const root = await LessonComment.findOneAndUpdate(
      { _id: rootId, parentId: null, deletedAt: null },
      { $inc: { threadVersion: 1 } },
      { session, returnDocument: "after" },
    ).lean();
    if (!root) throw notFound();
  }

  private async assertVisibleComment(
    comment: { deletedAt?: Date | null; ancestorIds?: Types.ObjectId[] },
    session?: ClientSession,
  ): Promise<void> {
    if (comment.deletedAt) throw notFound();
    if (!comment.ancestorIds?.length) return;
    const query = LessonComment.exists({
      _id: { $in: comment.ancestorIds },
      deletedAt: { $ne: null },
    });
    if (session) query.session(session);
    if (await query) throw notFound();
  }

  private async replyCounts(ids: Types.ObjectId[]) {
    if (!ids.length) return new Map<string, number>();
    const records = await LessonComment.aggregate<{
      _id: Types.ObjectId;
      count: number;
    }>([
      { $match: { parentId: { $in: ids }, deletedAt: null } },
      { $group: { _id: "$parentId", count: { $sum: 1 } } },
    ]);
    return new Map(records.map((row) => [row._id.toString(), row.count]));
  }

  private async reactionSummary(ids: Types.ObjectId[], userId?: string) {
    if (!ids.length)
      return {
        counts: new Map<string, Map<LessonCommentReactionType, number>>(),
        mine: new Map<string, LessonCommentReactionType>(),
      };
    const records = await LessonCommentReaction.aggregate<{
      _id: {
        commentId: Types.ObjectId;
        reactionType: LessonCommentReactionType;
      };
      count: number;
    }>([
      { $match: { commentId: { $in: ids } } },
      {
        $group: {
          _id: { commentId: "$commentId", reactionType: "$reactionType" },
          count: { $sum: 1 },
        },
      },
    ]);
    const counts = new Map<string, Map<LessonCommentReactionType, number>>();
    for (const record of records) {
      const id = record._id.commentId.toString();
      const values =
        counts.get(id) ?? new Map<LessonCommentReactionType, number>();
      values.set(record._id.reactionType, record.count);
      counts.set(id, values);
    }
    const mine = new Map<string, LessonCommentReactionType>();
    if (userId) {
      const rows = await LessonCommentReaction.find({
        commentId: { $in: ids },
        userId: new Types.ObjectId(userId),
      })
        .select("commentId reactionType")
        .lean();
      for (const row of rows)
        mine.set(
          row.commentId.toString(),
          row.reactionType as LessonCommentReactionType,
        );
    }
    return { counts, mine };
  }

  private async studentDtos(
    comments: CommentRecord[],
    userId: string,
  ): Promise<StudentCommentDto[]> {
    if (!comments.length) return [];
    const ids = comments.map((comment) => comment._id);
    const authorIds = [
      ...new Map(
        comments.map((comment) => [
          comment.authorId.toString(),
          comment.authorId,
        ]),
      ).values(),
    ];
    const [authors, replies, reactions] = await Promise.all([
      User.find({ _id: { $in: authorIds } })
        .select("fullName role")
        .lean(),
      this.replyCounts(ids),
      this.reactionSummary(ids, userId),
    ]);
    const authorMap = new Map(
      authors.map((author) => [author._id.toString(), author]),
    );
    return comments.map((comment) => {
      const id = comment._id.toString();
      const author = authorMap.get(comment.authorId.toString());
      const isMine = comment.authorId.toString() === userId;
      const publicAnonymous =
        comment.authorRole === "STUDENT" && comment.isAnonymous;
      const canEdit =
        isMine &&
        !comment.deletedAt &&
        this.now().getTime() < comment.createdAt.getTime() + EDIT_WINDOW_MS;
      const values = reactions.counts.get(id);
      return {
        id,
        lessonId: comment.lessonId.toString(),
        parentId: comment.parentId?.toString() ?? null,
        rootId: comment.rootId.toString(),
        content: comment.content,
        isAnonymous: publicAnonymous,
        isModerated: Boolean(comment.moderationEditedAt),
        revision: comment.revision,
        editedAt: comment.editedAt?.toISOString() ?? null,
        createdAt: comment.createdAt.toISOString(),
        updatedAt: comment.updatedAt.toISOString(),
        author: {
          displayName:
            comment.authorRole === "ADMIN"
              ? "Quản trị viên"
              : publicAnonymous
                ? "Học viên ẩn danh"
                : (author?.fullName ?? "Học viên"),
          avatarUrl: null,
          isAnonymous: publicAnonymous,
          role: comment.authorRole,
        },
        isMine,
        canEdit,
        canDelete: isMine && !comment.deletedAt,
        replyCount: replies.get(id) ?? 0,
        reactions: LESSON_COMMENT_REACTIONS.flatMap((reactionType) => {
          const count = values?.get(reactionType) ?? 0;
          if (!count && reactions.mine.get(id) !== reactionType) return [];
          return [
            {
              reactionType,
              count,
              isMine: reactions.mine.get(id) === reactionType,
            },
          ];
        }),
      };
    });
  }

  private async adminDtos(
    comments: CommentRecord[],
    includeAdminUserReaction?: string,
  ): Promise<AdminCommentDto[]> {
    if (!comments.length) return [];
    const ids = comments.map((comment) => comment._id);
    const authorIds = [
      ...new Map(
        comments.map((comment) => [
          comment.authorId.toString(),
          comment.authorId,
        ]),
      ).values(),
    ];
    const deletedByIds = [
      ...new Map(
        comments.flatMap((comment) =>
          comment.deletedBy
            ? [[comment.deletedBy.toString(), comment.deletedBy] as const]
            : [],
        ),
      ).values(),
    ];
    const lessonIds = [
      ...new Map(
        comments.map((comment) => [
          comment.lessonId.toString(),
          comment.lessonId,
        ]),
      ).values(),
    ];
    const [users, lessons, replies, reactions] = await Promise.all([
      User.find({ _id: { $in: [...authorIds, ...deletedByIds] } })
        .select("fullName email role status")
        .lean(),
      Lesson.find({ _id: { $in: lessonIds } })
        .select("title sectionId")
        .lean(),
      this.replyCounts(ids),
      this.reactionSummary(ids, includeAdminUserReaction),
    ]);
    const userMap = new Map(users.map((user) => [user._id.toString(), user]));
    const sectionIds = [
      ...new Map(
        lessons.map((lesson) => [
          lesson.sectionId.toString(),
          lesson.sectionId,
        ]),
      ).values(),
    ];
    const sections = await CourseSection.find({ _id: { $in: sectionIds } })
      .select("title courseId")
      .lean();
    const sectionMap = new Map(
      sections.map((section) => [section._id.toString(), section]),
    );
    const courseIds = [
      ...new Map(
        sections.map((section) => [
          section.courseId.toString(),
          section.courseId,
        ]),
      ).values(),
    ];
    const courses = await Course.find({ _id: { $in: courseIds } })
      .select("title")
      .lean();
    const courseMap = new Map(
      courses.map((course) => [course._id.toString(), course]),
    );
    const lessonMap = new Map(
      lessons.map((lesson) => [lesson._id.toString(), lesson]),
    );
    return comments.map((comment) => {
      const lesson = lessonMap.get(comment.lessonId.toString());
      const section = lesson
        ? sectionMap.get(lesson.sectionId.toString())
        : undefined;
      const author = userMap.get(comment.authorId.toString());
      const deletedBy = comment.deletedBy
        ? userMap.get(comment.deletedBy.toString())
        : undefined;
      const values = reactions.counts.get(comment._id.toString());
      const reactionDtos = LESSON_COMMENT_REACTIONS.flatMap((reactionType) => {
        const count = values?.get(reactionType) ?? 0;
        return count ? [{ reactionType, count }] : [];
      });
      return {
        id: comment._id.toString(),
        lessonId: comment.lessonId.toString(),
        parentId: comment.parentId?.toString() ?? null,
        rootId: comment.rootId.toString(),
        depth: comment.ancestorIds?.length ?? 0,
        content: comment.content,
        isAnonymous: comment.isAnonymous,
        author: author
          ? {
              id: author._id.toString(),
              fullName: author.fullName,
              email: author.email,
              role: author.role,
              status: author.status,
            }
          : null,
        revision: comment.revision,
        editedAt: comment.editedAt?.toISOString() ?? null,
        moderationEditedAt: comment.moderationEditedAt?.toISOString() ?? null,
        deletedAt: comment.deletedAt?.toISOString() ?? null,
        deletedBy: deletedBy
          ? `${deletedBy.fullName} <${deletedBy.email}>`
          : (comment.deletedBy?.toString() ?? null),
        deletionReason: comment.deletionReason ?? null,
        createdAt: comment.createdAt.toISOString(),
        updatedAt: comment.updatedAt.toISOString(),
        replyCount: replies.get(comment._id.toString()) ?? 0,
        reactionCount: reactionDtos.reduce(
          (total, item) => total + item.count,
          0,
        ),
        reactions: reactionDtos,
        myReaction: reactions.mine.get(comment._id.toString()) ?? null,
        context: {
          courseId: section?.courseId.toString() ?? null,
          courseTitle: section
            ? (courseMap.get(section.courseId.toString())?.title ?? null)
            : null,
          sectionId: lesson?.sectionId.toString() ?? null,
          sectionTitle: section?.title ?? null,
          lessonId: comment.lessonId.toString(),
          lessonTitle: lesson?.title ?? null,
        },
      };
    });
  }

  private encodeCursor(createdAt: Date, id: Types.ObjectId): string {
    return Buffer.from(
      JSON.stringify({ createdAt: createdAt.toISOString(), id: id.toString() }),
    ).toString("base64url");
  }

  private decodeCursor(
    value: string | undefined,
  ): { createdAt: Date; id: Types.ObjectId } | null {
    if (!value) return null;
    try {
      const parsed = JSON.parse(
        Buffer.from(value, "base64url").toString("utf8"),
      ) as { createdAt?: unknown; id?: unknown };
      if (
        typeof parsed.createdAt !== "string" ||
        typeof parsed.id !== "string" ||
        !Types.ObjectId.isValid(parsed.id)
      )
        throw new Error();
      const createdAt = new Date(parsed.createdAt);
      if (Number.isNaN(createdAt.getTime())) throw new Error();
      return { createdAt, id: new Types.ObjectId(parsed.id) };
    } catch {
      throw new AppError(
        400,
        "INVALID_CURSOR",
        "The pagination cursor is invalid.",
      );
    }
  }

  async listStudentComments(
    userId: string,
    lessonId: string,
    input: StudentCommentPageInput,
  ) {
    await this.assertStudentLessonAccess(userId, lessonId);
    const cursor = this.decodeCursor(input.cursor);
    const filter: Record<string, unknown> = {
      lessonId: new Types.ObjectId(lessonId),
      parentId: null,
      deletedAt: null,
    };
    if (cursor) {
      const operator = input.sort === "newest" ? "$lt" : "$gt";
      filter.$or = [
        { createdAt: { [operator]: cursor.createdAt } },
        { createdAt: cursor.createdAt, _id: { [operator]: cursor.id } },
      ];
    }
    const direction = input.sort === "newest" ? -1 : 1;
    const [rows, total] = await Promise.all([
      LessonComment.find(filter)
        .sort({ createdAt: direction, _id: direction })
        .limit(input.limit + 1)
        .lean(),
      LessonComment.countDocuments({
        lessonId: new Types.ObjectId(lessonId),
        parentId: null,
        deletedAt: null,
      }),
    ]);
    const hasMore = rows.length > input.limit;
    const items = rows.slice(0, input.limit);
    return {
      items: await this.studentDtos(items, userId),
      total,
      hasMore,
      nextCursor:
        hasMore && items.length
          ? this.encodeCursor(items.at(-1)!.createdAt, items.at(-1)!._id)
          : null,
    };
  }

  async listStudentReplies(
    userId: string,
    commentId: string,
    input: PageInput,
  ) {
    const comment = await LessonComment.findById(commentId).lean();
    if (!comment) throw notFound();
    await this.assertStudentLessonAccess(userId, comment.lessonId.toString());
    await this.assertVisibleComment(comment);
    const cursor = this.decodeCursor(input.cursor);
    const filter: Record<string, unknown> = {
      lessonId: comment.lessonId,
      parentId: comment._id,
      deletedAt: null,
    };
    if (cursor) {
      filter.$or = [
        { createdAt: { $gt: cursor.createdAt } },
        { createdAt: cursor.createdAt, _id: { $gt: cursor.id } },
      ];
    }
    const [rows, total] = await Promise.all([
      LessonComment.find(filter)
        .sort({ createdAt: 1, _id: 1 })
        .limit(input.limit + 1)
        .lean(),
      LessonComment.countDocuments({
        lessonId: comment.lessonId,
        parentId: comment._id,
        deletedAt: null,
      }),
    ]);
    const hasMore = rows.length > input.limit;
    const items = rows.slice(0, input.limit);
    return {
      items: await this.studentDtos(items, userId),
      total,
      hasMore,
      nextCursor:
        hasMore && items.length
          ? this.encodeCursor(items.at(-1)!.createdAt, items.at(-1)!._id)
          : null,
    };
  }

  async createStudentComment(
    userId: string,
    lessonId: string,
    input: { content: string; isAnonymous: boolean; parentId: string | null },
  ) {
    await this.assertStudentLessonAccess(userId, lessonId);
    await this.consumeRateLimit(userId, "CREATE", 5);
    const createdId = new Types.ObjectId();
    const comment = await withTransaction(async (session) => {
      let parent: CommentRecord | null = null;
      if (input.parentId) {
        parent = await LessonComment.findById(input.parentId)
          .session(session)
          .lean();
        if (!parent || parent.lessonId.toString() !== lessonId)
          throw notFound();
        await this.lockThread(parent.rootId, session);
        parent = await LessonComment.findById(input.parentId)
          .session(session)
          .lean();
        if (!parent || parent.lessonId.toString() !== lessonId)
          throw notFound();
        await this.assertVisibleComment(parent, session);
        if ((parent.ancestorIds?.length ?? 0) + 2 > MAX_REPLY_DEPTH)
          throw new AppError(
            409,
            "REPLY_DEPTH_LIMIT",
            "This discussion has reached the maximum reply depth.",
          );
      }
      const ancestorIds = parent
        ? [...(parent.ancestorIds ?? []), parent._id]
        : [];
      const rootId = parent ? parent.rootId : createdId;
      const [record] = await LessonComment.create(
        [
          {
            _id: createdId,
            lessonId: new Types.ObjectId(lessonId),
            authorId: new Types.ObjectId(userId),
            authorRole: "STUDENT",
            parentId: parent?._id ?? null,
            rootId,
            ancestorIds,
            content: input.content,
            isAnonymous: input.isAnonymous,
            revision: 1,
            editedAt: null,
            moderationEditedAt: null,
            threadVersion: 0,
            deletedAt: null,
            deletedBy: null,
            deletionReason: null,
          },
        ],
        { session },
      );
      if (!record) throw new Error("Comment insert did not return a record.");
      return record.toObject();
    });
    return (
      await this.studentDtos([comment as unknown as CommentRecord], userId)
    )[0]!;
  }

  private async editComment(
    commentId: string,
    actorId: string,
    actorRole: "STUDENT" | "ADMIN",
    input: { content: string; expectedRevision: number; reason?: string },
  ) {
    if (actorRole === "STUDENT")
      await this.consumeRateLimit(actorId, "EDIT", 10);
    const comment = await withTransaction(async (session) => {
      const current = await LessonComment.findById(commentId)
        .session(session)
        .lean();
      if (!current) throw notFound();
      if (actorRole === "STUDENT")
        await this.assertStudentLessonAccess(
          actorId,
          current.lessonId.toString(),
        );
      await this.lockThread(current.rootId, session);
      const locked = await LessonComment.findById(commentId)
        .session(session)
        .lean();
      if (!locked) throw notFound();
      await this.assertVisibleComment(locked, session);
      if (actorRole === "STUDENT") {
        if (locked.authorId.toString() !== actorId) throw notFound();
        if (this.now().getTime() >= locked.createdAt.getTime() + EDIT_WINDOW_MS)
          throw new AppError(
            409,
            "EDIT_WINDOW_EXPIRED",
            "The 10-minute edit window has expired.",
          );
      }
      if (locked.revision !== input.expectedRevision)
        throw new AppError(
          409,
          "REVISION_CONFLICT",
          "This comment changed. Refresh and try again.",
        );
      if (locked.content === input.content) return locked;
      const now = this.now();
      const nextRevision = locked.revision + 1;
      await LessonCommentEdit.create(
        [
          {
            commentId: locked._id,
            previousContent: locked.content,
            newContent: input.content,
            previousRevision: locked.revision,
            newRevision: nextRevision,
            editedBy: new Types.ObjectId(actorId),
            editedByRole: actorRole,
            isPublic: actorRole === "STUDENT",
            editedAt: now,
            reason: input.reason ?? null,
          },
        ],
        { session },
      );
      const updated = await LessonComment.findOneAndUpdate(
        { _id: locked._id, revision: locked.revision, deletedAt: null },
        {
          $set: {
            content: input.content,
            revision: nextRevision,
            editedAt: now,
            ...(actorRole === "ADMIN" ? { moderationEditedAt: now } : {}),
          },
        },
        { session, returnDocument: "after", runValidators: true },
      ).lean();
      if (!updated)
        throw new AppError(
          409,
          "REVISION_CONFLICT",
          "This comment changed. Refresh and try again.",
        );
      if (actorRole === "ADMIN")
        await AuditLog.create(
          [
            {
              actorUserId: new Types.ObjectId(actorId),
              action: "LESSON_COMMENT_EDITED",
              entityType: "LESSON_COMMENT",
              entityId: locked._id,
              oldValue: { revision: locked.revision },
              newValue: { revision: nextRevision, moderation: true },
            },
          ],
          { session },
        );
      return updated;
    });
    return comment;
  }

  async editStudentComment(
    userId: string,
    commentId: string,
    input: { content: string; expectedRevision: number },
  ) {
    const comment = await this.editComment(commentId, userId, "STUDENT", input);
    return (
      await this.studentDtos([comment as unknown as CommentRecord], userId)
    )[0]!;
  }

  async editAdminComment(
    adminId: string,
    commentId: string,
    input: { content: string; expectedRevision: number; reason?: string },
  ) {
    const comment = await this.editComment(commentId, adminId, "ADMIN", input);
    return (
      await this.adminDtos([comment as unknown as CommentRecord], adminId)
    )[0]!;
  }

  async deleteStudentComment(userId: string, commentId: string) {
    const original = await LessonComment.findById(commentId).lean();
    if (!original) throw notFound();
    await this.assertStudentLessonAccess(userId, original.lessonId.toString());
    await this.consumeRateLimit(userId, "DELETE", 10);
    return this.deleteComment(commentId, userId, "STUDENT");
  }

  async deleteAdminComment(
    adminId: string,
    commentId: string,
    reason?: string,
  ) {
    return this.deleteComment(commentId, adminId, "ADMIN", reason);
  }

  private async deleteComment(
    commentId: string,
    actorId: string,
    actorRole: "STUDENT" | "ADMIN",
    reason?: string,
  ) {
    const result = await withTransaction(async (session) => {
      const initial = await LessonComment.findById(commentId)
        .session(session)
        .lean();
      if (!initial || initial.deletedAt) throw notFound();
      await this.lockThread(initial.rootId, session);
      const comment = await LessonComment.findById(commentId)
        .session(session)
        .lean();
      if (!comment || comment.deletedAt) throw notFound();
      await this.assertVisibleComment(comment, session);
      if (actorRole === "STUDENT" && comment.authorId.toString() !== actorId)
        throw notFound();
      const deletedAt = this.now();
      const descendants = await LessonComment.updateMany(
        {
          lessonId: comment.lessonId,
          ancestorIds: comment._id,
          deletedAt: null,
        },
        {
          $set: {
            deletedAt,
            deletedBy: new Types.ObjectId(actorId),
            deletionReason: reason ?? null,
          },
        },
        { session },
      );
      await LessonComment.updateOne(
        { _id: comment._id, deletedAt: null },
        {
          $set: {
            deletedAt,
            deletedBy: new Types.ObjectId(actorId),
            deletionReason: reason ?? null,
          },
        },
        { session },
      );
      if (actorRole === "ADMIN")
        await AuditLog.create(
          [
            {
              actorUserId: new Types.ObjectId(actorId),
              action: "LESSON_COMMENT_DELETED",
              entityType: "LESSON_COMMENT",
              entityId: comment._id,
              oldValue: { deleted: false },
              newValue: {
                deleted: true,
                descendantsDeleted: descendants.modifiedCount,
                reason: reason ?? null,
              },
            },
          ],
          { session },
        );
      return {
        id: comment._id.toString(),
        descendantsDeleted: descendants.modifiedCount,
      };
    });
    return result;
  }

  async reactStudent(
    userId: string,
    commentId: string,
    reactionType: LessonCommentReactionType,
  ) {
    await this.consumeRateLimit(userId, "REACTION", 30);
    return this.react(commentId, userId, "STUDENT", reactionType);
  }

  async removeStudentReaction(userId: string, commentId: string) {
    await this.consumeRateLimit(userId, "REACTION", 30);
    return this.react(commentId, userId, "STUDENT", null);
  }

  async reactAdmin(
    adminId: string,
    commentId: string,
    reactionType: LessonCommentReactionType,
  ) {
    return this.react(commentId, adminId, "ADMIN", reactionType);
  }

  async removeAdminReaction(adminId: string, commentId: string) {
    return this.react(commentId, adminId, "ADMIN", null);
  }

  private async react(
    commentId: string,
    userId: string,
    role: "STUDENT" | "ADMIN",
    reactionType: LessonCommentReactionType | null,
  ) {
    await withTransaction(async (session) => {
      const initial = await LessonComment.findById(commentId)
        .session(session)
        .lean();
      if (!initial) throw notFound();
      if (role === "STUDENT")
        await this.assertStudentLessonAccess(
          userId,
          initial.lessonId.toString(),
        );
      await this.lockThread(initial.rootId, session);
      const comment = await LessonComment.findById(commentId)
        .session(session)
        .lean();
      if (!comment) throw notFound();
      await this.assertVisibleComment(comment, session);
      const filter = {
        commentId: comment._id,
        userId: new Types.ObjectId(userId),
      };
      const existing = await LessonCommentReaction.findOne(filter)
        .session(session)
        .lean();
      if (!reactionType || existing?.reactionType === reactionType) {
        if (existing)
          await LessonCommentReaction.deleteOne(
            { _id: existing._id },
            { session },
          );
      } else if (existing) {
        await LessonCommentReaction.updateOne(
          { _id: existing._id },
          { $set: { reactionType } },
          { session, runValidators: true },
        );
      } else {
        await LessonCommentReaction.create([{ ...filter, reactionType }], {
          session,
        });
      }
      if (role === "ADMIN")
        await AuditLog.create(
          [
            {
              actorUserId: new Types.ObjectId(userId),
              action: "LESSON_COMMENT_REACTION_CHANGED",
              entityType: "LESSON_COMMENT",
              entityId: comment._id,
              oldValue: { reactionType: existing?.reactionType ?? null },
              newValue: {
                reactionType:
                  reactionType === existing?.reactionType ? null : reactionType,
              },
            },
          ],
          { session },
        );
    });
    const reaction = await LessonCommentReaction.findOne({
      commentId: new Types.ObjectId(commentId),
      userId: new Types.ObjectId(userId),
    }).lean();
    return { reactionType: reaction?.reactionType ?? null };
  }

  async studentHistory(userId: string, commentId: string) {
    const comment = await LessonComment.findById(commentId).lean();
    if (!comment) throw notFound();
    await this.assertStudentLessonAccess(userId, comment.lessonId.toString());
    await this.assertVisibleComment(comment);
    if (comment.moderationEditedAt) throw notFound();
    const items = await LessonCommentEdit.find({
      commentId: comment._id,
      isPublic: true,
    })
      .sort({ newRevision: 1 })
      .select(
        "previousContent newContent previousRevision newRevision editedAt",
      )
      .lean();
    return {
      items: items.map((item) => ({
        previousContent: item.previousContent,
        newContent: item.newContent,
        previousRevision: item.previousRevision,
        newRevision: item.newRevision,
        editedAt: item.editedAt.toISOString(),
      })),
    };
  }

  async adminHistory(commentId: string): Promise<AdminHistoryDto[]> {
    const comment = await LessonComment.findById(commentId).lean();
    if (!comment) throw notFound();
    const edits = await LessonCommentEdit.find({ commentId: comment._id })
      .sort({ newRevision: 1 })
      .lean();
    const userIds = [
      ...new Map(
        edits.map((edit) => [edit.editedBy.toString(), edit.editedBy]),
      ).values(),
    ];
    const users = await User.find({ _id: { $in: userIds } })
      .select("fullName email role")
      .lean();
    const userMap = new Map(users.map((user) => [user._id.toString(), user]));
    return edits.map((edit) => {
      const user = userMap.get(edit.editedBy.toString());
      return {
        id: edit._id.toString(),
        previousContent: edit.previousContent,
        newContent: edit.newContent,
        previousRevision: edit.previousRevision,
        newRevision: edit.newRevision,
        editedAt: edit.editedAt.toISOString(),
        reason: edit.reason ?? null,
        editedBy: user
          ? {
              id: user._id.toString(),
              fullName: user.fullName,
              email: user.email,
              role: user.role,
            }
          : null,
      };
    });
  }

  async listAdminComments(input: AdminCommentFilters, currentAdminId: string) {
    const filter: Record<string, unknown> = {};
    if (input.lessonId) filter.lessonId = new Types.ObjectId(input.lessonId);
    if (input.authorId) filter.authorId = new Types.ObjectId(input.authorId);
    if (input.anonymous) filter.isAnonymous = input.anonymous === "true";
    if (input.status === "ACTIVE") filter.deletedAt = null;
    if (input.status === "DELETED") filter.deletedAt = { $ne: null };
    if (input.type === "ROOT") filter.parentId = null;
    if (input.type === "REPLY") filter.parentId = { $ne: null };
    if (input.from || input.to) {
      filter.createdAt = {
        ...(input.from ? { $gte: new Date(input.from) } : {}),
        ...(input.to ? { $lte: new Date(input.to) } : {}),
      };
    }
    if (input.search) filter.$text = { $search: input.search };
    if (input.courseId) {
      const sections = await CourseSection.find({
        courseId: new Types.ObjectId(input.courseId),
      })
        .select("_id")
        .lean();
      const lessons = await Lesson.find({
        sectionId: { $in: sections.map((section) => section._id) },
      })
        .select("_id")
        .lean();
      filter.lessonId = { $in: lessons.map((lesson) => lesson._id) };
    }
    const direction = input.sort === "newest" ? -1 : 1;
    const [rows, total] = await Promise.all([
      LessonComment.find(filter)
        .sort({ createdAt: direction, _id: direction })
        .skip((input.page - 1) * input.pageSize)
        .limit(input.pageSize)
        .lean(),
      LessonComment.countDocuments(filter),
    ]);
    return {
      items: await this.adminDtos(rows as CommentRecord[], currentAdminId),
      page: input.page,
      pageSize: input.pageSize,
      total,
      hasMore: input.page * input.pageSize < total,
    };
  }

  async adminSummary() {
    const weekAgo = new Date(this.now().getTime() - 7 * 24 * 60 * 60_000);
    const [total, recent, anonymous, edited, deleted] = await Promise.all([
      LessonComment.countDocuments({}),
      LessonComment.countDocuments({ createdAt: { $gte: weekAgo } }),
      LessonComment.countDocuments({ isAnonymous: true }),
      LessonComment.countDocuments({ editedAt: { $ne: null } }),
      LessonComment.countDocuments({ deletedAt: { $ne: null } }),
    ]);
    return { total, recent, anonymous, edited, deleted };
  }

  async getAdminComment(commentId: string, currentAdminId: string) {
    const comment = await LessonComment.findById(commentId).lean();
    if (!comment) throw notFound();
    const rootId = comment.rootId;
    const [threadRows, threadTotal, history] = await Promise.all([
      LessonComment.find({ rootId })
        .sort({ createdAt: 1, _id: 1 })
        .limit(MAX_ADMIN_THREAD_ITEMS + 1)
        .lean(),
      LessonComment.countDocuments({ rootId }),
      this.adminHistory(commentId),
    ]);
    const hasMore = threadRows.length > MAX_ADMIN_THREAD_ITEMS;
    const thread = threadRows.slice(0, MAX_ADMIN_THREAD_ITEMS);
    const dtos = await this.adminDtos(
      thread as CommentRecord[],
      currentAdminId,
    );
    return {
      comment: (
        await this.adminDtos([comment as CommentRecord], currentAdminId)
      )[0]!,
      thread: dtos,
      threadTotal,
      threadHasMore: hasMore,
      history,
    };
  }

  async createAdminComment(
    adminId: string,
    lessonId: string,
    input: { content: string; isAnonymous: boolean; parentId: string | null },
  ) {
    await this.assertAdminLesson(lessonId);
    const createdId = new Types.ObjectId();
    const comment = await withTransaction(async (session) => {
      let parent = input.parentId
        ? await LessonComment.findById(input.parentId).session(session).lean()
        : null;
      if (input.parentId) {
        if (!parent || parent.lessonId.toString() !== lessonId)
          throw notFound();
        await this.lockThread(parent.rootId, session);
        parent = await LessonComment.findById(input.parentId)
          .session(session)
          .lean();
        if (
          !parent ||
          parent.lessonId.toString() !== lessonId ||
          parent.deletedAt
        )
          throw notFound();
        if ((parent.ancestorIds?.length ?? 0) + 2 > MAX_REPLY_DEPTH)
          throw new AppError(
            409,
            "REPLY_DEPTH_LIMIT",
            "This discussion has reached the maximum reply depth.",
          );
      }
      const rootId = parent ? parent.rootId : createdId;
      const [record] = await LessonComment.create(
        [
          {
            _id: createdId,
            lessonId: new Types.ObjectId(lessonId),
            authorId: new Types.ObjectId(adminId),
            authorRole: "ADMIN",
            parentId: parent?._id ?? null,
            rootId,
            ancestorIds: parent
              ? [...(parent.ancestorIds ?? []), parent._id]
              : [],
            content: input.content,
            isAnonymous: false,
            revision: 1,
            editedAt: null,
            moderationEditedAt: null,
            threadVersion: 0,
            deletedAt: null,
            deletedBy: null,
            deletionReason: null,
          },
        ],
        { session },
      );
      await AuditLog.create(
        [
          {
            actorUserId: new Types.ObjectId(adminId),
            action: "LESSON_COMMENT_CREATED",
            entityType: "LESSON_COMMENT",
            entityId: createdId,
            oldValue: null,
            newValue: { lessonId, parentId: parent?._id.toString() ?? null },
          },
        ],
        { session },
      );
      if (!record) throw new Error("Comment insert did not return a record.");
      return record.toObject();
    });
    return (
      await this.adminDtos([comment as unknown as CommentRecord], adminId)
    )[0]!;
  }
}
