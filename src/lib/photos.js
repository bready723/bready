// Where a bakery photo actually lives.
//
// Until now a photo was a data: URL sitting inside the bakery row — the whole
// JPEG, base64'd, in a database column and in localStorage. That is why the
// storage warning exists at all: a handful of phone photos fills a 5MB origin,
// and every push shipped the picture again whether or not it had changed.
//
// A photo now goes to the `photos` bucket, one folder per user, and the row
// keeps only the path to it. Pure functions here; the upload itself is in
// cloud.js, behind the same adapter seam as everything else.

export const PHOTO_BUCKET = 'photos'

export const isDataUrl = (v) => typeof v === 'string' && v.startsWith('data:')
export const isHttpUrl = (v) => typeof v === 'string' && /^https?:\/\//.test(v)

/**
 * True for the thing we store in `photo_url` once a photo has moved: a bucket
 * path like "user-id/bakery-id.jpg". Anything with a scheme is not one.
 */
export const isStoragePath = (v) =>
  typeof v === 'string' && v.length > 0 && !isDataUrl(v) && !isHttpUrl(v) && !v.startsWith('blob:')

const EXT = {
  'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png',
  'image/webp': 'webp', 'image/heic': 'heic', 'image/gif': 'gif',
}

/** Split a data: URL into the bytes and the type, or null if it is not one. */
export function decodeDataUrl(value) {
  if (!isDataUrl(value)) return null
  const comma = value.indexOf(',')
  if (comma === -1) return null
  const header = value.slice(5, comma)
  const isBase64 = header.endsWith(';base64')
  const contentType = (isBase64 ? header.slice(0, -7) : header) || 'application/octet-stream'
  const payload = value.slice(comma + 1)
  try {
    const binary = isBase64 ? atob(payload) : decodeURIComponent(payload)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
    return { bytes, contentType, ext: EXT[contentType] || 'bin' }
  } catch (e) {
    return null
  }
}

/**
 * One stable path per bakery. Stable matters: re-uploading overwrites the same
 * object instead of littering the bucket with a new file per edit.
 */
export function photoObjectPath(userId, bakeryId, contentType) {
  return `${userId}/${bakeryId}.${EXT[contentType] || 'bin'}`
}

/** Which bakeries are still carrying their photo inline, and where each goes. */
export function planPhotoUploads(state, userId) {
  const jobs = []
  for (const b of state.bakeries || []) {
    if (b.photoPath) continue // already moved
    const decoded = decodeDataUrl(b.photo)
    if (!decoded) continue
    jobs.push({ bakeryId: b.id, path: photoObjectPath(userId, b.id, decoded.contentType), ...decoded })
  }
  return jobs
}

/**
 * Record where the photos went. The data: URL stays in local state so the app
 * still shows pictures offline; only what gets *sent* changes.
 */
export function applyUploads(state, uploaded) {
  if (!uploaded.length) return state
  const byId = new Map(uploaded.map((u) => [u.bakeryId, u.path]))
  return {
    ...state,
    bakeries: (state.bakeries || []).map((b) =>
      byId.has(b.id) ? { ...b, photoPath: byId.get(b.id) } : b,
    ),
  }
}

/** Bakeries whose picture lives in the bucket and is not on screen yet. */
export function unresolvedPhotos(state) {
  return (state.bakeries || [])
    .filter((b) => isStoragePath(b.photoPath) && !b.photo)
    .map((b) => ({ bakeryId: b.id, path: b.photoPath }))
}

/** Hang resolved links on the bakeries they belong to. */
export function applyResolved(state, resolved) {
  if (!resolved.length) return state
  const byId = new Map(resolved.map((r) => [r.bakeryId, r.url]))
  return {
    ...state,
    bakeries: (state.bakeries || []).map((b) =>
      byId.has(b.id) && byId.get(b.id) ? { ...b, photo: byId.get(b.id) } : b,
    ),
  }
}

/**
 * Strip links that will not work tomorrow.
 *
 * A bucket link is signed and expires. Saving one to localStorage means the
 * next launch renders a broken image instead of fetching a fresh link — so the
 * path is kept and the link is not.
 */
export function forgetSignedLinks(state) {
  const bakeries = (state.bakeries || []).map((b) =>
    b.photoPath && isHttpUrl(b.photo) ? { ...b, photo: undefined } : b,
  )
  return { ...state, bakeries }
}
