import mongoose from "mongoose";
import { Course, MediaAsset, SiteSettings } from "../../db/models/index.js";
import { notFound } from "../../shared/errors.js";

export type PublicMediaDto = {
  id: string;
  title?: string;
  mediaType: "IMAGE" | "VIDEO" | "AUDIO" | "PDF";
  mimeType: string;
};

export async function getAssociatedPublicMedia(
  assetId: mongoose.Types.ObjectId,
  association: "course" | "site" | "any",
): Promise<PublicMediaDto> {
  const asset = await MediaAsset.findOne({
    _id: assetId,
    visibility: "PUBLIC",
    deletedAt: null,
    uploadStatus: { $nin: ["PENDING", "DELETING", "DELETED"] },
  });
  if (!asset) throw notFound();

  let associated = false;
  if (association !== "site") {
    associated = Boolean(
      await Course.exists({
        status: "PUBLISHED",
        deletedAt: null,
        $or: [
          { thumbnailAssetId: assetId },
          { bannerAssetId: assetId },
          { introVideoAssetId: assetId },
        ],
      }),
    );
  }
  if (!associated && association !== "course") {
    associated = Boolean(
      await SiteSettings.exists({
        _id: "site",
        $or: [{ logoAssetId: assetId }, { heroAssetId: assetId }],
      }),
    );
  }
  if (!associated) throw notFound();
  return toPublicMedia(asset);
}

export function toPublicMedia(asset: mongoose.Document): PublicMediaDto {
  return {
    id: String(asset.get("_id")),
    mediaType: asset.get("mediaType") as PublicMediaDto["mediaType"],
    mimeType: asset.get("mimeType") as string,
  };
}
