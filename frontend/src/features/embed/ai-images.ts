import { AI_IMAGES_MAX, isAiImage } from './embed-protocol'

/** Picked files → what the host will accept; the rest are named back to the person. */
export function addAiImages(current: File[], added: File[]): { images: File[]; rejected: File[] } {
  const images = [...current]
  const rejected: File[] = []
  for (const file of added) {
    if (isAiImage(file) && images.length < AI_IMAGES_MAX) images.push(file)
    else rejected.push(file)
  }
  return { images, rejected }
}
