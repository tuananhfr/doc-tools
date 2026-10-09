import { newId } from '@/utils/id'
import { createFamilySpace, salvageFamilySpace, validateFamilySpace, type FamilySpace } from '../core/family'

const DATABASE_NAME = 'chuyen-nho-family'
const DATABASE_VERSION = 1
const SPACE_STORE = 'spaces'
const META_STORE = 'meta'

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    request.onupgradeneeded = () => {
      const database = request.result
      if (!database.objectStoreNames.contains(SPACE_STORE)) database.createObjectStore(SPACE_STORE, { keyPath: 'familyId' })
      if (!database.objectStoreNames.contains(META_STORE)) database.createObjectStore(META_STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function requestValue<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error) })
}

function writeTransaction(database: IDBDatabase, write: (spaces: IDBObjectStore, meta: IDBObjectStore) => void): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction([SPACE_STORE, META_STORE], 'readwrite')
    write(transaction.objectStore(SPACE_STORE), transaction.objectStore(META_STORE))
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
  })
}

export interface LoadedFamilySpace { space: FamilySpace; dropped: number }

export async function loadFamilySpace(): Promise<LoadedFamilySpace> {
  const database = await openDatabase()
  let stored: unknown = null
  try {
    const transaction = database.transaction([SPACE_STORE, META_STORE], 'readonly')
    const currentId = await requestValue(transaction.objectStore(META_STORE).get('current') as IDBRequest<string | undefined>)
    stored = currentId ? await requestValue(transaction.objectStore(SPACE_STORE).get(currentId) as IDBRequest<unknown>) : null
  } finally { database.close() }
  const space = validateFamilySpace(stored)
  if (space) return { space, dropped: 0 }
  const salvaged = salvageFamilySpace(stored)
  if (salvaged) {
    // Giữ nguyên bản gốc hỏng trước khi ghi đè bằng bản đã cứu — còn đường lấy lại bằng tay.
    await keepDamagedCopy(stored)
    await saveFamilySpace(salvaged.space)
    return salvaged
  }
  // Khung dữ liệu hỏng hẳn: bản cũ vẫn nằm nguyên trong kho dưới mã của nó, chỉ con trỏ `current` đổi.
  const fresh = createFamilySpace()
  await saveFamilySpace(fresh)
  return { space: fresh, dropped: 0 }
}

async function keepDamagedCopy(value: unknown): Promise<void> {
  const database = await openDatabase()
  try { await writeTransaction(database, (_spaces, meta) => { meta.put(value, `damaged:${new Date().toISOString()}`) }) }
  finally { database.close() }
}

export async function saveFamilySpace(space: FamilySpace): Promise<void> {
  if (!validateFamilySpace(space)) throw new Error('Invalid family data')
  const database = await openDatabase()
  try { await writeTransaction(database, (spaces, meta) => { spaces.put(space); meta.put(space.familyId, 'current') }) }
  finally { database.close() }
}

/** Cất một bản sao dưới mã mới, không đổi lịch đang dùng — để khôi phục trùng mã không ghi đè mất dữ liệu hiện tại. */
export async function archiveFamilySpace(space: FamilySpace): Promise<FamilySpace> {
  const copy = { ...space, familyId: newId() }
  if (!validateFamilySpace(copy)) throw new Error('Invalid family data')
  const database = await openDatabase()
  try { await writeTransaction(database, (spaces) => { spaces.put(copy) }) }
  finally { database.close() }
  return copy
}

export async function listFamilySpaces(): Promise<FamilySpace[]> {
  const database = await openDatabase()
  try {
    const values = await requestValue(database.transaction(SPACE_STORE, 'readonly').objectStore(SPACE_STORE).getAll() as IDBRequest<unknown[]>)
    return values.map(validateFamilySpace).filter((value): value is FamilySpace => value !== null)
  } finally { database.close() }
}
