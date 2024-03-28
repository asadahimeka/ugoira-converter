import { useState, useRef, useEffect } from 'react'
import { useFFmpeg } from '../common/useFFmpeg'
import { useConverter } from '../common/useConverter'
import { downloadFile, getPidFromUrl } from '../common/utils'

export default function Converter() {
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

  const onPidChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let { value } = e.target
    value = value.match(/(\d+)/)?.[1] || ''
    setPid(value)
  }

  return (
    <>
      <div className='id-inp-box'>
        {!loaded && <button className='load-core-btn' onClick={load}>加载 ffmpeg-core</button>}
        {loaded && <>
          <span>输入动图链接或 ID:</span>
          <input className='id-inp' type="text" value={pid} onChange={onPidChange} />
          <button onClick={fetchData}>获取元信息</button>
          {(videoSrc || imageSrc) && <button className='active' onClick={download}>下载 {dlSize && <span>({dlSize})</span>}</button>}
        </>}
      </div>
      {loaded && (
        <div>
          {metadata.frames.length > 0 && <div className="box">
            <button onClick={convert('mp4')}>转换为 mp4</button>
            <button onClick={convert('gif')}>转换为 gif</button>
            <button onClick={convert('webp')}>转换为 webp</button>
            <button onClick={convert('apng')}>转换为 apng</button>
            <button onClick={convert('webm')}>转换为 webm</button>
            <span>
              <input type="checkbox" checked={vfr} onChange={e => setVFR(e.target.checked)} /> VFR
            </span>
          </div>}
          <p className='ff-message'>{ffMessage}{timeUsed > 0 && <span> 🕒耗时: {timeUsed / 1000}s</span>}</p>
          {videoSrc && <video className='res-media' ref={videoRef} src={videoSrc} controls muted loop></video>}
          {imageSrc && <img className='res-media' src={imageSrc} alt="" />}
        </div>
      )}
    </>
  )
}
