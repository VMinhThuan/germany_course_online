import { useState } from 'react'
import { ArrowUpRight, Check, ChevronDown, CirclePlay, FileText } from 'lucide-react'
import { Link } from 'react-router'
import type { LessonSummaryModel } from '@/domains/catalog/models'
import type { CourseTreeViewModel } from './models'

function lessonStatus(lesson: LessonSummaryModel) {
  if (lesson.progressStatus === 'COMPLETED') {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-success-foreground">
        <Check aria-hidden="true" className="size-3.5" />
        Xong
      </span>
    )
  }
  if (lesson.progressStatus === 'IN_PROGRESS') {
    return <span className="shrink-0 text-xs font-semibold text-action-primary">Đang học</span>
  }
  return <span className="shrink-0 text-xs text-[#53646c]">Chưa bắt đầu</span>
}

export function LessonOutlineAccordion({
  tree,
  currentLessonId,
  compact = false,
  onSelectLesson,
  onSelectSection,
}: {
  tree: CourseTreeViewModel
  currentLessonId?: string
  compact?: boolean
  onSelectLesson?: (lessonId: string) => void
  onSelectSection?: (sectionId: string) => void
}) {
  const [expandedLessonId, setExpandedLessonId] = useState(
    currentLessonId ?? tree.currentLessonId ?? '',
  )
  const activeLessonId = currentLessonId ?? tree.currentLessonId

  return (
    <nav aria-label={`Lộ trình ${tree.courseTitle}`} className="grid gap-3">
      {tree.sections.map((section, sectionIndex) => (
        <section
          key={section.id}
          aria-labelledby={`${section.id}-outline-heading`}
          className="overflow-hidden rounded-xl border border-border-subtle bg-card-surface"
        >
          <div className="flex items-center gap-2 bg-brand-blue/30 px-3 py-2 sm:px-4">
            <h2
              id={`${section.id}-outline-heading`}
              className="min-h-11 min-w-0 flex-1 py-3 text-sm font-semibold text-ink-primary"
            >
              <span className="mr-2 text-xs font-bold uppercase tracking-wide text-action-primary">
                {section.sectionType === 'EXAM_PREP' ? 'Ôn tập' : `Chương ${sectionIndex + 1}`}
              </span>
              {section.title}
            </h2>
            {onSelectSection && (
              <button
                type="button"
                className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-action-primary hover:bg-white/70 focus-visible:outline-offset-[-2px]"
                onClick={() => onSelectSection(section.id)}
              >
                Mở chương
                <ArrowUpRight aria-hidden="true" className="size-3.5" />
              </button>
            )}
          </div>
          <ol className="grid gap-2 p-2 sm:p-3">
            {section.lessons.map((lesson, lessonIndex) => {
              const active = lesson.id === activeLessonId
              const expanded = expandedLessonId === lesson.id
              const panelId = `${lesson.id}-outline-items`
              const shouldShowChildren = compact ? active : expanded
              const hasVideo = lesson.hasVideo === true
              const exercises = lesson.exercises ?? []
              const hasItems = hasVideo || exercises.length > 0

              return (
                <li key={lesson.id} className="min-w-0">
                  {compact ? (
                    <button
                      type="button"
                      onClick={() => onSelectLesson?.(lesson.id)}
                      aria-current={active ? 'page' : undefined}
                      title={lesson.title}
                      className={`grid min-h-12 w-full grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-2 rounded-lg border-l-2 px-2.5 py-2 text-left transition-colors hover:bg-surface-muted focus-visible:outline-offset-[-2px] ${active ? 'border-action-primary bg-surface-blue font-semibold text-ink-primary' : 'border-transparent text-ink-secondary'}`}
                    >
                      <span className="text-xs tabular-nums text-[#53646c]">
                        {lessonIndex + 1}.
                      </span>
                      <span className="line-clamp-2 min-w-0 break-words text-[0.9375rem] leading-snug">
                        {lesson.title}
                      </span>
                      {lessonStatus(lesson)}
                    </button>
                  ) : (
                    <div className="flex min-w-0 items-center gap-1">
                      <button
                        type="button"
                        aria-expanded={expanded}
                        aria-controls={panelId}
                        onClick={() => setExpandedLessonId(expanded ? '' : lesson.id)}
                        title={lesson.title}
                        className={`grid min-h-14 min-w-0 flex-1 grid-cols-[1.5rem_minmax(0,1fr)_auto_1.25rem] items-center gap-2 rounded-lg border-l-2 px-3 py-2.5 text-left transition-colors hover:bg-surface-muted focus-visible:outline-offset-[-2px] sm:px-4 ${active ? 'border-action-primary bg-surface-blue font-semibold text-ink-primary' : 'border-transparent text-ink-secondary'}`}
                      >
                        <span className="text-sm tabular-nums text-[#53646c]">
                          {lessonIndex + 1}.
                        </span>
                        <span className="line-clamp-2 min-w-0 break-words text-[0.9375rem] font-medium leading-snug sm:text-base">
                          {lesson.title}
                        </span>
                        {lessonStatus(lesson)}
                        <ChevronDown
                          aria-hidden="true"
                          className={`size-4 text-ink-muted transition-transform motion-reduce:transition-none ${expanded ? 'rotate-180' : ''}`}
                        />
                      </button>
                      {onSelectLesson && (
                        <button
                          type="button"
                          aria-label={`Mở bài học ${lesson.title}`}
                          className="grid size-10 shrink-0 place-items-center rounded-lg text-action-primary hover:bg-surface-blue focus-visible:outline-offset-[-2px]"
                          onClick={() => onSelectLesson(lesson.id)}
                        >
                          <ArrowUpRight aria-hidden="true" className="size-4" />
                        </button>
                      )}
                    </div>
                  )}
                  {(!compact || shouldShowChildren) && (
                    <div
                      id={panelId}
                      hidden={!shouldShowChildren}
                      className={`${shouldShowChildren ? 'grid' : 'hidden'} ml-5 mt-1 gap-1 border-l border-border-subtle pl-2 sm:ml-7 sm:pl-3 ${compact ? 'pb-1' : 'pb-2'}`}
                    >
                      {hasVideo && (
                        <Link
                          to={`/learn/lessons/${lesson.id}`}
                          className="flex min-h-11 min-w-0 items-center gap-2 rounded-lg border border-[#f0cfcb] bg-[#fff9f7] px-3 py-2 text-sm font-semibold text-[#8f3030] transition-colors hover:bg-[#fff0ec] focus-visible:outline-offset-[-2px]"
                        >
                          <CirclePlay aria-hidden="true" className="size-4 shrink-0" />
                          <span className="min-w-0 flex-1">Video bài giảng</span>
                          <span className="text-xs font-medium text-ink-muted">Mở</span>
                        </Link>
                      )}
                      {exercises.map((exercise, exerciseIndex) => (
                        <Link
                          key={exercise.id}
                          to={`/learn/exercises/${exercise.id}`}
                          className={`flex min-h-11 min-w-0 items-center gap-2 rounded-lg border border-brand-pink bg-brand-pink/30 px-3 py-2 text-sm font-medium text-ink-primary transition-colors hover:bg-brand-pink/45 focus-visible:outline-offset-[-2px] ${compact ? 'text-[0.8125rem]' : ''}`}
                        >
                          <FileText
                            aria-hidden="true"
                            className="size-4 shrink-0 text-action-primary"
                          />
                          <span className="min-w-0 flex-1 break-words">{exercise.title}</span>
                          {exercises.length > 1 && (
                            <span className="shrink-0 text-xs text-[#53646c]">
                              Bài {exerciseIndex + 1}
                            </span>
                          )}
                        </Link>
                      ))}
                      {!hasItems && (
                        <p className="px-2 py-2 text-sm text-ink-muted">
                          Chưa có video hoặc bài tập được công bố.
                        </p>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ol>
        </section>
      ))}
    </nav>
  )
}
