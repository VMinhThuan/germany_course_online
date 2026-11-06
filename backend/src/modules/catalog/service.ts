import mongoose from "mongoose";
import {
  Course,
  CourseSection,
  Lesson,
  MediaAsset,
  SiteSettings,
} from "../../db/models/index.js";
import type { MediaProvider } from "../../config/env.js";
import { notFound } from "../../shared/errors.js";
import type {
  MediaResourceType,
  MediaStorageAdapter,
} from "../learning/media-storage.js";
import { DEFAULT_SITE_SETTINGS } from "../site-settings/defaults.js";
import {
  getAssociatedPublicMedia,
  toPublicMedia,
  type PublicMediaDto,
} from "./public-media.js";

export type CourseListQuery = {
  page: number;
  pageSize: number;
  level?: string | undefined;
  q?: string | undefined;
  sort: "sortOrder" | "newest" | "title" | "price_asc" | "price_desc";
};

type PublicLesson = {
  id: string;
  title: string;
  description?: string;
  lessonType: "LECTURE" | "PRACTICE";
  estimatedMinutes: number | null;
  sortOrder: number;
};

type PublicSection = {
  id: string;
  title: string;
  description?: string;
  sortOrder: number;
  lessonCount: number;
  lessons: PublicLesson[];
};

// This single media asset is intentionally published on the public homepage.
const HOMEPAGE_INTRO_VIDEO_ASSET_ID = "6aedaa5852b258cead709444";

export class PublicCatalogService {
  constructor(private readonly mediaStorage: MediaStorageAdapter) {}

  async listCourses(query: CourseListQuery) {
    const filter: Record<string, unknown> = {
      status: "PUBLISHED",
      deletedAt: null,
    };
    if (query.level) filter.level = query.level;
    if (query.q) {
      const escaped = query.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pattern = new RegExp(escaped, "i");
      filter.$or = [
        { title: pattern },
        { shortDescription: pattern },
        { code: pattern },
      ];
    }
    const total = await Course.countDocuments(filter);
    const sort = sortFor(query.sort);
    const courses = await Course.find(filter)
      .select(
        "code title slug level shortDescription thumbnailAssetId bannerAssetId price accessDurationMonths status sortOrder",
      )
      .sort(sort)
      .skip((query.page - 1) * query.pageSize)
      .limit(query.pageSize)
      .lean();

    const courseIds = courses.map((course) => course._id);
    const sections = courseIds.length
      ? await CourseSection.find({
          courseId: { $in: courseIds },
          status: "PUBLISHED",
          deletedAt: null,
        })
          .select("_id courseId")
          .lean()
      : [];
    const sectionIds = sections.map((section) => section._id);
    const lessons = sectionIds.length
      ? await Lesson.find({
          sectionId: { $in: sectionIds },
          status: "PUBLISHED",
          deletedAt: null,
        })
          .select("_id sectionId")
          .lean()
      : [];
    const lessonsBySection = new Map<string, number>();
    for (const lesson of lessons) {
      const key = String(lesson.sectionId);
      lessonsBySection.set(key, (lessonsBySection.get(key) ?? 0) + 1);
    }
    const countsByCourse = new Map<
      string,
      { sections: number; lessons: number }
    >();
    for (const section of sections) {
      const key = String(section.courseId);
      const counts = countsByCourse.get(key) ?? { sections: 0, lessons: 0 };
      counts.sections += 1;
      counts.lessons += lessonsBySection.get(String(section._id)) ?? 0;
      countsByCourse.set(key, counts);
    }

    const imageAssetIds = [
      ...new Map(
        courses
          .flatMap((course) => [course.thumbnailAssetId, course.bannerAssetId])
          .filter((assetId) => Boolean(assetId))
          .map((assetId) => [String(assetId), assetId] as const),
      ).values(),
    ];
    const imageAssets = imageAssetIds.length
      ? await MediaAsset.find({
          _id: { $in: imageAssetIds },
          mediaType: "IMAGE",
          visibility: "PUBLIC",
          deletedAt: null,
          uploadStatus: { $nin: ["PENDING", "DELETING", "DELETED"] },
        }).select("+provider +storageKey +resourceType +deliveryType")
      : [];
    const imagesById = new Map<string, PublicMediaDto>();
    await Promise.all(
      imageAssets.map(async (asset) => {
        imagesById.set(
          String(asset.get("_id")),
          await this.toPublicCourseMedia(asset),
        );
      }),
    );

    return {
      items: courses.map((course) => {
        const counts = countsByCourse.get(String(course._id)) ?? {
          sections: 0,
          lessons: 0,
        };
        return {
          id: String(course._id),
          code: course.code,
          slug: course.slug,
          title: course.title,
          level: course.level,
          shortDescription: course.shortDescription,
          thumbnailUrl:
            imagesById.get(String(course.thumbnailAssetId))?.url ??
            imagesById.get(String(course.bannerAssetId))?.url ??
            null,
          price: decimalIntegerString(course.price),
          accessDurationMonths: course.accessDurationMonths,
          status: "PUBLISHED" as const,
          chapterCount: counts.sections,
          lessonCount: counts.lessons,
        };
      }),
      page: query.page,
      pageSize: query.pageSize,
      total,
      hasMore: query.page * query.pageSize < total,
    };
  }

