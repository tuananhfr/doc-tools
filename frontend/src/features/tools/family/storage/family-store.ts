import { createFamilySpace, validateFamilySpace, type FamilySpace } from '../core/family'

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

export async function loadFamilySpace(): Promise<FamilySpace> {
  const database = await openDatabase()
  try {
    const transaction = database.transaction([SPACE_STORE, META_STORE], 'readonly')
    const currentId = await requestValue(transaction.objectStore(META_STORE).get('current') as IDBRequest<string | undefined>)
    const stored = currentId ? await requestValue(transaction.objectStore(SPACE_STORE).get(currentId) as IDBRequest<unknown>) : null
    const space = validateFamilySpace(stored)
    if (space) return space
  } finally { database.close() }
  const space = createFamilySpace()
  await saveFamilySpace(space)
  return space
}

export async function saveFamilySpace(space: FamilySpace): Promise<void> {
  if (!validateFamilySpace(space)) throw new Error('Invalid family data')
  const database = await openDatabase()
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction([SPACE_STORE, META_STORE], 'readwrite')
      transaction.objectStore(SPACE_STORE).put(space)
      transaction.objectStore(META_STORE).put(space.familyId, 'current')
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
      transaction.onabort = () => reject(transaction.error)
    })
  } finally { database.close() }
}

export async function listFamilySpaces(): Promise<FamilySpace[]> {
  const database = await openDatabase()
  try {
    const values = await requestValue(database.transaction(SPACE_STORE, 'readonly').objectStore(SPACE_STORE).getAll() as IDBRequest<unknown[]>)
    return values.map(validateFamilySpace).filter((value): value is FamilySpace => value !== null)
  } finally { database.close() }
}
