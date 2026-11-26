import type pg from 'pg'
import { CAMPUS_TIME_ZONE, DAILY_LIMITS } from '../../shared/gameRules.js'
import {
  ARRIVE_MAX_ACCURACY,
  FALLBACK_MIN_FRAMES,
  HUNT_HOURS,
  MATCH_MIN_INLIERS,
  MATCH_STREAK,
  MAX_WRONG_ANSWERS,
  MIN_FIND_SECONDS,
  SOLVE_MAX_ACCURACY,
  arrivalRadius,
  solveRadius,
} from '../../shared/huntRules.js'
import { isCorrectAnswer } from './answers.js'
import { campus, findBuilding, openBuildingKeys } from './campus.js'
import { transaction } from './database.js'
import { AppError } from './errors.js'
import type { Fix } from './input.js'
import { deserialize, matchScene } from './matcher/index.js'
import type { MatchQueue } from './matcher/queue.js'
import type { Plausibility } from './plausibility.js'
import { readFrame } from './scenes.js'

type Db = pg.Pool | pg.PoolClient

interface HuntRow {
  id: string
  gift_id: string
  status: string
  live: boolean
  expires_at: Date
  arrived_at: Date | null
  wrong_answers: number
  match_streak: number
  frames_tried: number
  /** Long enough since arriving that a find is believable. */
  settled: boolean
  location_key: string
  floor: string | null
  clue: string
  riddle: string
  answers: string[]
  gift_item_id: number
}

const SELECT_HUNT = `
  SELECT h.id, h.gift_id, h.status, h.status = 'active' AND h.expires_at > now() AS live,
         h.expires_at, h.arrived_at, h.wrong_answers, h.match_streak, h.frames_tried,
         h.arrived_at <= now() - make_interval(secs => ${MIN_FIND_SECONDS}) AS settled,
         g.location_key, g.floor, g.clue, g.riddle, g.answers, g.item_id AS gift_item_id
  FROM hunts h JOIN gifts g ON g.id = h.gift_id`

// A gift this student could be sent to. $1 is the student, $2 the buildings open to hunts.
const CANDIDATE = `
  g.hider_id <> $1 AND g.found_at IS NULL AND g.riddle IS NOT NULL AND g.location_key = ANY($2)
  AND EXISTS (SELECT 1 FROM gift_scenes s WHERE s.gift_id = g.id)
  AND NOT EXISTS (SELECT 1 FROM hunts a WHERE a.gift_id = g.id AND a.status = 'active' AND a.expires_at > now())
  AND NOT EXISTS (
    SELECT 1 FROM hunts b WHERE b.gift_id = g.id AND b.seeker_id = $1 AND b.status IN ('given_up', 'failed')
  )`

const notFound = () => new AppError(404, 'NOT_FOUND', 'Hunt not found.')
const ended = () => new AppError(409, 'HUNT_ENDED', 'This hunt has ended. Start a new search.')

/** The only place a hunt becomes JSON. The gift's spot, note, answers and collectible are never in it. */
function view(hunt: HuntRow) {
  const building = findBuilding(hunt.location_key)
  if (!building) return null
  const arrived = hunt.arrived_at !== null
  return {
    id: hunt.id,
    location: {
      key: building.anahtar,
      name: building.ad,
      fullName: building.tamAd,
      latitude: building.enlem,
      longitude: building.boylam,
    },
    expiresAt: hunt.expires_at,
    arrived,
    floor: arrived ? hunt.floor : null,
    clue: arrived ? hunt.clue : null,
    riddle: arrived ? hunt.riddle : null,
    attemptsLeft: MAX_WRONG_ANSWERS - hunt.wrong_answers,
    framesTried: hunt.frames_tried,
  }
}

const solveFirst = () =>
  new AppError(403, 'CAMERA_FIRST', 'Try the camera at the spot first. The riddle opens if it can’t recognise the place.')
const tooSoon = () =>
  new AppError(409, 'TOO_SOON', 'You only just got here. Look around for a moment, then try again.')