  async getCourseBySlug(slug: string) {
    const course = await Course.findOne({
      slug,
      status: "PUBLISHED",
      deletedAt: null,
    })
      .select(
        "code title slug description shortDescription objectives requirements level thumbnailAssetId bannerAssetId introVideoAssetId price accessDurationMonths",
      )
      .lean();
    if (!course) throw notFound("Published course not found.");

    const sections = await CourseSection.find({
      courseId: course._id,
      status: "PUBLISHED",
      deletedAt: null,
    })
      .select("_id title description sortOrder")
      .sort({ sortOrder: 1, _id: 1 })
      .lean();
    const sectionIds = sections.map((section) => section._id);
    const lessons = sectionIds.length
      ? await Lesson.find({
          sectionId: { $in: sectionIds },
          status: "PUBLISHED",
          deletedAt: null,
        })
          .select(
            "_id sectionId title description lessonType estimatedMinutes sortOrder",
          )
          .sort({ sortOrder: 1, _id: 1 })
          .lean()
      : [];
    const lessonsBySection = new Map<string, PublicLesson[]>();
    for (const lesson of lessons) {
      const key = String(lesson.sectionId);
      const list = lessonsBySection.get(key) ?? [];
      list.push({
        id: String(lesson._id),
        title: lesson.title,
        ...(lesson.description ? { description: lesson.description } : {}),
        lessonType: lesson.lessonType as PublicLesson["lessonType"],
        estimatedMinutes: lesson.estimatedMinutes ?? null,
        sortOrder: lesson.sortOrder,
      });
      lessonsBySection.set(key, list);
    }

    const publicSections: PublicSection[] = sections.map((section) => {
      const sectionLessons = lessonsBySection.get(String(section._id)) ?? [];
      return {
        id: String(section._id),
        title: section.title,
        ...(section.description ? { description: section.description } : {}),
        sortOrder: section.sortOrder,
        lessonCount: sectionLessons.length,
        lessons: sectionLessons,
      };
    });
    const [thumbnail, banner, introMedia] = await Promise.all([
      this.getCourseMedia(course.thumbnailAssetId, course._id),
      this.getCourseMedia(course.bannerAssetId, course._id),
      this.getCourseMedia(course.introVideoAssetId, course._id),
    ]);

    return {
      id: String(course._id),
      code: course.code,
      slug: course.slug,
      title: course.title,
      description: course.description,
      shortDescription: course.shortDescription,
      objectives: course.objectives,
      requirements: course.requirements,
      level: course.level,
      price: decimalIntegerString(course.price),
      accessDurationMonths: course.accessDurationMonths,
      thumbnail,
      banner,
      introMedia,
      sections: publicSections,
    };
  }

  async getPublicSiteSettings() {
    const settings =
      (await SiteSettings.findById("site").select("-payment").lean()) ??
      DEFAULT_SITE_SETTINGS;
    const heroMedia = settings.heroAssetId
      ? await MediaAsset.findOne({
          _id: settings.heroAssetId,
          visibility: "PUBLIC",
          deletedAt: null,
          uploadStatus: { $nin: ["PENDING", "DELETING", "DELETED"] },
        })
      : null;
    const introVideo = await this.getHomepageIntroVideo();
    return {
      siteName: settings.siteName,
      logoUrl: null,
      heroTitle: settings.heroTitle,
      heroDescription: settings.heroDescription,
      contactEmail: settings.contactEmail,
      contactPhone: settings.contactPhone,
      facebookUrl: settings.facebookUrl,
      zaloUrl: settings.zaloUrl,
      footerDescription: settings.footerDescription,
      heroMedia: heroMedia ? toPublicMedia(heroMedia) : null,
      introVideo,
    };
  }

