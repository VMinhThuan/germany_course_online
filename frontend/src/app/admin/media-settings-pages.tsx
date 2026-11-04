import { useEffect, useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileUp, Unlink } from 'lucide-react'
import { adminRepository } from '@/data/api/admin-repository'
import type { ApiAdminSiteSettings, ApiAssetAssociation } from '@/lib/api/types'
import { formatDateTimeInTimezone } from '@/shared/lib/format'
import { Button, EmptyState, Pagination } from '@/shared/ui'
import {
  AdminCard,
  AdminField,
  AdminFeedback,
  AdminLoadError,
  AdminLoading,
  AdminSelect,
  AdminTextArea,
  useAdminMutation,
} from './shared'

export function AdminMediaPage() {
  const [search, setSearch] = useState('')
  const [mediaType, setMediaType] = useState('')
  const [page, setPage] = useState(1)
  const assets = useQuery({
    queryKey: ['admin', 'media', search, mediaType, page],
    queryFn: () =>
      adminRepository.listMedia({
        page,
        pageSize: 20,
        ...(search ? { q: search } : {}),
        ...(mediaType ? { mediaType } : {}),
      }),
    retry: false,
  })
  const deleteAsset = useAdminMutation((assetId: string) => adminRepository.deleteMedia(assetId))
  const linkLesson = useAdminMutation(
    ({
      lessonId,
      assetId,
      input,
    }: {
      lessonId: string
      assetId: string
      input: { assetRole: string; title: string | null; sortOrder: number }
    }) => adminRepository.linkLessonAsset(lessonId, assetId, input),
  )
  const linkExercise = useAdminMutation(
    ({
      exerciseId,
      assetId,
      input,
    }: {
      exerciseId: string
      assetId: string
      input: { assetRole: string; title: string | null; sortOrder: number }
    }) => adminRepository.linkExerciseAsset(exerciseId, assetId, input),
  )
  const unlinkLesson = useAdminMutation(
    ({ lessonId, assetId, role }: { lessonId: string; assetId: string; role: string }) =>
      adminRepository.unlinkLessonAsset(lessonId, assetId, role),
  )
  const unlinkExercise = useAdminMutation(
    ({ exerciseId, assetId, role }: { exerciseId: string; assetId: string; role: string }) =>
      adminRepository.unlinkExerciseAsset(exerciseId, assetId, role),
  )
  const [file, setFile] = useState<File | null>(null)
  const [visibility, setVisibility] = useState<'PUBLIC' | 'ENROLLED'>('ENROLLED')
  const [progress, setProgress] = useState<number | null>(null)
  const [uploadError, setUploadError] = useState<unknown>()
  const [uploadSuccess, setUploadSuccess] = useState('')
  const [ownerType, setOwnerType] = useState<'lesson' | 'exercise'>('lesson')
  const [ownerId, setOwnerId] = useState('')
  const [assetId, setAssetId] = useState('')
  const [assetRole, setAssetRole] = useState('LECTURE_VIDEO')
  const [title, setTitle] = useState('')
  const [sortOrder, setSortOrder] = useState('0')
  const [associationNotice, setAssociationNotice] = useState('')
  const associations = useQuery({
    queryKey: ['admin', 'asset-associations', ownerType, ownerId],
    queryFn: () =>
      ownerType === 'lesson'
        ? adminRepository.listLessonAssets(ownerId)
        : adminRepository.listExerciseAssets(ownerId),
    enabled: Boolean(ownerId),
    retry: false,
  })

  async function upload(event: FormEvent) {
    event.preventDefault()
    setUploadError(undefined)
    setUploadSuccess('')
    setProgress(0)
    if (!file) {
      setUploadError(new Error('Chọn tệp trước khi tải lên.'))
      return
    }
    const type = file.type.startsWith('image/')
      ? 'IMAGE'
      : file.type.startsWith('video/')
        ? 'VIDEO'
        : file.type.startsWith('audio/')
          ? 'AUDIO'
          : file.type === 'application/pdf'
            ? 'PDF'
            : null
    if (!type) {
      setUploadError(
        new Error('Chỉ hỗ trợ ảnh, video, audio hoặc PDF theo MIME type của trình duyệt.'),
      )
      return
    }
    try {
      const intent = await adminRepository.createUploadIntent({
        originalName: file.name,
        mediaType: type,
        mimeType: file.type,
        fileSize: file.size,
        visibility,
      })
      await adminRepository.uploadFile(intent.uploadUrl, file, setProgress)
      await adminRepository.completeUpload(intent.assetId)
      setUploadSuccess('Backend đã xác minh tệp và hoàn tất tài sản media.')
      setFile(null)
      await assets.refetch()
    } catch (error) {
      setUploadError(error)
      setUploadSuccess('')
    } finally {
      setProgress(null)
    }
  }
  async function removeAsset(id: string) {
    if (!window.confirm('Xóa media này? Backend sẽ kiểm tra các liên kết trước khi xóa.')) return
    try {
      await deleteAsset.mutateAsync(id)
    } catch {
      /* API error below */
    }
  }
  async function attach(event: FormEvent) {
    event.preventDefault()
    setAssociationNotice('')
    const input = { assetRole, title: title.trim() || null, sortOrder: Number(sortOrder) }
    try {
      if (ownerType === 'lesson')
        await linkLesson.mutateAsync({ lessonId: ownerId.trim(), assetId: assetId.trim(), input })
      else
        await linkExercise.mutateAsync({
          exerciseId: ownerId.trim(),
          assetId: assetId.trim(),
          input,
        })
      setAssociationNotice('Đã tạo liên kết qua API.')
      await associations.refetch()
    } catch {
      /* API errors shown */
    }
  }
  async function detach(item: ApiAssetAssociation) {
    if (
      !window.confirm(
        `Gỡ liên kết ${item.assetRole} khỏi nội dung này? Tệp vẫn còn trong thư viện.`,
      )
    )
      return
    try {
      if (ownerType === 'lesson')
        await unlinkLesson.mutateAsync({
          lessonId: ownerId,
          assetId: item.assetId,
          role: item.assetRole,
        })
      else
        await unlinkExercise.mutateAsync({
          exerciseId: ownerId,
          assetId: item.assetId,
          role: item.assetRole,
        })
      await associations.refetch()
    } catch {
      /* API error below */
    }
  }
  const mutationError =
    linkLesson.error ?? linkExercise.error ?? unlinkLesson.error ?? unlinkExercise.error
  const roles =
    ownerType === 'lesson'
      ? ['LECTURE_VIDEO', 'LECTURE_PDF', 'ATTACHMENT']
      : ['QUESTION_PDF', 'QUESTION_AUDIO', 'ANSWER_PDF', 'SOLUTION_VIDEO']

  return (
    <div className="grid gap-5">
      <div className="grid gap-5 xl:grid-cols-2">
        <AdminCard
          title="Thư viện media"
          description="Chỉ tài sản đã được backend xác minh mới xuất hiện. Storage key và credential không được trả về."
        >
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
            <AdminField
              label="Tìm kiếm"
              value={search}
              onChange={(value) => {
                setSearch(value)
                setPage(1)
              }}
              placeholder="Tên tệp"
            />
            <AdminSelect
              label="Loại media"
              value={mediaType}
              onChange={(value) => {
                setMediaType(value)
                setPage(1)
              }}
              options={[
                { value: '', label: 'Tất cả' },
                ...['IMAGE', 'VIDEO', 'AUDIO', 'PDF'].map((value) => ({ value, label: value })),
              ]}
            />
          </div>
          {assets.isPending ? (
            <AdminLoading />
          ) : assets.isError ? (
            <AdminLoadError error={assets.error} retry={() => void assets.refetch()} />
          ) : assets.data?.items.length ? (
            <div className="grid gap-2">
              {assets.data.items.map((asset) => (
                <div
                  key={asset.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-subtle bg-white p-3"
                >
                  <span className="min-w-0">
                    <strong className="block truncate">{asset.originalName}</strong>
                    <span className="text-xs text-ink-secondary">
                      {asset.mediaType} · {asset.mimeType} ·{' '}
                      {(asset.fileSize / 1024 / 1024).toFixed(2)} MB · {asset.visibility}
                    </span>
                    <code className="mt-1 block break-all text-[11px] text-ink-muted">
                      Asset ID: {asset.id}
                    </code>
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    loading={deleteAsset.isPending}
                    onClick={() => void removeAsset(asset.id)}
                  >
                    Xóa
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Chưa có media"
              description="Tải tệp lên nếu dịch vụ lưu trữ đã được cấu hình."
            />
          )}
          {assets.data && <p className="text-xs text-ink-muted">Tổng số: {assets.data.total}</p>}
          {assets.data && assets.data.total > assets.data.pageSize && (
            <Pagination
              page={assets.data.page}
              pages={Math.ceil(assets.data.total / assets.data.pageSize)}
              onPageChange={setPage}
            />
          )}
        </AdminCard>
        <AdminCard
          title="Tải media lên"
          description="Quy trình gồm upload intent, upload trực tiếp và xác minh hoàn tất từ backend. Tài sản không READY chỉ vì trình duyệt báo tải xong."
        >
          <form className="grid gap-3" onSubmit={(event) => void upload(event)}>
            <label className="grid gap-1.5 text-sm font-semibold">
              Tệp
              <input
                className="min-h-11 w-full rounded-xl border border-border-subtle bg-white p-2 font-normal"
                type="file"
                accept="image/*,video/*,audio/*,application/pdf"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                required
              />
            </label>
            <AdminSelect
              label="Phạm vi"
              value={visibility}
              onChange={(value) => setVisibility(value as typeof visibility)}
              options={[
                { value: 'ENROLLED', label: 'Học viên có quyền' },
                { value: 'PUBLIC', label: 'Công khai' },
              ]}
            />
            {progress !== null && (
              <div role="status" className="text-sm">
                Đang tải lên {progress}%{' '}
                <progress className="mt-2 block w-full" value={progress} max={100} />
              </div>
            )}
            <AdminFeedback error={uploadError} success={uploadSuccess} />
            <Button
              type="submit"
              loading={progress !== null}
              startIcon={<FileUp aria-hidden="true" className="size-4" />}
            >
              Tải lên và xác minh
            </Button>
          </form>
          <p className="text-xs leading-5 text-ink-secondary">
            Nếu provider chưa cấu hình, API sẽ trả lỗi; không tạo URL phát giả và không đánh dấu
            READY.
          </p>
        </AdminCard>
      </div>
      <AdminCard
        title="Liên kết asset với nội dung"
        description="API xác minh loại tài sản và vai trò phù hợp cho Lesson hoặc Exercise."
      >
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <form className="grid content-start gap-3" onSubmit={(event) => void attach(event)}>
            <div className="grid gap-3 sm:grid-cols-2">
              <AdminSelect
                label="Loại nội dung"
                value={ownerType}
                onChange={(value) => {
                  setOwnerType(value as typeof ownerType)
                  setAssetRole(value === 'lesson' ? 'LECTURE_VIDEO' : 'QUESTION_PDF')
                }}
                options={[
                  { value: 'lesson', label: 'Lesson' },
                  { value: 'exercise', label: 'Exercise' },
                ]}
              />
              <AdminField
                label="ID nội dung"
                value={ownerId}
                onChange={setOwnerId}
                required
                placeholder={ownerType === 'lesson' ? 'Lesson ID' : 'Exercise ID'}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <AdminField
                label="Asset ID"
                value={assetId}
                onChange={setAssetId}
                required
                placeholder="ID từ thư viện bên trái"
              />
              <AdminSelect
                label="Vai trò asset"
                value={assetRole}
                onChange={setAssetRole}
                options={roles.map((value) => ({ value, label: value }))}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <AdminField label="Tiêu đề hiển thị" value={title} onChange={setTitle} />
              <AdminField
                label="Thứ tự"
                value={sortOrder}
                onChange={setSortOrder}
                type="number"
                min={0}
              />
            </div>
            <Button
              type="submit"
              disabled={!ownerId.trim() || !assetId.trim()}
              loading={linkLesson.isPending || linkExercise.isPending}
            >
              Tạo liên kết
            </Button>
            <AdminFeedback error={mutationError} success={associationNotice} />
          </form>
          <div className="grid content-start gap-3">
            <h3 className="font-semibold">Liên kết hiện tại</h3>
            {!ownerId.trim() ? (
              <p className="text-sm text-ink-secondary">
                Nhập Lesson ID hoặc Exercise ID để tải liên kết đã lưu.
              </p>
            ) : associations.isPending ? (
              <AdminLoading />
            ) : associations.isError ? (
              <AdminLoadError
                error={associations.error}
                retry={() => void associations.refetch()}
              />
            ) : associations.data?.items.length ? (
              <div className="grid gap-2">
                {associations.data.items.map((item) => (
                  <div
                    key={`${item.assetId}-${item.assetRole}`}
                    className="flex items-start justify-between gap-3 rounded-xl border border-border-subtle bg-white p-3"
                  >
                    <span>
                      <strong>{item.title ?? item.media.originalName}</strong>
                      <span className="mt-1 block text-xs text-ink-secondary">
                        {item.assetRole} · {item.media.mediaType} · {item.assetId}
                      </span>
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      loading={unlinkLesson.isPending || unlinkExercise.isPending}
                      onClick={() => void detach(item)}
                      startIcon={<Unlink aria-hidden="true" className="size-4" />}
                    >
                      Gỡ
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="Chưa có liên kết" />
            )}
          </div>
        </div>
      </AdminCard>
    </div>
  )
}

export function AdminSettingsPage() {
  const query = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: () => adminRepository.getSiteSettings(),
    retry: false,
  })
  const update = useAdminMutation((input: Record<string, unknown>) =>
    adminRepository.updateSiteSettings(input),
  )
  const [form, setForm] = useState<Partial<ApiAdminSiteSettings>>({})
  const [payment, setPayment] = useState({
    enabled: false,
    bankName: '',
    accountNumber: '',
    accountHolderName: '',
    qrUrl: '',
    transferInstructions: '',
  })
  const [mainSuccess, setMainSuccess] = useState('')
  const [paymentSuccess, setPaymentSuccess] = useState('')
  // The form is initialized from server-owned settings after the query resolves.
  useEffect(() => {
    if (!query.data) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm(query.data)
    const current = query.data.payment
    setPayment({
      enabled: current?.enabled ?? false,
      bankName: current?.bankName ?? '',
      accountNumber: current?.accountNumber ?? '',
      accountHolderName: current?.accountHolderName ?? '',
      qrUrl: current?.qrUrl ?? '',
      transferInstructions: current?.transferInstructions ?? '',
    })
  }, [query.data])
  if (query.isPending) return <AdminLoading />
  if (query.isError || !query.data)
    return (
      <AdminLoadError
        error={query.error ?? new Error('Thiếu cài đặt website.')}
        retry={() => void query.refetch()}
      />
    )
  async function saveMain(event: FormEvent) {
    event.preventDefault()
    setMainSuccess('')
    const input = {
      siteName: form.siteName,
      logoAssetId: form.logoAssetId,
      heroTitle: form.heroTitle,
      heroDescription: form.heroDescription,
      heroAssetId: form.heroAssetId,
      contactEmail: form.contactEmail,
      contactPhone: form.contactPhone,
      facebookUrl: form.facebookUrl,
      zaloUrl: form.zaloUrl,
      footerDescription: form.footerDescription,
    }
    try {
      await update.mutateAsync(input)
      setMainSuccess('Đã lưu nội dung website.')
    } catch {
      /* error shown */
    }
  }
  async function savePayment(event: FormEvent) {
    event.preventDefault()
    setPaymentSuccess('')
    if (!payment.enabled) {
      try {
        await update.mutateAsync({ payment: { enabled: false } })
        setPaymentSuccess('Đã tắt hướng dẫn chuyển khoản.')
      } catch {
        /* error shown */
      }
      return
    }
    const input = {
      payment: {
        enabled: true,
        bankName: payment.bankName.trim(),
        accountNumber: payment.accountNumber.trim(),
        accountHolderName: payment.accountHolderName.trim(),
        qrUrl: payment.qrUrl.trim() || null,
        transferInstructions: payment.transferInstructions.trim(),
      },
    }
    try {
      await update.mutateAsync(input)
      setPaymentSuccess('Đã lưu cấu hình chuyển khoản.')
    } catch {
      /* error shown */
    }
  }
  const set = (key: keyof ApiAdminSiteSettings, value: string) =>
    setForm((old) => ({ ...old, [key]: value }))
  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <AdminCard
        title="Nội dung website"
        description="PATCH chỉ chứa các trường website, không gửi lại khối payment."
      >
        <form className="grid gap-3" onSubmit={(event) => void saveMain(event)}>
          <AdminField
            label="Tên website"
            value={form.siteName ?? ''}
            onChange={(value) => set('siteName', value)}
            required
          />
          <AdminField
            label="Logo Asset ID"
            value={form.logoAssetId ?? ''}
            onChange={(value) => setForm((old) => ({ ...old, logoAssetId: value || null }))}
          />
          <AdminField
            label="Tiêu đề hero"
            value={form.heroTitle ?? ''}
            onChange={(value) => set('heroTitle', value)}
            required
          />
          <AdminTextArea
            label="Mô tả hero"
            value={form.heroDescription ?? ''}
            onChange={(value) => set('heroDescription', value)}
            rows={3}
          />
          <AdminField
            label="Hero Asset ID"
            value={form.heroAssetId ?? ''}
            onChange={(value) => setForm((old) => ({ ...old, heroAssetId: value || null }))}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <AdminField
              label="Email liên hệ"
              value={form.contactEmail ?? ''}
              onChange={(value) => setForm((old) => ({ ...old, contactEmail: value || null }))}
              type="email"
            />
            <AdminField
              label="Điện thoại liên hệ"
              value={form.contactPhone ?? ''}
              onChange={(value) => setForm((old) => ({ ...old, contactPhone: value || null }))}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <AdminField
              label="Facebook URL"
              value={form.facebookUrl ?? ''}
              onChange={(value) => setForm((old) => ({ ...old, facebookUrl: value || null }))}
              type="url"
            />
            <AdminField
              label="Zalo URL"
              value={form.zaloUrl ?? ''}
              onChange={(value) => setForm((old) => ({ ...old, zaloUrl: value || null }))}
              type="url"
            />
          </div>
          <AdminTextArea
            label="Mô tả footer"
            value={form.footerDescription ?? ''}
            onChange={(value) => set('footerDescription', value)}
            rows={3}
          />
          <AdminFeedback error={update.error} success={mainSuccess} />
          <Button type="submit" loading={update.isPending}>
            Lưu nội dung website
          </Button>
        </form>
      </AdminCard>
      <AdminCard
        title="Thanh toán chuyển khoản"
        description="Chỉ hiển thị ngân hàng/QR do Admin cấu hình. QR là ảnh tĩnh, không tự chứa số tiền hoặc mã đơn."
      >
        <form className="grid gap-3" onSubmit={(event) => void savePayment(event)}>
          <label className="flex min-h-11 items-center gap-2 rounded-xl border border-border-subtle bg-white px-3 text-sm">
            <input
              type="checkbox"
              checked={payment.enabled}
              onChange={(event) => setPayment((old) => ({ ...old, enabled: event.target.checked }))}
            />
            Bật hướng dẫn chuyển khoản
          </label>
          <AdminField
            label="Ngân hàng"
            value={payment.bankName}
            onChange={(bankName) => setPayment((old) => ({ ...old, bankName }))}
            required={payment.enabled}
            disabled={!payment.enabled}
          />
          <AdminField
            label="Số tài khoản"
            value={payment.accountNumber}
            onChange={(accountNumber) => setPayment((old) => ({ ...old, accountNumber }))}
            required={payment.enabled}
            disabled={!payment.enabled}
          />
          <AdminField
            label="Chủ tài khoản"
            value={payment.accountHolderName}
            onChange={(accountHolderName) => setPayment((old) => ({ ...old, accountHolderName }))}
            required={payment.enabled}
            disabled={!payment.enabled}
          />
          <AdminField
            label="QR URL HTTPS"
            value={payment.qrUrl}
            onChange={(qrUrl) => setPayment((old) => ({ ...old, qrUrl }))}
            type="url"
            disabled={!payment.enabled}
            placeholder="URL ảnh QR tĩnh"
          />
          <AdminTextArea
            label="Hướng dẫn chuyển khoản"
            value={payment.transferInstructions}
            onChange={(transferInstructions) =>
              setPayment((old) => ({ ...old, transferInstructions }))
            }
            rows={4}
            required={payment.enabled}
          />
          <p className="text-xs leading-5 text-ink-secondary">
            Nếu chưa có cấu hình, checkout sẽ hiển thị trạng thái chưa sẵn sàng thay vì thông tin
            giả.
          </p>
          <AdminFeedback error={update.error} success={paymentSuccess} />
          <Button type="submit" loading={update.isPending}>
            Lưu cài đặt chuyển khoản
          </Button>
        </form>
      </AdminCard>
    </div>
  )
}

export function AdminAuditLogsPage() {
  const [entityType, setEntityType] = useState('')
  const [entityId, setEntityId] = useState('')
  const [actorUserId, setActorUserId] = useState('')
  const [page, setPage] = useState(1)
  const logs = useQuery({
    queryKey: ['admin', 'audit-logs', entityType, entityId, actorUserId, page],
    queryFn: () =>
      adminRepository.listAuditLogs({
        page,
        pageSize: 20,
        ...(entityType ? { entityType } : {}),
        ...(entityId ? { entityId } : {}),
        ...(actorUserId ? { actorUserId } : {}),
      }),
    retry: false,
  })
  return (
    <AdminCard
      title="Nhật ký quản trị"
      description="Chỉ đọc. Lý do điều chỉnh và kết quả thao tác lấy trực tiếp từ audit API."
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <AdminField
          label="Loại đối tượng"
          value={entityType}
          onChange={(value) => {
            setEntityType(value)
            setPage(1)
          }}
        />
        <AdminField
          label="Entity ID"
          value={entityId}
          onChange={(value) => {
            setEntityId(value)
            setPage(1)
          }}
        />
        <AdminField
          label="Actor User ID"
          value={actorUserId}
          onChange={(value) => {
            setActorUserId(value)
            setPage(1)
          }}
        />
      </div>
      {logs.isPending ? (
        <AdminLoading />
      ) : logs.isError ? (
        <AdminLoadError error={logs.error} retry={() => void logs.refetch()} />
      ) : logs.data?.items.length ? (
        <div className="overflow-x-auto rounded-xl border border-border-subtle">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-surface-muted text-xs uppercase text-ink-secondary">
              <tr>
                <th className="p-3">Thời gian</th>
                <th className="p-3">Hành động</th>
                <th className="p-3">Đối tượng</th>
                <th className="p-3">ID</th>
                <th className="p-3">Actor</th>
                <th className="p-3">Trường thay đổi</th>
              </tr>
            </thead>
            <tbody>
              {logs.data.items.map((entry) => (
                <tr key={entry.id} className="border-t border-border-subtle bg-white">
                  <td className="p-3">{formatDateTimeInTimezone(entry.createdAt)}</td>
                  <td className="p-3 font-semibold">{entry.action}</td>
                  <td className="p-3">{entry.entityType}</td>
                  <td className="p-3 font-mono text-xs">{entry.entityId}</td>
                  <td className="p-3 font-mono text-xs">{entry.actorUserId ?? '—'}</td>
                  <td className="p-3">{entry.changedFields.join(', ') || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="Chưa có nhật ký phù hợp" />
      )}
      {logs.data && <p className="text-xs text-ink-muted">Tổng số: {logs.data.total}</p>}
      {logs.data && logs.data.total > logs.data.pageSize && (
        <Pagination
          page={logs.data.page}
          pages={Math.ceil(logs.data.total / logs.data.pageSize)}
          onPageChange={setPage}
        />
      )}
    </AdminCard>
  )
}
