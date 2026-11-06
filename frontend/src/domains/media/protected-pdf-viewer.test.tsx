import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ProtectedPdfViewer } from './protected-pdf-viewer'

const pdfjs = vi.hoisted(() => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: vi.fn(),
}))

vi.mock('pdfjs-dist', () => pdfjs)

afterEach(() => {
  vi.restoreAllMocks()
  pdfjs.getDocument.mockReset()
})

describe('ProtectedPdfViewer', () => {
  it('shows and navigates two pages together on a tablet or laptop width', async () => {
    const user = userEvent.setup()
    const getPage = vi.fn(async () => ({
      getViewport: ({ scale }: { scale: number }) => ({
        width: 600 * scale,
        height: 800 * scale,
      }),
      render: () => ({ promise: Promise.resolve(), cancel: vi.fn() }),
    }))
    const document = { numPages: 4, getPage }
    const task = { promise: Promise.resolve(document), destroy: vi.fn() }
    pdfjs.getDocument.mockReturnValue(task)
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      {} as CanvasRenderingContext2D,
    )
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(680)

    const { container } = render(
      <ProtectedPdfViewer src="https://media.example.test/signed.pdf" title="Bài tập" />,
    )

    await waitFor(() =>
      expect(pdfjs.getDocument).toHaveBeenCalledWith({
        url: 'https://media.example.test/signed.pdf',
        withCredentials: false,
      }),
    )
    await waitFor(() => expect(screen.getByText('1–2 / 4')).toBeVisible())
    await waitFor(() => expect(getPage).toHaveBeenCalledWith(1))
    await waitFor(() => expect(getPage).toHaveBeenCalledWith(2))
    expect(container.querySelectorAll('canvas')).toHaveLength(2)
    expect(screen.queryByRole('link', { name: /tải|download/i })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Trang sau' }))
    await waitFor(() => expect(screen.getByText('3–4 / 4')).toBeVisible())
    await waitFor(() => expect(getPage).toHaveBeenCalledWith(3))
    await waitFor(() => expect(getPage).toHaveBeenCalledWith(4))
    expect(container.querySelectorAll('canvas')).toHaveLength(2)
  })

  it('keeps one page at a time on a mobile-width viewer', async () => {
    const user = userEvent.setup()
    const getPage = vi.fn(async () => ({
      getViewport: ({ scale }: { scale: number }) => ({
        width: 600 * scale,
        height: 800 * scale,
      }),
      render: () => ({ promise: Promise.resolve(), cancel: vi.fn() }),
    }))
    pdfjs.getDocument.mockReturnValue({
      promise: Promise.resolve({ numPages: 2, getPage }),
      destroy: vi.fn(),
    })
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      {} as CanvasRenderingContext2D,
    )
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(390)

    const { container } = render(
      <ProtectedPdfViewer src="https://media.example.test/signed.pdf" title="Bài tập" />,
    )

    await waitFor(() => expect(screen.getByText('1 / 2')).toBeVisible())
    await waitFor(() => expect(getPage).toHaveBeenCalledWith(1))
    expect(container.querySelectorAll('canvas')).toHaveLength(1)

    await user.click(screen.getByRole('button', { name: 'Trang sau' }))
    await waitFor(() => expect(screen.getByText('2 / 2')).toBeVisible())
    await waitFor(() => expect(getPage).toHaveBeenCalledWith(2))
    expect(container.querySelectorAll('canvas')).toHaveLength(1)
  })

  it('shows a clear state when the authorized document cannot be fetched', async () => {
    pdfjs.getDocument.mockReturnValue({
      promise: Promise.reject(new Error('expired signed url')),
      destroy: vi.fn(),
    })

    render(<ProtectedPdfViewer src="https://media.example.test/expired.pdf" title="Bài tập" />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Không tải được PDF. Hãy kiểm tra quyền truy cập hoặc thử lại.',
    )
  })

  it('supports mouse drag panning and resets zoom to fit the viewer', async () => {
    const user = userEvent.setup()
    const getPage = vi.fn(async () => ({
      getViewport: ({ scale }: { scale: number }) => ({
        width: 900 * scale,
        height: 1200 * scale,
      }),
      render: () => ({ promise: Promise.resolve(), cancel: vi.fn() }),
    }))
    const task = { promise: Promise.resolve({ numPages: 1, getPage }), destroy: vi.fn() }
    pdfjs.getDocument.mockReturnValue(task)
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      {} as CanvasRenderingContext2D,
    )
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(640)

    render(<ProtectedPdfViewer src="https://media.example.test/signed.pdf" title="Bài tập" />)

    const viewer = await screen.findByRole('region', { name: 'Trình xem PDF: Bài tập' })
    await waitFor(() => expect(screen.getByText('1 / 1')).toBeVisible())
    Object.defineProperty(viewer, 'scrollLeft', { configurable: true, writable: true, value: 120 })
    Object.defineProperty(viewer, 'scrollTop', { configurable: true, writable: true, value: 200 })

    fireEvent.pointerDown(viewer, {
      pointerId: 4,
      pointerType: 'mouse',
      button: 0,
      clientX: 300,
      clientY: 300,
    })
    fireEvent.pointerMove(viewer, {
      pointerId: 4,
      pointerType: 'mouse',
      clientX: 250,
      clientY: 220,
    })

    expect(viewer.scrollLeft).toBe(170)
    expect(viewer.scrollTop).toBe(280)

    fireEvent.pointerUp(viewer, { pointerId: 4, pointerType: 'mouse', button: 0 })
    await user.click(screen.getByRole('button', { name: 'Phóng to tài liệu' }))
    expect(screen.getByText('115%')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Vừa khung' }))
    expect(screen.getByText('100%')).toBeVisible()
  })
})