  private async getHomepageIntroVideo(): Promise<PublicMediaDto | null> {
    const asset = await MediaAsset.findOne({
      _id: new mongoose.Types.ObjectId(HOMEPAGE_INTRO_VIDEO_ASSET_ID),
      provider: "CLOUDINARY",
      mediaType: "FILE",
      mimeType: /^video\//,
      resourceType: "video",
      deliveryType: "authenticated",
      deletedAt: null,
      uploadStatus: "READY",
    })
      .select("+provider +storageKey +resourceType +deliveryType")
      .lean();
    if (!asset) return null;

    const adapter = resolveMediaStorage(this.mediaStorage, asset.provider);
    if (!adapter?.signPlayback) return null;
    const url = adapter.signPlayback({
      storageKey: asset.storageKey,
      mimeType: asset.mimeType,
      mediaType: "FILE",
      resourceType: asset.resourceType as MediaResourceType | null,
      deliveryType: asset.deliveryType as
        | "upload"
        | "private"
        | "authenticated"
        | null,
      format: asset.format ?? null,
    });
    return {
      id: String(asset._id),
      mediaType: "VIDEO",
      mimeType: asset.mimeType,
      url,
    };
  }

  async getPublicMediaMetadata(assetId: string): Promise<PublicMediaDto> {
    if (!mongoose.isValidObjectId(assetId)) throw notFound();
    return getAssociatedPublicMedia(
      new mongoose.Types.ObjectId(assetId),
      "any",
    );
  }

  private async getCourseMedia(
    assetId: unknown,
    courseId: mongoose.Types.ObjectId,
  ): Promise<PublicMediaDto | undefined> {
    if (!assetId || !mongoose.isValidObjectId(assetId)) return undefined;
    const asset = await MediaAsset.findOne({
      _id: assetId,
      visibility: "PUBLIC",
      deletedAt: null,
      uploadStatus: { $nin: ["PENDING", "DELETING", "DELETED"] },
    }).select("+provider +storageKey +resourceType +deliveryType");
    if (!asset) return undefined;
    const isPublishedCourseReference = await Course.exists({
      _id: courseId,
      status: "PUBLISHED",
      deletedAt: null,
      $or: [
        { thumbnailAssetId: asset._id },
        { bannerAssetId: asset._id },
        { introVideoAssetId: asset._id },
      ],
    });
    return isPublishedCourseReference
      ? this.toPublicCourseMedia(asset)
      : undefined;
  }

  private async toPublicCourseMedia(
    asset: mongoose.Document,
  ): Promise<PublicMediaDto> {
    const media = toPublicMedia(asset);
    const adapter = resolveMediaStorage(
      this.mediaStorage,
      asset.get("provider"),
    );
    if (!adapter) return media;

    const signed = await adapter.signRead({
      storageKey: asset.get("storageKey") as string,
      mimeType: media.mimeType,
      mediaType: media.mediaType,
      resourceType: asset.get("resourceType") as MediaResourceType | null,
      deliveryType: asset.get("deliveryType") as
        "upload" | "private" | "authenticated" | null,
      format: asset.get("format") as string | null,
    });
    return { ...media, url: signed.url };
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

function sortFor(value: CourseListQuery["sort"]): Record<string, 1 | -1> {
  switch (value) {
    case "newest":
      return { createdAt: -1, _id: 1 };
    case "title":
      return { title: 1, _id: 1 };
    case "price_asc":
      return { price: 1, _id: 1 };
    case "price_desc":
      return { price: -1, _id: 1 };
    default:
      return { sortOrder: 1, _id: 1 };
  }
}

export function decimalIntegerString(value: unknown): string {
  if (value === undefined || value === null) return "0";
  const decimal =
    value instanceof mongoose.Types.Decimal128
      ? value.toString()
      : String(value);
  if (!/^(0|[1-9]\d*)$/.test(decimal))
    throw new Error("Stored course price is not a nonnegative VND integer.");
  return decimal;
}
