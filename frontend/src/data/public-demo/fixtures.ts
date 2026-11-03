import type { CourseDetailModel } from '@/domains/catalog/models'
import type { PublicPreviewLessonContent, PublicPreviewManifest } from './types'

/** Public, fictional product copy only. No student, payment, quiz, or private learning data. */
export const PUBLIC_DEMO_COURSE: CourseDetailModel = {
  id: 'public-demo-a11',
  code: 'A1.1',
  slug: 'tieng-duc-a1-1',
  title: 'Tiếng Đức A1.1 · Bắt đầu giao tiếp',
  level: 'A1.1',
  shortDescription:
    'Làm quen với lời chào, cách giới thiệu bản thân và những cuộc hội thoại đầu tiên bằng tiếng Đức.',
  thumbnailUrl: '/assets/homepage/course-banner-a11.webp',
  description:
    'Bản demo giới thiệu cấu trúc khóa A1.1 và một số nội dung học thử. Tên bài, mô tả và bài học mẫu đang chờ được đội ngũ nội dung xác nhận.',
  objectives: [
    'Nhận biết lời chào trong các tình huống giao tiếp quen thuộc.',
    'Làm quen với cách hỏi và nói tên bằng tiếng Đức.',
    'Thực hành một số câu hỏi, câu trả lời ngắn trong phần học thử.',
  ],
  requirements: [
    'Không cần đăng nhập để mở ba chương được đánh dấu học thử.',
    'Nội dung hiện tại là bản demo, không đại diện đầy đủ cho khóa học chính thức.',
  ],
  status: 'PUBLISHED',
  priceVnd: '1290000',
  accessDurationMonths: 12,
  previewAvailable: true,
  chapterCount: 4,
  lessonCount: 7,
  sections: [
    {
      id: 'a11-chapter-01',
      courseId: 'public-demo-a11',
      title: 'Hallo! · Chào hỏi',
      description: 'Làm quen với một số lời chào thường gặp.',
      sectionType: 'CHAPTER',
      contentStatus: 'PUBLISHED',
      sortOrder: 10,
      lessons: [
        {
          id: 'a11-lesson-01',
          title: 'Guten Tag! · Xin chào',
          lessonType: 'LECTURE',
          contentStatus: 'PUBLISHED',
          estimatedMinutes: 12,
          countsTowardProgress: false,
          progressStatus: 'NOT_STARTED',
        },
        {
          id: 'a11-lesson-02',
          title: 'Luyện tập lời chào',
          lessonType: 'PRACTICE',
          contentStatus: 'PUBLISHED',
          estimatedMinutes: 9,
          countsTowardProgress: false,
          progressStatus: 'NOT_STARTED',
        },
      ],
    },
    {
      id: 'a11-chapter-02',
      courseId: 'public-demo-a11',
      title: 'Ich heiße … · Tên và cách xưng hô',
      description: 'Một số mẫu câu giới thiệu tên trong hội thoại.',
      sectionType: 'CHAPTER',
      contentStatus: 'PUBLISHED',
      sortOrder: 20,
      lessons: [
        {
          id: 'a11-lesson-03',
          title: 'Tên của tôi là …',
          lessonType: 'LECTURE',
          contentStatus: 'PUBLISHED',
          estimatedMinutes: 10,
          countsTowardProgress: false,
          progressStatus: 'NOT_STARTED',
        },
        {
          id: 'a11-lesson-04',
          title: 'Hỏi và đánh vần tên',
          lessonType: 'PRACTICE',
          contentStatus: 'PUBLISHED',
          estimatedMinutes: 8,
          countsTowardProgress: false,
          progressStatus: 'NOT_STARTED',
        },
      ],
    },
    {
      id: 'a11-chapter-03',
      courseId: 'public-demo-a11',
      title: 'Woher kommen Sie? · Bạn đến từ đâu?',
      description: 'Câu hỏi cơ bản về quê quán trong giao tiếp.',
      sectionType: 'CHAPTER',
      contentStatus: 'PUBLISHED',
      sortOrder: 30,
      lessons: [
        {
          id: 'a11-lesson-05',
          title: 'Quê quán và quốc tịch',
          lessonType: 'LECTURE',
          contentStatus: 'PUBLISHED',
          estimatedMinutes: 11,
          countsTowardProgress: false,
          progressStatus: 'NOT_STARTED',
        },
      ],
    },
    {
      id: 'a11-chapter-04',
      courseId: 'public-demo-a11',
      title: 'Sprachen · Ngôn ngữ',
      description: 'Phần nội dung đầy đủ, cần quyền truy cập khóa học.',
      sectionType: 'CHAPTER',
      contentStatus: 'PUBLISHED',
      sortOrder: 40,
      lessons: [
        {
          id: 'a11-lesson-06',
          title: 'Bạn nói tiếng gì?',
          lessonType: 'LECTURE',
          contentStatus: 'PUBLISHED',
          estimatedMinutes: 13,
          countsTowardProgress: false,
          progressStatus: 'NOT_STARTED',
        },
      ],
    },
    {
      id: 'a11-exam-prep-01',
      courseId: 'public-demo-a11',
      title: 'Ôn tập · Chào hỏi và giới thiệu',
      description: 'Phần ôn tập thuộc nội dung đầy đủ của khóa học.',
      sectionType: 'EXAM_PREP',
      contentStatus: 'PUBLISHED',
      sortOrder: 50,
      lessons: [
        {
          id: 'a11-lesson-07',
          title: 'Ôn tập chương đầu',
          lessonType: 'PRACTICE',
          contentStatus: 'PUBLISHED',
          estimatedMinutes: 15,
          countsTowardProgress: false,
          progressStatus: 'NOT_STARTED',
        },
      ],
    },
  ],
}

