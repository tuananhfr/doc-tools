// Bản build emscripten của piper-phonemize không kèm type; chỉ khai phần worker dùng.
declare module '@diffusionstudio/piper-wasm/build/piper_phonemize.js' {
  interface PiperPhonemizeModule {
    callMain(args: string[]): number
  }
  interface PiperPhonemizeOptions {
    print: (line: string) => void
    printErr: (line: string) => void
    wasmBinary: ArrayBuffer
    getPreloadedPackage: (name: string, size: number) => ArrayBuffer
    locateFile: (file: string) => string
  }
  const createPiperPhonemize: (options: PiperPhonemizeOptions) => Promise<PiperPhonemizeModule>
  export default createPiperPhonemize
}
