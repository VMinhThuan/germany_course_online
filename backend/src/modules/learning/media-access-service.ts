import { Types } from "mongoose";
import {
  ExerciseAsset,
  LessonAsset,
  MediaAsset,
} from "../../db/models/index.js";
import { AppError, notFound } from "../../shared/errors.js";
import type { MediaAccessBody } from "./schemas.js";
import type { LearningService } from "./service.js";
import type { MediaStorageAdapter } from "./media-storage.js";

export class MediaAccessService {
  constructor(
    private readonly learning: LearningService,
    private readonly storage: MediaStorageAdapter,
  ) {}

  async requestAccess(userId: string, input: MediaAccessBody) {
    let role: string | undefined;
    if (input.lessonId) {
      const { lesson } = await this.learning.assertLessonAccess(
        userId,
        input.lessonId,
      );
      const association = await LessonAsset.findOne({
        lessonId: lesson._id,
        assetId: new Types.ObjectId(input.assetId),
      }).lean();
      role = association?.assetRole;
    } else if (input.exerciseId) {
      const { exercise } = await this.learning.assertExerciseAccess(
        userId,
        input.exerciseId,
      );
      const association = await ExerciseAsset.findOne({
        exerciseId: exercise._id,
        assetId: new Types.ObjectId(input.assetId),
      }).lean();
      role = association?.assetRole;
    }
    if (!role) throw notFound();

    const asset = await MediaAsset.findOne({
      _id: new Types.ObjectId(input.assetId),
      deletedAt: null,
      uploadStatus: { $nin: ["PENDING", "DELETING", "DELETED"] },
    })
      .select("+provider +storageKey")
      .lean();
    if (!asset) throw notFound();
    if (!roleMatchesMediaType(role, asset.mediaType)) throw notFound();
    if (asset.provider !== "S3_COMPATIBLE") {
      throw new AppError(
        503,
        "MEDIA_STORAGE_UNAVAILABLE",
        "Protected media delivery is not configured for this asset.",
      );
    }

    try {
      const signed = await this.storage.signRead({
        storageKey: asset.storageKey,
        mimeType: asset.mimeType,
      });
      return {
        assetId: asset._id.toString(),
        url: signed.url,
        expiresAt: signed.expiresAt.toISOString(),
        mediaType: asset.mediaType,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        503,
        "MEDIA_STORAGE_UNAVAILABLE",
        "Protected media delivery is temporarily unavailable.",
      );
    }
  }
}

function roleMatchesMediaType(role: string, mediaType: string): boolean {
  switch (role) {
    case "LECTURE_VIDEO":
    case "SOLUTION_VIDEO":
      return mediaType === "VIDEO";
    case "LECTURE_PDF":
    case "QUESTION_PDF":
    case "ANSWER_PDF":
      return mediaType === "PDF";
    case "QUESTION_AUDIO":
      return mediaType === "AUDIO";
    case "ATTACHMENT":
      return ["IMAGE", "VIDEO", "AUDIO", "PDF"].includes(mediaType);
    default:
      return false;
  }
}