function createA12Chapter(
  order: number,
  title: string,
  description: string,
  lessonTitles: readonly [string, string],
): CourseDetailModel['sections'][number] {
  const chapterNumber = String(order).padStart(2, '0')

  return {
    id: `a12-chapter-${chapterNumber}`,
    courseId: 'public-demo-a12',
    title,
    description,
    sectionType: 'CHAPTER',
    contentStatus: 'DRAFT',
    sortOrder: order * 10,
    lessons: lessonTitles.map((lessonTitle, index) => ({
      id: `a12-lesson-${chapterNumber}-${index + 1}`,
      title: lessonTitle,
      lessonType: index === 0 ? 'LECTURE' : 'PRACTICE',
      contentStatus: 'DRAFT',
      estimatedMinutes: index === 0 ? 12 : 10,
      countsTowardProgress: false,
      progressStatus: 'NOT_STARTED',
    })),
  }
}

export const PUBLIC_DEMO_A12_COURSE: CourseDetailModel = {
  id: 'public-demo-a12',
  code: 'A1.2',
  slug: 'tieng-duc-a1-2',
  title: 'Tiếng Đức A1.2 · Mở rộng giao tiếp',
  level: 'A1.2',
  shortDescription:
    'Tiếp nối nền tảng A1.1, mở rộng vốn từ và luyện giao tiếp trong các tình huống quen thuộc.',
  thumbnailUrl: '/assets/homepage/feature-interactive.webp',
  priceVnd: '1490000',
  accessDurationMonths: 12,
  previewAvailable: false,
  description:
    'A1.2 là lộ trình tiếp nối A1.1. Các chủ đề và bài học trên trang này chỉ minh họa bố cục; nội dung chính thức đang được chuẩn bị.',
  objectives: [
    'Mở rộng cách diễn đạt trong sinh hoạt hằng ngày.',
    'Làm quen với giờ giấc, lịch hẹn và hoạt động thường ngày.',
    'Thực hành các tình huống mua sắm và giao tiếp cơ bản.',
  ],
  requirements: [
    'Phù hợp với người đã làm quen các kiến thức nền tảng A1.1.',
    'Chương trình và điều kiện học chính thức đang được xác nhận.',
  ],
  status: 'PUBLISHED',
  chapterCount: 4,
  lessonCount: 8,
  sections: [
    createA12Chapter(
      1,
      'Mein Alltag · Sinh hoạt hằng ngày',
      'Từ vựng và mẫu câu về một ngày thường.',
      [
        'Was machst du heute? · Hôm nay bạn làm gì?',
        'Übung: Mein Tagesablauf · Luyện tập lịch sinh hoạt',
      ],
    ),
    createA12Chapter(
      2,
      'Uhrzeit und Termine · Giờ giấc và lịch hẹn',
      'Cách nói giờ và sắp xếp cuộc hẹn.',
      ['Wie spät ist es? · Mấy giờ rồi?', 'Übung: Einen Termin vereinbaren · Luyện đặt lịch hẹn'],
    ),
    createA12Chapter(
      3,
      'Essen und Einkaufen · Ăn uống và mua sắm',
      'Giao tiếp đơn giản khi gọi món và mua đồ.',
      ['Was möchten Sie? · Bạn muốn dùng gì?', 'Übung: Im Geschäft · Luyện hội thoại ở cửa hàng'],
    ),
    createA12Chapter(4, 'Wohnen · Nhà ở', 'Từ vựng làm quen với ngôi nhà và nơi ở.', [
      'Meine Wohnung · Căn hộ của tôi',
      'Übung: Zimmer beschreiben · Luyện mô tả căn phòng',
    ]),
  ],
}

