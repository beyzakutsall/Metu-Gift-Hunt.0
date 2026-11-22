const EXTENSION = { model: 'glb', preview: 'webp' }

/** The API sends these only to a student who found the item. Mock mode has a few sample files instead. */
export function collectionAsset(id: number, kind: keyof typeof EXTENSION) {
  return import.meta.env.MODE === 'mock'
    ? `${import.meta.env.BASE_URL}mock-collection/${id}.${EXTENSION[kind]}`
    : `/api/collection/${id}/${kind}`
}
