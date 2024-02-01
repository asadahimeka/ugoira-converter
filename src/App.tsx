import { useState, useRef, useEffect } from 'react'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { toBlobURL, fetchFile } from '@ffmpeg/util'
import JSZip from 'jszip'

interface FrameItem {
  file: string
  delay: string
}

interface FrameMatadata {
  frames: FrameItem[]
  frameBlobs: Record<string, Blob>
}

function downloadFile(url: string, name = '') {
  const a = document.createElement('a')
  a.href = url
  a.target = '_blank'
  a.rel = 'noopener noreferrer'
  a.style.display = 'none'
  a.setAttribute('download', name)
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

function formatBytes(bytes: number | string) {
  bytes = Number(bytes)
  if (!bytes) return '0 B'

  const k = 1024
  const dm = 1
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

async function getUgoiraMetadata(id: string) {
  const resp = await fetch(`https://hibiapi5.cocomi.eu.org/api/pixiv/ugoira_metadata?id=${id}`)
  const json = await resp.json()

  return {
    zipUrl: json.ugoira_metadata.zip_urls.medium.replace('_ugoira600x600', '_ugoira1920x1080').replace('i.pximg.net', 'pximg.cocomi.eu.org'),
    frames: json.ugoira_metadata.frames,
  } as {
    zipUrl: string
    frames: FrameItem[]
  }
}

async function getUgoiraFrameBlobs(id: string): Promise<FrameMatadata> {
  const { zipUrl, frames } = await getUgoiraMetadata(id)
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

function getPidFromUrl() {
  const u = new URL(location.href)
  return u.searchParams.get('id') || ''
}

function App() {
  const ffmpegRef = useRef(new FFmpeg())
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [imageSrc, setImageSrc] = useState('')
  const [videoSrc, setVideoSrc] = useState('')
  const [ffMessage, setFfMessage] = useState('')
  const [timeUsed, setTimeUsed] = useState(0)
  const [pid, setPid] = useState(getPidFromUrl())
  const [selExt, setSelExt] = useState('mp4')
  const [dlSize, setDlSize] = useState('')
  const [metadata, setMetadata] = useState<FrameMatadata>({ frames: [], frameBlobs: {} })

  useEffect(() => {
    if (videoSrc) videoRef.current?.play()
  }, [videoSrc])

  const load = async () => {
    setFfMessage('加载 core 中...')

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
    setFfMessage('加载 core 成功')
  }

  const fetchMetadata = async () => {
    if (!/^\d+$/.test(pid)) {
      alert('ID 请输入数字')
      return
    }
    setFfMessage('')
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
    setFfMessage('获取元信息中...')
    const res = await getUgoiraFrameBlobs(pid)
    console.log('res: ', res)
    setMetadata(res)
    setFfMessage('获取元信息成功')
  }

  const convert = (ext = 'mp4') => async () => {
    const now = Date.now()

    setSelExt(ext)
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

    // todo: use ffconcat
    const totalMs = metadata.frames.reduce((a, b) => (a += +b.delay, a), 0)
    const rate = metadata.frames.length / totalMs * 1000

    await Promise.all(metadata.frames.map(async e => {
      await ffmpeg.writeFile(e.file, await fetchFile(metadata.frameBlobs[e.file]))
    }))

    const cmds: Record<string, string> = {
      mp4: `-r ${rate} -i %06d.jpg -c:v libx264 -pix_fmt yuv420p -vf pad=ceil(iw/2)*2:ceil(ih/2)*2 ${pid}.mp4`,
      gif: `-r ${rate} -i %06d.jpg -filter_complex [0:v]scale=iw:-2,split[x][z];[x]palettegen[y];[z][y]paletteuse ${pid}.gif`,
      apng: `-r ${rate} -i %06d.jpg -c:v apng -plays 0 -vsync 0 ${pid}.apng`,
      webp: `-r ${rate} -i %06d.jpg -c:v libwebp -lossless 0 -compression_level 5 -quality 75 -loop 0 -vsync 0 ${pid}.webp`,
      webm: `-r ${rate} -i %06d.jpg -c:v libvpx-vp9 -lossless 0 -crf 0 ${pid}.webm`,
    }
    const code = await ffmpeg.exec(cmds[ext].split(/\s+/))

    setFfMessage(`ReturnCode: ${code} ${code == 0 ? '✅转换成功' : '❌转换失败'}`)
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

  const download = () => {
    downloadFile(videoSrc || imageSrc, `${pid}.${selExt}`)
  }

  return (
    <>
      <h1><span className='tit-gr'>Ugoira</span> Converter w/ ffmpeg.wasm</h1>
      <p>🪄在浏览器端使用 <a href='https://github.com/ffmpegwasm/ffmpeg.wasm' target='_blank' className='code-tag'>ffmpeg.wasm</a> 转换 pixiv ugoira(动图)</p>
      <p>🌸1.加载 ffmpeg-core (~32.6MB) ⏩ 2.输入动图 ID ⏩ 3.获取元信息 ⏩ 4.进行转换 🌟</p>
      <div className='id-inp-box'>
        {!loaded && <button onClick={load}>加载 ffmpeg-core</button>}
        {loaded && <>
          <span>输入 ID:</span>
          <input className='id-inp' type="text" value={pid} onChange={e => setPid(e.target.value)} />
          <button onClick={fetchMetadata}>获取元信息</button>
          {(videoSrc || imageSrc) && <button className='active' onClick={download}>下载 {dlSize && <span>({dlSize})</span>}</button>}
        </>}
      </div>
      {!loaded && !videoSrc && !imageSrc && <img width={480} className='res-media' src='/115587247.gif' alt='' />}
      {loaded && (
        <div>
          {metadata.frames.length > 0 && <div className="box">
            <button onClick={convert('mp4')}>转换为 mp4</button>
            <button onClick={convert('gif')}>转换为 gif</button>
            <button onClick={convert('webp')}>转换为 webp</button>
            <button onClick={convert('apng')}>转换为 apng</button>
            <button onClick={convert('webm')}>转换为 webm</button>
          </div>}
          <p>{ffMessage}{timeUsed > 0 && <span> 🕒耗时: {timeUsed}ms</span>}</p>
          {videoSrc && <video className='res-media' ref={videoRef} src={videoSrc} controls muted loop></video>}
          {imageSrc && <img className='res-media' src={imageSrc} alt="" />}
        </div>
      )}
    </>
  )
}

export default App
