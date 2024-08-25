import { type MutableRefObject, useState } from 'react'
import type { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile } from '@ffmpeg/util'
import type { FrameMetadata } from './types'
import { getUgoiraFrameBlobs } from './api'
import { formatBytes } from './utils'

interface ConvertParams {
  pid: string
  ext?: string
  vfr?: boolean
  ffmpegRef: MutableRefObject<FFmpeg>
  setFFMessage: (v: string) => void
}

export function useConverter() {
  const [imageSrc, setImageSrc] = useState('')
  const [videoSrc, setVideoSrc] = useState('')

  const [extSel, setExtSel] = useState('mp4')
  const [timeUsed, setTimeUsed] = useState(0)
  const [dlSize, setDlSize] = useState('')

  const [metadata, setMetadata] = useState<FrameMetadata>({ frames: [], frameBlobs: {} })

  const fetchMetadata = async (pid: string, setFFMessage: (v: string) => void) => {
    if (!/^\d+$/.test(pid)) {
      alert('ID 请输入数字')
      return
    }
    setFFMessage('')
    setTimeUsed(0)
    setDlSize('')
    if (videoSrc) {
      URL.revokeObjectURL(videoSrc)
      setVideoSrc('')
    }
    if (imageSrc) {
      URL.revokeObjectURL(imageSrc)
      setImageSrc('')
    }
    setFFMessage('获取元信息中...')

    const res = await getUgoiraFrameBlobs(pid, setFFMessage)
    if (res.frames.length > 0) {
      console.log('res: ', res)
      setMetadata(res)
      setFFMessage('获取元信息成功')
    } else {
      setFFMessage('获取元信息失败')
    }
  }

  const convertUgoira = async ({
    pid,
    ext = 'mp4',
    vfr = false,
    ffmpegRef,
    setFFMessage,
  }: ConvertParams) => {
    const now = Date.now()

    setExtSel(ext)
    setDlSize('')
    setTimeUsed(0)

    if (videoSrc) {
      URL.revokeObjectURL(videoSrc)
      setVideoSrc('')
    }
    if (imageSrc) {
      URL.revokeObjectURL(imageSrc)
      setImageSrc('')
    }

    const ffmpeg = ffmpegRef.current

    const totalMs = metadata.frames.reduce((a, b) => (a += +b.delay, a), 0)
    const rate = metadata.frames.length / totalMs * 1000

    let ffconcat = 'ffconcat version 1.0\n'

    await Promise.all(metadata.frames.map(async e => {
      if (vfr) {
        ffconcat += 'file ' + e.file + '\n'
        ffconcat += 'duration ' + Number(e.delay) / 1000 + '\n'
      }
      await ffmpeg.writeFile(e.file, await fetchFile(metadata.frameBlobs[e.file]))
    }))

    if (vfr) {
      // Fix ffmpeg concat demuxer issue. This will increase the frame count, but will fix the last frame timestamp issue.
      ffconcat += 'file ' + metadata.frames[metadata.frames.length - 1].file + '\n'
      await ffmpeg.writeFile('ffconcat.txt', ffconcat)
    }

    const inputArg = vfr ? '-f concat -i ffconcat.txt' : `-r ${rate} -i %06d.jpg`

    const cmds: Record<string, string> = {
      mp4: `${inputArg} -c:v libx264 -pix_fmt yuv420p -vf pad=ceil(iw/2)*2:ceil(ih/2)*2 ${pid}.mp4`,
      gif: `${inputArg} -filter_complex [0:v]scale=iw:-2,split[x][z];[x]palettegen[y];[z][y]paletteuse ${pid}.gif`,
      apng: `${inputArg} -c:v apng -plays 0 -vsync 0 ${pid}.apng`,
      webp: `${inputArg} -c:v libwebp -lossless 0 -compression_level 5 -quality 75 -loop 0 -vsync 0 ${pid}.webp`,
      webm: `${inputArg} -c:v libvpx-vp9 -lossless 0 -crf 0 ${pid}.webm`,
    }
    const code = await ffmpeg.exec(cmds[ext].split(/\s+/))

    setFFMessage(`ReturnCode: ${code} ${code == 0 ? '✅转换成功' : '❌转换失败'}`)
    if (code != 0) {
      return
    }

    const fileData = await ffmpeg.readFile(`${pid}.${ext}`) as ArrayBuffer
    if (['mp4', 'webm'].includes(ext)) {
      const videoBlob = new Blob([new Uint8Array(fileData).buffer], { type: `video/${ext}` })
      setVideoSrc(URL.createObjectURL(videoBlob))
      setDlSize(formatBytes(videoBlob.size))
    } else {
      const imageBlob = new Blob([new Uint8Array(fileData).buffer], { type: `image/${ext}` })
      setImageSrc(URL.createObjectURL(imageBlob))
      setDlSize(formatBytes(imageBlob.size))
    }

    await Promise.all(metadata.frames.map(async e => {
      await ffmpeg.deleteFile(e.file)
    }))

    setTimeUsed(Date.now() - now)
  }

  return {
    imageSrc,
    videoSrc,
    metadata,
    extSel,
    timeUsed,
    dlSize,
    fetchMetadata,
    convertUgoira,
  }
}
