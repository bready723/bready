import { describe, it, expect } from 'vitest'
import {
  isDataUrl, isHttpUrl, isStoragePath, decodeDataUrl, photoObjectPath,
  planPhotoUploads, applyUploads, unresolvedPhotos, applyResolved, forgetSignedLinks,
} from './photos.js'

// A one-pixel JPEG is enough to prove the decoding; the bytes are real.
const PIXEL = 'data:image/jpeg;base64,/9j/4AAQSkZJRg=='

describe('telling the three kinds of photo apart', () => {
  it('knows a data URL', () => {
    expect(isDataUrl(PIXEL)).toBe(true)
    expect(isDataUrl('u1/b1.jpg')).toBe(false)
  })

  it('knows a bucket path from a link and from a picture', () => {
    expect(isStoragePath('u1/b1.jpg')).toBe(true)
    expect(isStoragePath(PIXEL)).toBe(false)
    expect(isStoragePath('https://x.supabase.co/storage/v1/object/sign/...')).toBe(false)
    expect(isStoragePath('')).toBe(false)
    expect(isStoragePath(undefined)).toBe(false)
    expect(isHttpUrl('https://x/y')).toBe(true)
  })
})

describe('decodeDataUrl', () => {
  it('gives back the bytes and the type', () => {
    const out = decodeDataUrl(PIXEL)
    expect(out.contentType).toBe('image/jpeg')
    expect(out.ext).toBe('jpg')
    expect(out.bytes).toBeInstanceOf(Uint8Array)
    expect(out.bytes.length).toBeGreaterThan(4)
    expect(out.bytes[0]).toBe(0xff) // JPEG magic number, so the bytes are real
    expect(out.bytes[1]).toBe(0xd8)
  })

  it('returns null rather than throwing on anything else', () => {
    expect(decodeDataUrl('u1/b1.jpg')).toBeNull()
    expect(decodeDataUrl(undefined)).toBeNull()
    expect(decodeDataUrl('data:image/jpeg;base64')).toBeNull()
    expect(decodeDataUrl('data:image/jpeg;base64,!!!not base64!!!')).toBeNull()
  })
})

describe('photoObjectPath', () => {
  it('is one stable path per bakery, so re-uploading overwrites', () => {
    expect(photoObjectPath('u1', 'b1', 'image/jpeg')).toBe('u1/b1.jpg')
    expect(photoObjectPath('u1', 'b1', 'image/jpeg')).toBe(photoObjectPath('u1', 'b1', 'image/jpeg'))
    expect(photoObjectPath('u1', 'b1', 'image/png')).toBe('u1/b1.png')
  })

  it('starts with the user id, which is what the bucket policy checks', () => {
    expect(photoObjectPath('u1', 'b1', 'image/jpeg').split('/')[0]).toBe('u1')
  })
})

describe('planPhotoUploads', () => {
  const state = {
    bakeries: [
      { id: 'b1', name: 'has a photo', photo: PIXEL },
      { id: 'b2', name: 'no photo' },
      { id: 'b3', name: 'already moved', photo: PIXEL, photoPath: 'u1/b3.jpg' },
    ],
  }

  it('picks only the ones still carrying the picture inline', () => {
    const jobs = planPhotoUploads(state, 'u1')
    expect(jobs.map((j) => j.bakeryId)).toEqual(['b1'])
    expect(jobs[0].path).toBe('u1/b1.jpg')
    expect(jobs[0].contentType).toBe('image/jpeg')
  })

  it('plans nothing once everything has moved', () => {
    expect(planPhotoUploads(applyUploads(state, [{ bakeryId: 'b1', path: 'u1/b1.jpg' }]), 'u1')).toEqual([])
  })

  it('leaves the picture on screen after the move', () => {
    const after = applyUploads(state, [{ bakeryId: 'b1', path: 'u1/b1.jpg' }])
    expect(after.bakeries[0].photo).toBe(PIXEL)
    expect(after.bakeries[0].photoPath).toBe('u1/b1.jpg')
  })
})

describe('showing a photo that lives in the bucket', () => {
  const downloaded = { bakeries: [
    { id: 'b1', photoPath: 'u1/b1.jpg' },
    { id: 'b2', photoPath: 'u1/b2.jpg', photo: 'https://signed/b2' },
    { id: 'b3' },
  ] }

  it('asks for a link only for the ones with nothing to show', () => {
    expect(unresolvedPhotos(downloaded)).toEqual([{ bakeryId: 'b1', path: 'u1/b1.jpg' }])
  })

  it('hangs the link on the bakery', () => {
    const after = applyResolved(downloaded, [{ bakeryId: 'b1', url: 'https://signed/b1' }])
    expect(after.bakeries[0].photo).toBe('https://signed/b1')
  })

  it('ignores a link that could not be made', () => {
    const after = applyResolved(downloaded, [{ bakeryId: 'b1', url: null }])
    expect(after.bakeries[0].photo).toBeUndefined()
  })

  it('never saves a signed link, which would be a broken image tomorrow', () => {
    const saved = forgetSignedLinks(applyResolved(downloaded, [{ bakeryId: 'b1', url: 'https://signed/b1' }]))
    expect(saved.bakeries[0].photo).toBeUndefined()
    expect(saved.bakeries[0].photoPath).toBe('u1/b1.jpg')
    expect(saved.bakeries[1].photo).toBeUndefined()
  })

  it('keeps a photo taken on this device, which does not expire', () => {
    const local = { bakeries: [{ id: 'b1', photo: PIXEL }, { id: 'b2', photo: PIXEL, photoPath: 'u1/b2.jpg' }] }
    const saved = forgetSignedLinks(local)
    expect(saved.bakeries[0].photo).toBe(PIXEL)
    expect(saved.bakeries[1].photo).toBe(PIXEL)
  })
})
