export function downloadFile(url: string, name = '') {
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

export function formatBytes(bytes: number | string) {
  bytes = Number(bytes)
  if (!bytes) return '0 B'

  const k = 1024
  const dm = 1
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']

  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

export function getPidFromUrl() {
  const u = new URL(location.href)
  return u.searchParams.get('id') || ''
}
