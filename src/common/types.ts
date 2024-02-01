export interface FrameItem {
  file: string
  delay: string
}

export interface FrameMetadata {
  frames: FrameItem[]
  frameBlobs: Record<string, Blob>
}
