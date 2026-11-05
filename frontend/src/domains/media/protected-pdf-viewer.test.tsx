import { render, screen, waitFor } from '@testing-library/react'
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
  it('loads an authorized PDF, renders pages and supports page navigation', async () => {
    const user = userEvent.setup()
    const getPage = vi.fn(async () => ({
      getViewport: ({ scale }: { scale: number }) => ({
        width: 600 * scale,
        height: 800 * scale,
      }),
      render: () => ({ promise: Promise.resolve(), cancel: vi.fn() }),
    }))
    const document = { numPages: 2, getPage }
    const task = { promise: Promise.resolve(document), destroy: vi.fn() }
    pdfjs.getDocument.mockReturnValue(task)
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      {} as CanvasRenderingContext2D,
    )
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(640)

    render(<ProtectedPdfViewer src="https://media.example.test/signed.pdf" title="Bài tập" />)

    await waitFor(() =>
      expect(pdfjs.getDocument).toHaveBeenCalledWith({
        url: 'https://media.example.test/signed.pdf',
        withCredentials: false,
      }),
    )
    await waitFor(() => expect(screen.getByText('1 / 2')).toBeVisible())
    await waitFor(() => expect(getPage).toHaveBeenCalledWith(1))
    expect(screen.queryByRole('link', { name: /tải|download/i })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Trang sau' }))
    await waitFor(() => expect(screen.getByText('2 / 2')).toBeVisible())
    await waitFor(() => expect(getPage).toHaveBeenCalledWith(2))
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
})
