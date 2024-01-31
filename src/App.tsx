import { useState, useRef, useEffect } from 'react'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { toBlobURL, fetchFile } from '@ffmpeg/util'

function App() {
  const ffmpegRef = useRef(new FFmpeg())
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [imageSrc, setImageSrc] = useState('')
  const [videoSrc, setVideoSrc] = useState('')
  const [ffMessage, setFfMessage] = useState('')
  const [timeUsed, setTimeUsed] = useState(0)

  useEffect(() => {
    if (videoSrc) videoRef.current?.play()
  }, [videoSrc])

  const load = async () => {
    // const baseURL = 'https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/esm'
    // const baseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core-mt@0.12.6/dist/esm'
    const baseURL = 'https://registry.npmmirror.com/@ffmpeg/core-mt/0.12.6/files/dist/esm'

    const ffmpeg = ffmpegRef.current
    ffmpeg.on('log', ({ message }) => {
      console.log(message)
      setFfMessage(message)
    })
    // toBlobURL is used to bypass CORS issue, urls with the same domain can be used directly.
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      workerURL: await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, 'text/javascript'),
    })
    setLoaded(true)
  }

  const convert = (ext = 'mp4') => async () => {
    console.time('transcode')
    const now = Date.now()

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

    const rate = 24
    const id = '115551155'

    // const rate = (4/(70*4))*1000
    // const id = '115587247'

    // todo: promise all
    for (let index = 0; index < 24; index++) {
      // for (let index = 0; index < 4; index++) {
      const filename = `${index.toString().padStart(6, '0')}.jpg`
      await ffmpeg.writeFile(filename, await fetchFile(`/${id}/${filename}`))
    }

    const cmds: Record<string, string> = {
      mp4: `-r ${rate} -i %06d.jpg -c:v libx264 -pix_fmt yuv420p -vf pad=ceil(iw/2)*2:ceil(ih/2)*2 ${id}.mp4`,
      // gif: `-r ${rate} -i %06d.jpg -filter_complex [0:v]split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle -vsync 0 ${id}.gif`,
      gif: `-f image2 -r ${rate} -i %06d.jpg -filter_complex [0:v]scale=640:-2,split[x][z];[x]palettegen[y];[z][y]paletteuse ${id}.gif`,
      apng: `-r ${rate} -i %06d.jpg -c:v apng -plays 0 -vsync 0 ${id}.apng`,
      webp: `-r ${rate} -i %06d.jpg -c:v libwebp -lossless 0 -compression_level 5 -quality 100 -loop 0 -vsync 0 ${id}.webp`,
      webm: `-r ${rate} -f image2 -i %06d.jpg -c:v libvpx-vp9 -lossless 0 -crf 0 ${id}.webm`,
      // avif: `-r ${rate} -i %06d.jpg -c:v libaom-av1 ${id}.avif`,
    }
    const code = await ffmpeg.exec(cmds[ext].split(/\s+/))

    setFfMessage(`ReturnCode: ${code} (${code == 0 ? '成功' : '失败'})`)
    if (code != 0) {
      return
    }

    const fileData = await ffmpeg.readFile(`${id}.${ext}`)
    if (['mp4', 'webm'].includes(ext)) {
      setVideoSrc(URL.createObjectURL(new Blob([new Uint8Array(fileData as ArrayBuffer).buffer], { type: `video/${ext}` })))
    } else {
      setImageSrc(URL.createObjectURL(new Blob([new Uint8Array(fileData as ArrayBuffer).buffer], { type: `image/${ext}` })))
    }

    // todo: delete input files

    setTimeUsed(Date.now() - now)
    console.timeEnd('transcode')
  }

  return loaded ? (
    <>
      {videoSrc && <video ref={videoRef} src={videoSrc} controls muted loop></video>}
      {imageSrc && <img src={imageSrc} alt="" />}
      <br />
      <div className="flex-col-box">
        <button onClick={convert('mp4')}>转换 ugoira 为 mp4</button>
        <button onClick={convert('gif')}>转换 ugoira 为 gif</button>
        <button onClick={convert('apng')}>转换 ugoira 为 apng</button>
        <button onClick={convert('webp')}>转换 ugoira 为 webp</button>
        <button onClick={convert('webm')}>转换 ugoira 为 webm</button>
        {/* <button onClick={convert('avif')}>转换 ugoira 为 avif</button> */}
      </div>
      {timeUsed > 0 && <p className='ff-message'>耗时: {timeUsed}ms</p>}
      <p className='ff-message'>{ffMessage}</p>
    </>
  ) : (
    <button onClick={load}>加载 ffmpeg-core (~32.6MB)</button>
  )
}

export default App
