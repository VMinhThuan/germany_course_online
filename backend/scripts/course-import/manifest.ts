export const STAGING_DATABASE_NAME = "paniverse_lms";

export type CourseImportLesson = {
  title: string;
  videoId: string;
  sortOrder: number;
};

export type CourseImportSection = {
  title: string;
  sortOrder: number;
  lessons: readonly CourseImportLesson[];
};

export const courseImportManifest = {
  course: {
    code: "NIVEAU_A1_1",
    slug: "niveau-a1-1",
    title: "Niveau A1.1",
    level: "A1.1",
    description:
      "Các bài học tiếng Đức trình độ A1.1 dành cho người mới bắt đầu.",
    shortDescription: "Học tiếng Đức A1.1 qua các bài giảng YouTube.",
    price: "1000000",
    accessDurationMonths: 6,
  },
  sections: [
    {
      title: "Lektion 1",
      sortOrder: 1,
      lessons: [
        {
          title: "Begrüßung und Abschied",
          videoId: "lamg3tUwct4",
          sortOrder: 1,
        },
        { title: "Sich vorstellen", videoId: "VqW9bOvJuJg", sortOrder: 2 },
        {
          title: "Nach dem Befinden fragen (Du)",
          videoId: "GqdHcdnYwK0",
          sortOrder: 3,
        },
        {
          title: "Nach dem Befinden fragen (Sie)",
          videoId: "yhH5qNyBaDI",
          sortOrder: 4,
        },
        { title: "Das Alphabet", videoId: "8btp8npfmC8", sortOrder: 5 },
        { title: "Die Zahlen", videoId: "UpU-yfPXlIw", sortOrder: 6 },
        {
          title: "Telefonnummer und E-Mail",
          videoId: "31kcrDC_c6Q",
          sortOrder: 7,
        },
      ],
    },
    {
      title: "Lektion 2",
      sortOrder: 2,
      lessons: [
        { title: "Die Länder", videoId: "q7FJCKxKLX0", sortOrder: 1 },
        { title: "Der Wohnort", videoId: "O5Hz1ukprws", sortOrder: 2 },
      ],
    },
  ] satisfies readonly CourseImportSection[],
} as const;

const videoIds = courseImportManifest.sections.flatMap((section) =>
  section.lessons.map((lesson) => lesson.videoId),
);

if (
  videoIds.length !== 9 ||
  new Set(videoIds).size !== videoIds.length ||
  videoIds.some((videoId) => !/^[A-Za-z0-9_-]{11}$/.test(videoId))
) {
  throw new Error(
    "A1.1 manifest must contain exactly nine unique YouTube IDs.",
  );
}
