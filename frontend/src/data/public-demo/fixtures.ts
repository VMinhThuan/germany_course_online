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
  thumbnailUrl: '/demo-assets/a11-course-card.svg',
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
