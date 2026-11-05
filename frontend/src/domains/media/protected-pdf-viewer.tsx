import { useEffect, useId, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { ChevronLeft, ChevronRight, Minus, Plus, Scan } from 'lucide-react'
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

type DocumentState = {
  src: string
  document: PDFDocumentProxy | null
  pageNumber: number
  loading: boolean
  error: string
}

export function ProtectedPdfViewer({ src, title }: { src: string; title: string }) {
  const instructionsId = useId()
  const hostRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dragRef = useRef<{
    pointerId: number
    x: number
    y: number
    left: number
    top: number
  } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [documentState, setDocumentState] = useState<DocumentState>(() => ({
    src,
    document: null,
    pageNumber: 1,
    loading: true,
    error: '',
  }))
  const activeState: DocumentState =
    documentState.src === src
      ? documentState
      : { src, document: null, pageNumber: 1, loading: true, error: '' }
  const { document, pageNumber, loading, error } = activeState
  const [zoom, setZoom] = useState(1)
  const [hostWidth, setHostWidth] = useState(0)

  function startPan(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType !== 'mouse' || event.button !== 0 || loading || error) return
    const host = event.currentTarget
    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      left: host.scrollLeft,
      top: host.scrollTop,
    }
    host.setPointerCapture?.(event.pointerId)
    setIsDragging(true)
    event.preventDefault()
  }

  function movePan(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    event.currentTarget.scrollLeft = drag.left - (event.clientX - drag.x)
    event.currentTarget.scrollTop = drag.top - (event.clientY - drag.y)
    event.preventDefault()
  }

  function stopPan(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragRef.current?.pointerId !== event.pointerId) return
    dragRef.current = null
    setIsDragging(false)
    if (event.currentTarget.hasPointerCapture?.(event.pointerId))
      event.currentTarget.releasePointerCapture?.(event.pointerId)
  }

  useEffect(() => {
    let disposed = false
    let task: PDFDocumentLoadingTask | undefined
    void import('pdfjs-dist')
      .then((pdfjs) => {
        if (disposed) return null
        pdfjs.GlobalWorkerOptions.workerSrc = workerUrl
        task = pdfjs.getDocument({ url: src, withCredentials: false })
        return task.promise
      })
      .then((pdf) => {
        if (disposed && pdf) {
          void pdf.destroy()
          return
        }
        if (pdf) {
          setDocumentState({
            src,
            document: pdf,
            pageNumber: 1,
            loading: false,
            error: '',
          })
        }
      })
      .catch(() => {
        if (!disposed) {
          setDocumentState({
            src,
            document: null,
            pageNumber: 1,
            loading: false,
            error: 'Không tải được PDF. Hãy kiểm tra quyền truy cập hoặc thử lại.',
          })
        }
      })
    return () => {
      disposed = true
      void task?.destroy()
    }
  }, [src])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const updateWidth = () => setHostWidth(host.clientWidth)
    updateWidth()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateWidth)
      return () => window.removeEventListener('resize', updateWidth)
    }
    const observer = new ResizeObserver(updateWidth)
    observer.observe(host)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!document || !canvasRef.current || !hostWidth) return
    let cancelled = false
    let renderTask: RenderTask | undefined
    void document
      .getPage(pageNumber)
      .then((page) => {
        if (cancelled || !canvasRef.current) return
        const baseViewport = page.getViewport({ scale: 1 })
        const scale = Math.min(1, Math.max(0.25, (hostWidth - 24) / baseViewport.width)) * zoom
        const viewport = page.getViewport({ scale })
        const outputScale = Math.min(window.devicePixelRatio || 1, 2)
        const canvas = canvasRef.current
        const context = canvas.getContext('2d')
        if (!context) throw new Error('Canvas is unavailable')
        canvas.width = Math.floor(viewport.width * outputScale)
        canvas.height = Math.floor(viewport.height * outputScale)
        canvas.style.width = `${Math.floor(viewport.width)}px`
        canvas.style.height = `${Math.floor(viewport.height)}px`
        renderTask = page.render({
          canvas,
          canvasContext: context,
          viewport,
          transform: outputScale === 1 ? undefined : [outputScale, 0, 0, outputScale, 0, 0],
        })
        return renderTask.promise
      })
      .catch(() => {
        if (!cancelled) {
          setDocumentState((current) =>
            current.src === src
              ? { ...current, error: 'Không hiển thị được trang PDF này.' }
              : current,
          )
        }
      })
    return () => {
      cancelled = true
      renderTask?.cancel()
    }
  }, [document, hostWidth, pageNumber, src, zoom])

  const pageCount = document?.numPages ?? 0
  return (
    <div className="grid min-w-0 gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border-subtle bg-card-surface p-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="min-h-11 min-w-11 rounded-lg border border-border-subtle disabled:opacity-40"
            aria-label="Trang trước"
            disabled={pageNumber <= 1 || loading || Boolean(error)}
            onClick={() =>
              setDocumentState((current) =>
                current.src === src
                  ? { ...current, pageNumber: Math.max(1, current.pageNumber - 1) }
                  : current,
              )
            }
          >
            <ChevronLeft aria-hidden="true" className="mx-auto size-5" />
          </button>
          <span aria-live="polite" className="min-w-24 text-center text-sm tabular-nums">
            {pageCount ? `${pageNumber} / ${pageCount}` : '— / —'}
          </span>
          <button
            type="button"
            className="min-h-11 min-w-11 rounded-lg border border-border-subtle disabled:opacity-40"
            aria-label="Trang sau"
            disabled={pageNumber >= pageCount || loading || Boolean(error)}
            onClick={() =>
              setDocumentState((current) =>
                current.src === src
                  ? { ...current, pageNumber: Math.min(pageCount, current.pageNumber + 1) }
                  : current,
              )
            }
          >
            <ChevronRight aria-hidden="true" className="mx-auto size-5" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="min-h-11 min-w-11 rounded-lg border border-border-subtle disabled:opacity-40"
            aria-label="Thu nhỏ tài liệu"
            disabled={zoom <= 0.7}
            onClick={() =>
              setZoom((value) => Math.max(0.7, Math.round((value - 0.15) * 100) / 100))
            }
          >
            <Minus aria-hidden="true" className="mx-auto size-4" />
          </button>
          <span className="min-w-12 text-center text-sm tabular-nums">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border-subtle px-3 text-sm font-medium disabled:opacity-40"
            aria-label="Vừa khung"
            title="Đưa tài liệu vừa khung"
            disabled={zoom === 1}
            onClick={() => setZoom(1)}
          >
            <Scan aria-hidden="true" className="size-4" />
            <span className="hidden sm:inline">Vừa khung</span>
          </button>
          <button
            type="button"
            className="min-h-11 min-w-11 rounded-lg border border-border-subtle disabled:opacity-40"
            aria-label="Phóng to tài liệu"
            disabled={zoom >= 2}
            onClick={() => setZoom((value) => Math.min(2, Math.round((value + 0.15) * 100) / 100))}
          >
            <Plus aria-hidden="true" className="mx-auto size-4" />
          </button>
        </div>
      </div>
      <div
        ref={hostRef}
        className={`min-h-80 max-h-[min(72vh,52rem)] min-w-0 overflow-auto overscroll-contain rounded-xl border border-border-subtle bg-surface-muted ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        aria-label={`Trình xem PDF: ${title}`}
        role="region"
        tabIndex={0}
        aria-describedby={instructionsId}
        onPointerDown={startPan}
        onPointerMove={movePan}
        onPointerUp={stopPan}
        onPointerCancel={stopPan}
        onLostPointerCapture={stopPan}
      >
        <div className="grid min-h-full w-max min-w-full place-items-start justify-center p-3">
          {loading ? (
            <p role="status" className="p-6 text-sm text-ink-secondary">
              Đang tải tài liệu PDF
            </p>
          ) : error ? (
            <p role="alert" className="p-6 text-sm text-danger-foreground">
              {error}
            </p>
          ) : (
            <canvas
              ref={canvasRef}
              aria-label={`${title}, trang ${pageNumber}`}
              className="block max-w-none select-none rounded-sm bg-white shadow-md ring-1 ring-border-subtle"
              draggable={false}
            />
          )}
        </div>
      </div>
      <p id={instructionsId} className="text-xs text-ink-muted">
        Kéo chuột để di chuyển trang khi phóng to. Tài liệu hiển thị trong trình xem; việc ẩn nút
        tải xuống không ngăn chụp màn hình hoặc sao chép nội dung.
      </p>
    </div>
  )
}
