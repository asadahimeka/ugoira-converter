import GithubIcon from './GithubIcon'

export default function Header() {
  return (
    <>
      <h1><span className='tit-gr'>Ugoira</span> Converter w/ ffmpeg.wasm</h1>
      <p>🪄在浏览器端使用 <a href='https://github.com/ffmpegwasm/ffmpeg.wasm' target='_blank' className='code-tag' rel="noreferrer">ffmpeg.wasm</a> 转换 pixiv ugoira(动图)</p>
      <p>🌸1.加载 ffmpeg-core (~32.6MB) ⏩ 2.输入动图 ID ⏩ 3.获取元信息 ⏩ 4.进行转换 🌟</p>
      <a className='github-link' href='https://github.com/asadahimeka/ugoira-converter' target='_blank' rel="noreferrer">
        <GithubIcon />
      </a>
    </>
  )
}
