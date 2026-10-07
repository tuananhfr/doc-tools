/** Worker termination can leave its pending promise unresolved. */
export function awaitOcrJob<T>(job: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return job
  signal.throwIfAborted()
  return new Promise<T>((resolve, reject) => {
    const abort = () => reject(signal.reason)
    signal.addEventListener('abort', abort, { once: true })
    job.then(value => { signal.removeEventListener('abort', abort); resolve(value) }, error => { signal.removeEventListener('abort', abort); reject(error) })
  })
}
