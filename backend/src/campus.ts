import { readFileSync } from 'node:fs'
import { yerlesimOlustur } from '../../3d-harita/js/yerlesim.js'

const read = (file: string) =>
  JSON.parse(readFileSync(new URL(`../../3d-harita/data/${file}`, import.meta.url), 'utf8'))

// The map's own rule on the map's own data, so the server can't disagree with what students see.
export const campus = yerlesimOlustur(read('campus.json'), read('kampus-siniri.json'), read('hediye-binalari.json'))

const byKey = new Map(campus.binalar.map((building) => [building.anahtar, building]))

/** Undefined when the building has since been closed to hunts. */
export const findBuilding = (key: string) => byKey.get(key)
export const openBuildingKeys = () => [...byKey.keys()]
