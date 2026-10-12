import type { FlowOutput } from '@/features/tools/hub'

/** Ảnh thẻ xuất JPEG: vùng trong suốt sẽ thành nền đen — trải nền trắng trước khi chuyển sang. */
export function idPhotoFill(background: string): string {
  return background === 'transparent' ? '#ffffff' : background
}

export function outputFile(output: FlowOutput): File {
  return new File([output.blob], output.name, { type: output.blob.type })
}
