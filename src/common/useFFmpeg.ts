import { useRef, useState } from 'react'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { toBlobURL } from '@ffmpeg/util'

export function useFFmpeg() {
  const ffmpegRef = useRef(new FFmpeg())
  const [loaded, setLoaded] = useState(false)

  const loadFFmpegCore = async (setFFMessage: (v: string) => void) => {
    setFFMessage('加载 core 中...')

    // const baseURL = 'https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/esm'
    // const baseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core-mt@0.12.6/dist/esm'
    const baseURL = import.meta.env.VITE_APP_CORE_CDN_PRE

    const ffmpeg = ffmpegRef.current
    ffmpeg.on('log', ({ message }) => {
      console.log(message)
      setFFMessage(message)
    })
    // toBlobURL is used to bypass CORS issue, urls with the same domain can be used directly.
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      workerURL: await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, 'text/javascript'),
    })
    setLoaded(true)
    setFFMessage('加载 core 成功')
  }

  return {
    loadFFmpegCore,
    loaded,
    ffmpegRef,
  }
}
