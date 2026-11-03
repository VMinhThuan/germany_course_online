import { BookOpenText, Compass, Layers3, MessageCircleMore, Sparkles } from 'lucide-react'

export const homepageContent = {
  hero: {
    eyebrow: 'Deutsch · A1.1',
    title: 'Nói tiếng Đức bắt đầu từ lời chào.',
    description:
      'Khám phá lộ trình A1.1 và mở ba chương học thử ngay trên website, không cần đăng nhập.',
    note: 'Một điểm bắt đầu · Tiếng Đức A1.1',
  },
  quickEntry: {
    eyebrow: 'Bắt đầu theo cách của bạn',
    title: 'Bạn muốn khám phá phần nào trước?',
    description: 'Đi thẳng đến khóa học hoặc thử một vài bài học mẫu.',
    items: [
      {
        icon: Compass,
        eyebrow: 'Khóa học',
        title: 'Tiếng Đức A1.1',
        description: 'Xem cấu trúc và nội dung khóa học.',
        href: '/courses/tieng-duc-a1-1',
        action: 'Xem khóa học',
        tone: 'blue',
      },
      {
        icon: BookOpenText,
        eyebrow: 'Học thử miễn phí',
        title: 'Mở ba chương đầu',
        description: 'Xem bài học mẫu trực tiếp trên website.',
        href: '/courses/tieng-duc-a1-1/preview',
        action: 'Vào học thử',
        tone: 'lime',
      },
    ],
  },
  learningIntro: {
    eyebrow: 'Bên trong khóa học',
    title: 'Một bài học, từ câu tiếng Đức đến cách dùng.',
    description:
      'Xem trước giao diện học thử với danh sách chương, bài mẫu và phần giải thích bằng tiếng Việt.',
    image: '/assets/homepage/free-preview-ui.png',
    imageAlt: 'Ảnh chụp giao diện học thử Tiếng Đức A1.1 với danh sách chương và bài mẫu.',
    caption: 'Giao diện học thử A1.1 · Bản demo sản phẩm',
  },
  pricing: {
    eyebrow: 'Học phí & lộ trình',
    title: 'Chọn một lộ trình để bắt đầu.',
    description:
      'Xem các khóa học đang có. Học phí và thời hạn truy cập sẽ hiển thị khi được xác nhận.',
    benefits: [
      'Xem cấu trúc khóa học theo chương và bài',
      'Mở ba chương học thử không cần đăng nhập',
      'Xem bài mẫu và phần giải thích bằng tiếng Việt',
    ],
  },
  value: {
    eyebrow: 'Học từng bước, hiểu cách dùng',
    title: 'Một lộ trình rõ ràng cho những câu đầu tiên.',
    items: [
      {
        icon: Layers3,
        title: 'Nội dung được chia theo chương',
        description: 'Xem danh sách chương và bài học để biết nội dung được sắp xếp ra sao.',
      },
      {
        icon: MessageCircleMore,
        title: 'Bắt đầu từ tình huống quen thuộc',
        description: 'Làm quen với lời chào, cách giới thiệu bản thân và câu hỏi ngắn.',
      },
      {
        icon: Sparkles,
        title: 'Thử trước trên website',
        description: 'Ba chương được mở học thử để bạn xem cách trình bày bài học.',
      },
    ],
  },
  faq: {
    eyebrow: 'Câu hỏi thường gặp',
    title: 'Bạn cần biết gì trước khi học thử?',
    description: 'Thông tin được cập nhật theo những gì hiện có trong bản demo.',
    questions: [
      {
        id: 'try-before-enrolling',
        question: 'Tôi có thể học thử trước khi đăng nhập không?',
        answer:
          'Có. Ba chương được đánh dấu học thử có thể mở trực tiếp trên website mà không cần đăng nhập.',
      },
      {
        id: 'course-content',
        question: 'Khóa A1.1 hiện có những gì?',
        answer:
          'Bản demo hiện hiển thị cấu trúc 4 chương và 7 bài học. Tên bài và nội dung đầy đủ vẫn đang được đội ngũ nội dung xác nhận.',
      },
      {
        id: 'tuition',
        question: 'Tôi xem học phí và thời hạn truy cập ở đâu?',
        answer:
          'Hai thông tin này chưa được công bố trong danh mục hiện tại. Trang sẽ hiển thị khi dữ liệu chính thức được xác nhận.',
      },
      {
        id: 'video',
        question: 'Bài học thử đã có video chưa?',
        answer:
          'Video hiện chưa sẵn sàng trong bản demo. Bạn vẫn có thể xem nội dung mẫu và điều hướng giữa các bài học thử.',
      },
    ],
  },
} as const

export const homepageFooterLinks = [
  { label: 'Khóa học', href: '/courses' },
  { label: 'Học thử', href: '/courses/tieng-duc-a1-1/preview' },
  { label: 'Trợ giúp', href: '/help' },
] as const