export const PUBLIC_DEMO_COURSES: readonly CourseDetailModel[] = [
  PUBLIC_DEMO_COURSE,
  PUBLIC_DEMO_A12_COURSE,
]

export const PUBLIC_PREVIEW_MANIFEST: PublicPreviewManifest = {
  courseSlug: 'tieng-duc-a1-1',
  sectionIds: ['a11-chapter-01', 'a11-chapter-02', 'a11-chapter-03'],
  notice:
    'Bạn đang xem bản demo. Ba chương này được mở học thử; nội dung mẫu, học phí và điều kiện khóa học chính thức đang được xác nhận.',
}

const videoUnavailable = {
  id: 'public-demo-video',
  title: 'Video bài học thử',
  mediaType: 'VIDEO',
  availability: 'unavailable',
  canDownload: false,
  message: 'Video học thử đang được cập nhật.',
} as const

export const PUBLIC_PREVIEW_LESSONS: readonly PublicPreviewLessonContent[] = [
  {
    courseSlug: 'tieng-duc-a1-1',
    sectionId: 'a11-chapter-01',
    lessonId: 'a11-lesson-01',
    paragraphs: [
      'Trong phần mẫu này, bạn làm quen với lời chào “Guten Tag”. Cụm từ thường được dùng vào ban ngày trong những tình huống lịch sự.',
      'Bạn có thể nghe hoặc đọc lời chào trước, sau đó thử nói lại thành tiếng. Video hiện chưa sẵn sàng trong bản demo.',
    ],
    keyPhrases: [
      { german: 'Guten Tag!', vietnamese: 'Xin chào! (lịch sự, ban ngày)' },
      { german: 'Hallo!', vietnamese: 'Chào! (thân mật)' },
    ],
    media: [videoUnavailable],
  },
  {
    courseSlug: 'tieng-duc-a1-1',
    sectionId: 'a11-chapter-02',
    lessonId: 'a11-lesson-03',
    paragraphs: [
      'Trong bài mẫu, bạn xem cách nói tên bằng câu “Ich heiße …” và cách hỏi tên người đối diện.',
      'Đây là nội dung minh họa ngắn. Bài giảng và hoạt động thực hành chính thức đang được chuẩn bị.',
    ],
    keyPhrases: [
      { german: 'Ich heiße Linh.', vietnamese: 'Tôi tên là Linh.' },
      { german: 'Wie heißen Sie?', vietnamese: 'Bạn tên là gì? (lịch sự)' },
    ],
    media: [videoUnavailable],
  },
  {
    courseSlug: 'tieng-duc-a1-1',
    sectionId: 'a11-chapter-03',
    lessonId: 'a11-lesson-05',
    paragraphs: [
      'Câu “Woher kommen Sie?” dùng để hỏi một người đến từ đâu. Câu trả lời có thể bắt đầu bằng “Ich komme aus …”.',
      'Ví dụ trong bản demo: “Ich komme aus Vietnam.” — “Tôi đến từ Việt Nam.”',
    ],
    keyPhrases: [
      { german: 'Woher kommen Sie?', vietnamese: 'Bạn đến từ đâu? (lịch sự)' },
      { german: 'Ich komme aus Vietnam.', vietnamese: 'Tôi đến từ Việt Nam.' },
    ],
    media: [videoUnavailable],
  },
]
