import JSZip from 'jszip'
import type { FrameItem, FrameMetadata } from './types'

async function getUgoiraMetadata(id: string) {
  try {
    const resp = await fetch(`${import.meta.env.VITE_APP_HIBIAPI_BASE}/ugoira_metadata?id=${id}`)
    const json = await resp.json()

    return {
      zipUrl: json.ugoira_metadata.zip_urls.medium.replace('_ugoira600x600', '_ugoira1920x1080').replace('i.pximg.net', 'pximg.cocomi.eu.org') as string,
      frames: json.ugoira_metadata.frames as FrameItem[],
    }
  } catch (error) {
    return {
      zipUrl: null,
      frames: []
    }
  }
}

export async function getUgoiraFrameBlobs(id: string): Promise<FrameMetadata> {
  const { zipUrl, frames } = await getUgoiraMetadata(id)
  if (zipUrl == null) {
    return { frames: [], frameBlobs: {} }
  }
  const zipBlob = await (await fetch(zipUrl)).blob()
  const jszipInst = new JSZip()
  const zip = await jszipInst.loadAsync(zipBlob)
  const frameBlobs: Record<string, Blob> = {}
  await Promise.all(Object.keys(zip.files).map(async name => {
    const blob = await zip.file(name)?.async('blob')
    if (blob) frameBlobs[name] = blob
  }))
  return { frames, frameBlobs }
}
