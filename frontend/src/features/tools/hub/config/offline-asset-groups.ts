export type OfflineAssetGroup = 'video' | 'ocr' | 'background-removal' | 'tts'

interface OfflineAssetInput {
  videoVendor: string
  videoAssets: { name: string }[]
  backgroundModel: { file: string; runtimeVersion: string; runtimeFiles: string[] }
  ttsVoice: { model: { file: string }; phonemizer: { version: string; wasm: { file: string }; data: { file: string } }; runtimeVersion: string }
  withBase: (url: string) => string
}

/**
 * Nhóm tệp nặng không precache, theo tên để nút "Tải để dùng khi mất mạng" biết lấy gì.
 * File này không import gì vì `prepare-offline.mjs` nạp thẳng bằng Node (bỏ kiểu), không qua bundler.
 */
export function optionalAssetGroups({ videoVendor, videoAssets, backgroundModel, ttsVoice, withBase }: OfflineAssetInput): Record<OfflineAssetGroup, string[]> {
  // Piper chạy trên chính bộ ONNX runtime của tách nền: lệch phiên bản thì tải trước xong vẫn hỏng khi mất mạng.
  if (ttsVoice.runtimeVersion !== backgroundModel.runtimeVersion) throw new Error(`Piper runtime ${ttsVoice.runtimeVersion} differs from the shipped ONNX runtime ${backgroundModel.runtimeVersion}`)
  const ort = backgroundModel.runtimeFiles.map((name) => withBase(`/vendor/background-removal/ort-${backgroundModel.runtimeVersion}/${name}`))
  return {
    video: videoAssets.map(({ name }) => withBase(videoVendor + name)),
    ocr: [withBase('/vendor/tesseract/vie.traineddata.gz')],
    'background-removal': [withBase(`/vendor/background-removal/${backgroundModel.file}`), ...ort],
    tts: [
      withBase(`/vendor/tts/${ttsVoice.model.file}`),
      ...[ttsVoice.phonemizer.wasm, ttsVoice.phonemizer.data].map(({ file }) => withBase(`/vendor/tts/piper-phonemize-${ttsVoice.phonemizer.version}/${file}`)),
      ...ort,
    ],
  }
}
