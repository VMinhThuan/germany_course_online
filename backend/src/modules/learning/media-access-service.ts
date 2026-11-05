import { Types } from "mongoose";
import {
  ExerciseAsset,
  LessonAsset,
  MediaAsset,
} from "../../db/models/index.js";
import type { MediaProvider } from "../../config/env.js";
import { AppError, notFound } from "../../shared/errors.js";
import type { MediaAccessBody } from "./schemas.js";
import type { LearningService } from "./service.js";
import type {
  MediaResourceType,
  MediaStorageAdapter,
} from "./media-storage.js";

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
      .select(
        "+provider +storageKey +resourceType +deliveryType +providerAssetId",
      )
      .lean();
    if (!asset) throw notFound();
    if (!roleMatchesMediaType(role, asset.mediaType)) throw notFound();
    const adapter = resolveMediaStorage(this.storage, asset.provider);
    if (!adapter) {
      throw new AppError(
        503,
        "MEDIA_STORAGE_UNAVAILABLE",
        "Protected media delivery is not configured for the provider stored on this asset.",
      );
    }

    try {
      const signed = await adapter.signRead({
        storageKey: asset.storageKey,
        mimeType: asset.mimeType,
        mediaType: asset.mediaType,
        resourceType: asset.resourceType as MediaResourceType | null,
        deliveryType: asset.deliveryType as
          "upload" | "private" | "authenticated" | null,
        format: asset.format ?? null,
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

function resolveMediaStorage(
  storage: MediaStorageAdapter,
  providerValue: unknown,
): MediaStorageAdapter | undefined {
  if (providerValue !== "S3_COMPATIBLE" && providerValue !== "CLOUDINARY")
    return undefined;
  const provider = providerValue as MediaProvider;
  const resolved = storage.resolve?.(provider);
  if (resolved) return resolved;
  if (!storage.resolve && (!storage.provider || storage.provider === provider))
    return storage;
  return undefined;
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
