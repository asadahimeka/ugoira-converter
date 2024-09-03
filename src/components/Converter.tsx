import React, { useState, useRef, useEffect } from 'react'
import { useFFmpeg } from '../common/useFFmpeg'
import { useConverter } from '../common/useConverter'
import { downloadFile, getPidFromUrl } from '../common/utils'
import { PXIMG_BASE_ALTS, FF_CORE_CDN_PRE_ALTS } from '../common/config'

export default function Converter() {
  const videoRef = useRef<HTMLVideoElement | null>(null)

  const [ffMessage, setFFMessage] = useState('')
  const [pid, setPid] = useState(getPidFromUrl())
  const [vfr, setVFR] = useState(false)
  const [showSetting, setShowSetting] = useState(false)

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

  const onSelectChange = (type: string) => (e: React.ChangeEvent<HTMLSelectElement>) => {
    localStorage.setItem(type == 'pximg' ? 'PXIMG_BASE' : 'FF_CORE_CDN_PRE', e.target.value)
    location.reload()
  }

  const toggleSettingShow = () => {
    setShowSetting(v => !v)
  }

  return (
    <>
      <div className='id-inp-box'>
        {!loaded && (
          <div>
            <div className="box">
              <button className='load-core-btn' onClick={load}>加载 ffmpeg-core</button>
              <button className='load-core-btn' onClick={toggleSettingShow}>设置</button>
              {showSetting && <div className="box">
                <select className='sel' value={''} onChange={onSelectChange('ffcdn')}>
                  <option value="" disabled>选择 ffmpeg-core CDN</option>
                  <option value="">默认</option>
                  {FF_CORE_CDN_PRE_ALTS.map(e => <option value={e} key={e}>{e}</option>)}
                </select>
                <select className='sel' value={''} onChange={onSelectChange('pximg')}>
                  <option value="" disabled>选择 pximg 代理</option>
                  <option value="">默认</option>
                  {PXIMG_BASE_ALTS.map(e => <option value={e} key={e}>{e}</option>)}
                </select>
              </div>}
            </div>
            {ffMessage && <p className='ff-message'>{ffMessage}</p>}
          </div>
        )}
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
