import { useState, useRef, useEffect } from 'react'
import { useFFmpeg } from './common/useFFmpeg'
import { useConverter } from './common/useConverter'
import { downloadFile, getPidFromUrl } from './common/utils'

function App() {
  const videoRef = useRef<HTMLVideoElement | null>(null)

  const [ffMessage, setFFMessage] = useState('')
  const [pid, setPid] = useState(getPidFromUrl())
  const [vfr, setVFR] = useState(false)

  const { ffmpegRef, loaded, loadFFmpegCore } = useFFmpeg()
  const { imageSrc, videoSrc, metadata, extSel, timeUsed, dlSize, fetchMetadata, convertUgoira } = useConverter()

  useEffect(() => {
    if (videoSrc) videoRef.current?.play()
  }, [videoSrc])

  const load = async () => {
    await loadFFmpegCore(setFFMessage)
  }

  const fetchData = async () => {
    await fetchMetadata(pid, setFFMessage)
  }

  const convert = (ext = 'mp4') => async () => {
    await convertUgoira({ pid, ext, vfr, ffmpegRef, setFFMessage })
  }

  const download = () => {
    downloadFile(videoSrc || imageSrc, `${pid}.${extSel}`)
  }

  return (
    <>
      <h1><span className='tit-gr'>Ugoira</span> Converter w/ ffmpeg.wasm</h1>
      <p>🪄在浏览器端使用 <a href='https://github.com/ffmpegwasm/ffmpeg.wasm' target='_blank' className='code-tag' rel="noreferrer">ffmpeg.wasm</a> 转换 pixiv ugoira(动图)</p>
      <p>🌸1.加载 ffmpeg-core (~32.6MB) ⏩ 2.输入动图 ID ⏩ 3.获取元信息 ⏩ 4.进行转换 🌟</p>
      <div className='id-inp-box'>
        {!loaded && <button onClick={load}>加载 ffmpeg-core</button>}
        {loaded && <>
          <span>输入 ID:</span>
          <input className='id-inp' type="text" value={pid} onChange={e => setPid(e.target.value)} />
          <button onClick={fetchData}>获取元信息</button>
          {(videoSrc || imageSrc) && <button className='active' onClick={download}>下载 {dlSize && <span>({dlSize})</span>}</button>}
        </>}
      </div>
      {loaded && (
        <div>
          {metadata.frames.length > 0 && <div className="box">
            <span>
              <input type="checkbox" checked={vfr} onChange={e => setVFR(e.target.checked)} /> VFR
            </span>
            <button onClick={convert('mp4')}>转换为 mp4</button>
            <button onClick={convert('gif')}>转换为 gif</button>
            <button onClick={convert('webp')}>转换为 webp</button>
            <button onClick={convert('apng')}>转换为 apng</button>
            <button onClick={convert('webm')}>转换为 webm</button>
          </div>}
          <p>{ffMessage}{timeUsed > 0 && <span> 🕒耗时: {timeUsed / 1000}s</span>}</p>
          {videoSrc && <video className='res-media' ref={videoRef} src={videoSrc} controls muted loop></video>}
          {imageSrc && <img className='res-media' src={imageSrc} alt="" />}
        </div>
      )}
    </>
  )
}

export default App