export function createHuntService(pool: pg.Pool, queue: MatchQueue, plausibility: Plausibility) {
  async function load(db: Db, userId: string, id: string, lock = false) {
    const { rows } = await db.query<HuntRow>(
      `${SELECT_HUNT} WHERE h.id = $1 AND h.seeker_id = $2 ${lock ? 'FOR UPDATE OF h' : ''}`,
      [id, userId],
    )
    if (!rows[0]) throw notFound()
    return rows[0]
  }

  async function active(db: Db, userId: string) {
    const { rows } = await db.query<HuntRow>(
      `${SELECT_HUNT} WHERE h.seeker_id = $1 AND h.status = 'active' AND h.expires_at > now() AND g.location_key = ANY($2)`,
      [userId, openBuildingKeys()],
    )
    return rows[0]
  }

  async function reward(db: Db, userId: string, id: string) {
    const { rows } = await db.query(
      `SELECT i.id, i.chapter, i.name, i.credit, g.note
       FROM hunts h JOIN gifts g ON g.id = h.gift_id JOIN collection_items i ON i.id = h.item_id
       WHERE h.id = $1 AND h.seeker_id = $2`,
      [id, userId],
    )
    const { note, ...item } = rows[0]
    return { item, note: note as string }
  }

  /** The find itself, under the hunt's row lock. Used by the camera and by the riddle fallback. */
  async function award(db: pg.PoolClient, userId: string, hunt: HuntRow, photo: Buffer | null) {
    // Two finds by one student can't overlap: they have one active hunt. A collectible they already
    // own becomes one they don't, so every find unlocks something until the booklet is full.
    const { rows } = await db.query<{ id: number }>(
      `SELECT i.id FROM collection_items i
       LEFT JOIN user_collection c ON c.item_id = i.id AND c.user_id = $1
       WHERE i.active
       ORDER BY (c.user_id IS NOT NULL), (i.id <> $2), random()
       LIMIT 1`,
      [userId, hunt.gift_item_id],
    )
    const itemId = rows[0]!.id
    await db.query("UPDATE hunts SET status = 'found', found_at = now(), item_id = $2 WHERE id = $1", [hunt.id, itemId])
    await db.query('UPDATE gifts SET found_at = now() WHERE id = $1', [hunt.gift_id])
    if (photo) await db.query('INSERT INTO find_photos (hunt_id, jpeg) VALUES ($1, $2)', [hunt.id, photo])
    await db.query('INSERT INTO user_collection (user_id, item_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, itemId])
    plausibility.forget(hunt.id)
    return reward(db, userId, hunt.id)
  }

  /** Near enough the building, with a believable reading. Never costs an attempt. */
  function checkPlace(hunt: HuntRow, fix: Fix) {
    if (fix.accuracy > SOLVE_MAX_ACCURACY) {
      throw new AppError(422, 'WEAK_GPS', 'Your GPS signal is too weak. Move near a window and try again.', { field: 'location' })
    }
    if (campus.binayaUzaklik(hunt.location_key, fix.latitude, fix.longitude) > solveRadius(fix.accuracy)) {
      throw new AppError(422, 'TOO_FAR', 'You need to be at the building.', { field: 'location' })
    }
    plausibility.check(hunt.id, fix)
  }

  return {
    async current(userId: string) {
      const hunt = await active(pool, userId)
      if (hunt) return { hunt: view(hunt), available: false }
      const { rowCount } = await pool.query(`SELECT 1 FROM gifts g WHERE ${CANDIDATE} LIMIT 1`, [userId, openBuildingKeys()])
      return { hunt: null, available: Boolean(rowCount) }
    },

    async start(userId: string) {
      return transaction(pool, async (db) => {
        // One assignment at a time, so two students can't draw the same gift.
        await db.query("SELECT pg_advisory_xact_lock(hashtext('campus_quest_assign_hunt'))")
        // Also frees hunts whose building has since been closed to hunts.
        await db.query(
          `UPDATE hunts h SET status = 'expired' FROM gifts g
           WHERE g.id = h.gift_id AND h.status = 'active'
             AND (h.expires_at <= now() OR NOT (g.location_key = ANY($1)))`,
          [openBuildingKeys()],
        )

        // Starting again returns the same hunt and costs nothing.
        const existing = await active(db, userId)
        if (existing) return { hunt: view(existing), created: false }

        const used = await db.query<{ count: number }>(
          `SELECT count(*)::int AS count FROM gift_actions
           WHERE user_id = $1 AND kind = 'search' AND day = (now() AT TIME ZONE $2)::date`,
          [userId, CAMPUS_TIME_ZONE],
        )
        const count = used.rows[0]!.count
        if (count >= DAILY_LIMITS.search) {
          throw new AppError(409, 'DAILY_LIMIT', `You’ve used both of today’s ${DAILY_LIMITS.search} searches. Come back after midnight.`)
        }

        const gift = await db.query<{ id: string }>(
          `SELECT g.id FROM gifts g WHERE ${CANDIDATE} ORDER BY random() LIMIT 1`,
          [userId, openBuildingKeys()],
        )
        if (!gift.rows[0]) {
          // Checked before a slot is taken: an empty map must not cost a search.
          throw new AppError(409, 'NO_GIFTS', 'There’s no gift to find right now. Your search wasn’t used.')
        }

        await db.query("INSERT INTO gift_actions (user_id, kind, slot) VALUES ($1, 'search', $2)", [userId, count + 1])
        await db.query(
          'INSERT INTO hunts (gift_id, seeker_id, expires_at) VALUES ($1, $2, now() + make_interval(hours => $3))',
          [gift.rows[0].id, userId, HUNT_HOURS],
        )
        return { hunt: view((await active(db, userId))!), created: true }
      })
    },

    async checkIn(userId: string, id: string, fix: Fix) {
      const hunt = await load(pool, userId, id)
      if (!hunt.live || !findBuilding(hunt.location_key)) throw ended()
      plausibility.check(hunt.id, fix)
      const distance = campus.binayaUzaklik(hunt.location_key, fix.latitude, fix.longitude)
      const accurate = fix.accuracy <= ARRIVE_MAX_ACCURACY
      if (!hunt.arrived_at && accurate && distance <= arrivalRadius(fix.accuracy)) {
        const updated = await pool.query<{ arrived_at: Date }>(
          "UPDATE hunts SET arrived_at = now() WHERE id = $1 AND status = 'active' RETURNING arrived_at",
          [id],
        )
        if (!updated.rows[0]) throw ended()
        hunt.arrived_at = updated.rows[0].arrived_at
      }
      // Rounded, and to the building only: no use for pinpointing the gift.
      return { hunt: view(hunt), distance: Math.round(distance / 10) * 10, accurate }
    },

    /** One camera frame. Enough frames in a row that show the hider's spot find the gift. */
    async frame(userId: string, id: string, input: { fix: Fix; frame: unknown }) {
      const before = await load(pool, userId, id)
      if (before.status === 'found') return { found: await reward(pool, userId, id) } // retried after a lost response
      if (!before.live || !findBuilding(before.location_key)) throw ended()
      if (!before.arrived_at) throw new AppError(403, 'NOT_ARRIVED', 'Get to the building first.')
      checkPlace(before, input.fix)

      const frame = await readFrame(input.frame, queue)
      const { rows: stored } = await pool.query<{ features: Buffer }>(
        'SELECT features FROM gift_scenes WHERE gift_id = $1 ORDER BY idx',
        [before.gift_id],
      )
      const score = await queue(() => matchScene(stored.map((row) => deserialize(row.features)), frame.features))
      const matched = score >= MATCH_MIN_INLIERS

      return transaction(pool, async (db) => {
        const hunt = await load(db, userId, id, true)
        if (hunt.status === 'found') return { found: await reward(db, userId, id) }
        if (!hunt.live) throw ended()
        const streak = matched ? hunt.match_streak + 1 : 0
        if (streak >= MATCH_STREAK && hunt.settled) return { found: await award(db, userId, hunt, frame.jpeg) }
        const { rows } = await db.query<{ frames_tried: number }>(
          'UPDATE hunts SET match_streak = $2, frames_tried = frames_tried + 1 WHERE id = $1 RETURNING frames_tried',
          [id, streak],
        )
        // Only how close: a score would let a cheater tune fake frames against the threshold.
        return { found: null, matched, streak, needed: MATCH_STREAK, framesTried: rows[0]!.frames_tried }
      })
    },

    /** The riddle: only once the camera has had a fair try. */
    async solve(userId: string, id: string, input: { fix: Fix; answer: string }) {
      const before = await load(pool, userId, id)
      if (before.status === 'found') return reward(pool, userId, id) // retried after a lost response
      if (!before.live || !findBuilding(before.location_key)) throw ended()
      if (!before.arrived_at) throw new AppError(403, 'NOT_ARRIVED', 'Get to the building to unlock the riddle first.')
      if (before.frames_tried < FALLBACK_MIN_FRAMES) throw solveFirst()
      // Place problems never cost an answer attempt.
      checkPlace(before, input.fix)

      // Under a row lock, so parallel guesses can't get round the attempt limit.
      const outcome = await transaction(pool, async (db) => {
        const hunt = await load(db, userId, id, true)
        if (hunt.status === 'found') return { found: await reward(db, userId, id) }
        if (!hunt.live) throw ended()
        if (!hunt.settled) throw tooSoon()

        if (!isCorrectAnswer(input.answer, hunt.answers)) {
          const wrong = hunt.wrong_answers + 1
          await db.query('UPDATE hunts SET wrong_answers = $2, status = $3 WHERE id = $1', [
            id,
            wrong,
            wrong >= MAX_WRONG_ANSWERS ? 'failed' : 'active',
          ])
          return { wrong }
        }
        return { found: await award(db, userId, hunt, null) }
      })

      // Thrown out here, so the failed attempt is committed first.
      if (outcome.found) return outcome.found
      const left = MAX_WRONG_ANSWERS - outcome.wrong!
      if (left <= 0) {
        throw new AppError(422, 'HUNT_FAILED', 'That was your last try. The gift goes back to the map for someone else.')
      }
      throw new AppError(422, 'WRONG_ANSWER', `Not quite. ${left} ${left === 1 ? 'try' : 'tries'} left.`, { field: 'answer' })
    },

    async giveUp(userId: string, id: string) {
      const { rowCount } = await pool.query(
        "UPDATE hunts SET status = 'given_up' WHERE id = $1 AND seeker_id = $2 AND status = 'active'",
        [id, userId],
      )
      if (!rowCount) throw notFound()
    },

    /** Only the finder and the hider. */
    async photo(userId: string, id: string) {
      const { rows } = await pool.query<{ jpeg: Buffer }>(
        `SELECT p.jpeg FROM find_photos p JOIN hunts h ON h.id = p.hunt_id JOIN gifts g ON g.id = h.gift_id
         WHERE p.hunt_id = $1 AND (h.seeker_id = $2 OR g.hider_id = $2)`,
        [id, userId],
      )
      if (!rows[0]) throw notFound()
      return rows[0].jpeg
    },
  }
}
export type HuntService = ReturnType<typeof createHuntService>
