# Student PDF viewer and audio player

## PDF

The learner PDF component uses `pdfjs-dist` and its bundled Vite worker. It renders one page at a time and provides accessible previous/next and zoom controls. It does not render browser PDF toolbar controls or a direct download/print button. Temporary access URLs come from the authenticated `/learn/media-access` API after course/lesson/exercise entitlement and association checks.

Hiding controls is a UI measure, not DRM. A learner with access can still capture the display or inspect bytes delivered to their browser. The viewer must not be described as copy-proof.

## Audio

Exercise question audio uses the browser `<audio controls>` player with `preload="none"`. Access is signed per asset through the same entitlement/association gate; Cloudinary audio uses resource type `video` and authenticated delivery. Quiz scoring behavior is unchanged.

## Live constraints

The viewer makes cross-origin reads to the protected media URL. Verify Cloudinary CORS, `Range`/206 responses, worker behavior, audio MIME and seeking with the actual account and deployed origin. Those checks were not possible without Cloudinary credentials and an authorized live asset. See [LIVE-VERIFICATION.md](./LIVE-VERIFICATION.md).
