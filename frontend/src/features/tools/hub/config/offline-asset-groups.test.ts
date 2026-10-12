import { describe, expect, it } from 'vitest'
import { optionalAssetGroups } from './offline-asset-groups'

const input = {
  videoVendor: '/vendor/ffmpeg/core-x/',
  videoAssets: [{ name: 'ffmpeg-core.js' }, { name: 'ffmpeg-core.wasm' }],
  backgroundModel: { file: 'u2netp.onnx', runtimeVersion: '1.30.0', runtimeFiles: ['ort.mjs', 'ort.wasm'] },
  ttsVoice: { model: { file: 'voice.onnx' }, phonemizer: { version: '1.0.0', wasm: { file: 'p.wasm' }, data: { file: 'p.data' } }, runtimeVersion: '1.30.0' },
  withBase: (url: string) => '/base' + url,
}

describe('optionalAssetGroups', () => {
  it('names every lazy asset group with base-prefixed paths', () => {
    expect(optionalAssetGroups(input)).toEqual({
      video: ['/base/vendor/ffmpeg/core-x/ffmpeg-core.js', '/base/vendor/ffmpeg/core-x/ffmpeg-core.wasm'],
      ocr: ['/base/vendor/tesseract/vie.traineddata.gz'],
      'background-removal': ['/base/vendor/background-removal/u2netp.onnx', '/base/vendor/background-removal/ort-1.30.0/ort.mjs', '/base/vendor/background-removal/ort-1.30.0/ort.wasm'],
      tts: ['/base/vendor/tts/voice.onnx', '/base/vendor/tts/piper-phonemize-1.0.0/p.wasm', '/base/vendor/tts/piper-phonemize-1.0.0/p.data', '/base/vendor/background-removal/ort-1.30.0/ort.mjs', '/base/vendor/background-removal/ort-1.30.0/ort.wasm'],
    })
  })
  it('refuses a voice built for another ONNX runtime than the one shipped', () => {
    expect(() => optionalAssetGroups({ ...input, ttsVoice: { ...input.ttsVoice, runtimeVersion: '1.31.0' } })).toThrow(/runtime/)
  })
})
