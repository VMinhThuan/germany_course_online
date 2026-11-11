import { useState } from 'react'
import { Smile } from 'lucide-react'
import type { ApiLessonCommentReactionType } from '@/lib/api/types'
import { Button, Popover } from '@/shared/ui'

const options: Array<{ type: ApiLessonCommentReactionType; emoji: string; label: string }> = [
  { type: 'LIKE', emoji: '👍', label: 'Thích' },
  { type: 'LOVE', emoji: '❤️', label: 'Yêu thích' },
  { type: 'HAHA', emoji: '😂', label: 'Buồn cười' },
  { type: 'WOW', emoji: '😮', label: 'Ngạc nhiên' },
  { type: 'CLAP', emoji: '👏', label: 'Vỗ tay' },
]

export function CommentReactionControl({
  reactions,
  activeReaction,
  onSelect,
  disabled = false,
}: {
  reactions: readonly { reactionType: ApiLessonCommentReactionType; count: number }[]
  activeReaction: ApiLessonCommentReactionType | null
  onSelect: (reaction: ApiLessonCommentReactionType) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const visibleReactions = reactions.filter((reaction) => reaction.count > 0)

  function select(type: ApiLessonCommentReactionType) {
    onSelect(type)
    setOpen(false)
  }

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
      {visibleReactions.map((reaction) => {
        const option = options.find((item) => item.type === reaction.reactionType)!
        const selected = activeReaction === reaction.reactionType
        return (
          <button
            key={reaction.reactionType}
            type="button"
            aria-label={`${selected ? 'Bỏ reaction' : 'Thả reaction'} ${option.label}, ${reaction.count} lượt`}
            aria-pressed={selected}
            disabled={disabled}
            onClick={() => select(reaction.reactionType)}
            className={`inline-flex min-h-8 items-center gap-1 rounded-full px-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-focus disabled:opacity-50 ${selected ? 'bg-brand-blue/55 text-ink-primary' : 'bg-surface-muted text-ink-secondary hover:bg-brand-blue/35'}`}
          >
            <span aria-hidden="true">{option.emoji}</span>
            <span className="tabular-nums">{reaction.count}</span>
          </button>
        )
      })}
      <Popover
        open={open}
        onOpenChange={setOpen}
        title="Chọn cảm xúc"
        trigger={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            aria-label="Thêm reaction"
            aria-haspopup="dialog"
            aria-expanded={open}
            className="min-h-8 px-2 text-ink-secondary"
            startIcon={<Smile aria-hidden="true" className="size-4" />}
          >
            React
          </Button>
        }
      >
        <div className="flex items-center justify-between gap-1" role="group" aria-label="Reaction">
          {options.map((option) => (
            <button
              key={option.type}
              type="button"
              aria-label={option.label}
              aria-pressed={activeReaction === option.type}
              onClick={() => select(option.type)}
              className={`grid size-10 place-items-center rounded-lg text-xl transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-focus ${activeReaction === option.type ? 'bg-brand-blue/60' : 'hover:bg-surface-muted'}`}
            >
              {option.emoji}
            </button>
          ))}
        </div>
      </Popover>
    </div>
  )
}
