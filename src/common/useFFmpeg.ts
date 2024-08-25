import { useRef, useState } from 'react'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { toBlobURL } from '@ffmpeg/util'
import { FF_CORE_CDN_PRE } from './config'

export function useFFmpeg() {
  const ffmpegRef = useRef(new FFmpeg())
  const [loaded, setLoaded] = useState(false)

  const loadFFmpegCore = async (setFFMessage: (v: string) => void) => {
    setFFMessage('加载 core 中...请耐心等待')

    // const baseURL = 'https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/esm'
    // const baseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core-mt@0.12.6/dist/esm'
    // const baseURL = 'https://fastly.jsdelivr.net/npm/@ffmpeg/core-mt@0.12.6/dist/esm'
    const baseURL = FF_CORE_CDN_PRE

    const ffmpeg = ffmpegRef.current
    ffmpeg.on('log', ({ message }) => {
      console.log(message)
      setFFMessage(message)
    })

    const showProgress = baseURL.includes('unpkg.com')
    const onProgress = (type = 'core') => showProgress ? (ev => {
      setFFMessage(`加载 ${type} 中...${(ev.received / (ev.received + ev.delta) * 100).toFixed(2)}%`)
    }) as Parameters<typeof toBlobURL>[3] : void 0

    // toBlobURL is used to bypass CORS issue, urls with the same domain can be used directly.
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript', showProgress, onProgress('core')),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm', showProgress, onProgress('core-wasm')),
      workerURL: await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, 'text/javascript', showProgress, onProgress('core-worker')),
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
