import JSZip from 'jszip'
import type { FrameItem, FrameMetadata } from './types'
import { PXIMG_BASE } from './config'

async function getUgoiraMetadata(id: string) {
  try {
    const resp = await fetch(`https://hibiapi.cocomi.eu.org/api/pixiv-web-api/illustUgoiraMeta?args=[${id}]`)
    const json = await resp.json()

    return {
      zipUrl: json.originalSrc.replace('i.pximg.net', PXIMG_BASE) as string,
      frames: json.frames as FrameItem[],
    }
  } catch (error) {
    return {
      zipUrl: null,
      frames: []
    }
  }
}

export async function getUgoiraFrameBlobs(id: string, setFFMessage: (v: string) => void): Promise<FrameMetadata> {
  const emptyRes = { frames: [], frameBlobs: {} }
  const { zipUrl, frames } = await getUgoiraMetadata(id)
  if (zipUrl == null) return emptyRes


  // const zipBlob = await (await fetch(zipUrl)).blob()

  // Step 1：启动 fetch，并获得一个 reader
  const response = await fetch(zipUrl)
  if (!response.ok || !response.body) return emptyRes
  const reader = response.body.getReader()
  // Step 2：获得总长度（length）
  const contentLength = +(response.headers.get('Content-Length') || 0)
  // Step 3：读取数据
  let receivedLength = 0 // 当前接收到了这么多字节
  const chunks = [] // 接收到的二进制块的数组（包括 body）
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    receivedLength += value.length
    setFFMessage(`加载动图 zip 中：${(receivedLength / contentLength * 100).toFixed(2)}%`)
  }
  const zipBlob = new Blob(chunks)

  const jszipInst = new JSZip()
  const zip = await jszipInst.loadAsync(zipBlob)
  const frameBlobs: Record<string, Blob> = {}
  await Promise.all(Object.keys(zip.files).map(async name => {
    const blob = await zip.file(name)?.async('blob')
    if (blob) frameBlobs[name] = blob
  }))
  return { frames, frameBlobs }
}
