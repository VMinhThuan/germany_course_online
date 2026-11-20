export type PreviewSectionRecord = {
  _id: unknown;
  sectionType?: string;
  sortOrder?: number;
  previewEnabled?: boolean | null;
};

/**
 * Returns the first configured number of CHAPTER sections in course order.
 * Callers must pass only sections that are currently valid for their context
 * (for example published, non-deleted sections for the public catalog).
 */
export function getPreviewSectionIds(
  sections: readonly PreviewSectionRecord[],
  previewChapterCount: number,
): string[] {
  if (!Number.isInteger(previewChapterCount) || previewChapterCount <= 0)
    return [];

  const hasExplicitSelection = sections.some(
    (section) => typeof section.previewEnabled === "boolean",
  );
  const chapters = sections.filter(
    (section) =>
      section.sectionType === "CHAPTER" &&
      (!hasExplicitSelection || section.previewEnabled === true),
  );

  return chapters
    .slice()
    .sort((left, right) => {
      const sortDifference = (left.sortOrder ?? 0) - (right.sortOrder ?? 0);
      return (
        sortDifference || String(left._id).localeCompare(String(right._id))
      );
    })
    .slice(0, previewChapterCount)
    .map((section) => String(section._id));
}

export function normalizePreviewChapterCount(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : 0;
}
