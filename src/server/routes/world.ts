import { Hono } from 'hono'
import { reddit, redis } from '@devvit/web/server'
import {
  FACTIONS,
  FACTION_BY_ID,
  REGIONS,
  REGION_BY_ID,
  SEASON,
  EARN_LIMITS,
  DAILY_EARN_CAP,
  JOIN_BONUS,
} from '../../shared/world'
import type {
  FactionId,
  RegionState,
  WorldEvent,
  WorldStateResponse,
  JoinResponse,
  InvestResponse,
  EarnResponse,
} from '../../shared/world'

type ErrorResponse = { status: 'error'; message: string }

const K = {
  factions: `w:${SEASON}:factions`,
  members: `w:${SEASON}:members`,
  points: (u: string) => `w:${SEASON}:points:${u}`,
  earnedGame: (g: string, d: string, u: string) => `w:${SEASON}:earned:${g}:${d}:${u}`,
  earnedTotal: (d: string, u: string) => `w:${SEASON}:earned:total:${d}:${u}`,
  region: (r: string) => `w:${SEASON}:region:${r}`,
  log: `w:${SEASON}:log`,
}

function dateKey(): string {
  const d = new Date()
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

function isFactionId(s: string): s is FactionId {
  return s in FACTION_BY_ID
}

async function logEvent(text: string): Promise<void> {
  const ts = Date.now()
  await redis.zAdd(K.log, { member: JSON.stringify({ text, ts }), score: ts })
  await redis.zRemRangeByRank(K.log, 0, -51)
}

function toRegionState(id: string, raw: Record<string, string>): RegionState {
  const influence: Record<string, number> = {}
  let total = 0
  let controller: FactionId | null = null
  let best = 0
  for (const [faction, val] of Object.entries(raw)) {
    const n = Number(val)
    if (!Number.isFinite(n) || n <= 0) continue
    influence[faction] = n
    total += n
    if (n > best && isFactionId(faction)) {
      best = n
      controller = faction
    } else if (n === best) {
      controller = null
    }
  }
  return { id, influence, controller, total }
}

async function readRegions(): Promise<RegionState[]> {
  const raws = await Promise.all(REGIONS.map((r) => redis.hGetAll(K.region(r.id))))
  return REGIONS.map((r, i) => toRegionState(r.id, raws[i] ?? {}))
}

export const world = new Hono()

world.get('/state', async (c) => {
  try {
    let username: string | null = null
    try {
      username = (await reddit.getCurrentUsername()) ?? null
    } catch {
      /* nicht eingeloggt */
    }

    const [regions, membersRaw] = await Promise.all([readRegions(), redis.hGetAll(K.members)])

    let faction: FactionId | null = null
    let points = 0
    if (username) {
      const f = await redis.hGet(K.factions, username)
      if (f && isFactionId(f)) faction = f
      points = Number((await redis.get(K.points(username))) ?? '0')
    }

    const factionTotals: Record<string, number> = {}
    for (const fdef of FACTIONS) factionTotals[fdef.id] = 0
    for (const r of regions) {
      for (const [f, v] of Object.entries(r.influence)) {
        factionTotals[f] = (factionTotals[f] ?? 0) + v
      }
    }

    const memberCounts: Record<string, number> = {}
    for (const fdef of FACTIONS) memberCounts[fdef.id] = Number(membersRaw?.[fdef.id] ?? '0')

    const rawEvents = await redis.zRange(K.log, 0, 11, { by: 'rank', reverse: true })
    const events: WorldEvent[] = []
    for (const e of rawEvents) {
      try {
        events.push(JSON.parse(e.member) as WorldEvent)
      } catch {
        /* kaputte Eintraege ignorieren */
      }
    }

    return c.json<WorldStateResponse>({
      username,
      faction,
      points,
      regions,
      factionTotals,
      memberCounts,
      events,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return c.json<ErrorResponse>({ status: 'error', message: msg }, 500)
  }
})

world.post('/join', async (c) => {
  try {
    const username = await reddit.getCurrentUsername()
    if (!username) {
      return c.json<ErrorResponse>({ status: 'error', message: 'Not logged in' }, 401)
    }

    const body = await c.req.json<{ faction: string }>()
    if (!isFactionId(body.faction)) {
      return c.json<ErrorResponse>({ status: 'error', message: 'Unknown faction' }, 400)
    }

    const existing = await redis.hGet(K.factions, username)
    if (existing && isFactionId(existing)) {
      const points = Number((await redis.get(K.points(username))) ?? '0')
      return c.json<JoinResponse>({ ok: false, faction: existing, points })
    }

    await redis.hSet(K.factions, { [username]: body.faction })
    await redis.hIncrBy(K.members, body.faction, 1)
    const points = await redis.incrBy(K.points(username), JOIN_BONUS)
    const name = FACTION_BY_ID[body.faction]!.name
    await logEvent(`u/${username} joined ${name}`)

    return c.json<JoinResponse>({ ok: true, faction: body.faction, points })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return c.json<ErrorResponse>({ status: 'error', message: msg }, 500)
  }
})

world.post('/invest', async (c) => {
  try {
    const username = await reddit.getCurrentUsername()
    if (!username) {
      return c.json<ErrorResponse>({ status: 'error', message: 'Not logged in' }, 401)
    }

    const factionRaw = await redis.hGet(K.factions, username)
    if (!factionRaw || !isFactionId(factionRaw)) {
      return c.json<ErrorResponse>({ status: 'error', message: 'Join a faction first' }, 400)
    }
    const faction = factionRaw

    const body = await c.req.json<{ region: string; amount: number }>()
    const region = REGION_BY_ID[body.region]
    if (!region) {
      return c.json<ErrorResponse>({ status: 'error', message: 'Unknown region' }, 400)
    }
    const amount = Math.floor(body.amount)
    if (!Number.isFinite(amount) || amount < 1 || amount > 10000) {
      return c.json<ErrorResponse>({ status: 'error', message: 'Invalid amount' }, 400)
    }

    const balance = Number((await redis.get(K.points(username))) ?? '0')
    if (amount > balance) {
      return c.json<ErrorResponse>({ status: 'error', message: 'Not enough influence points' }, 400)
    }

    const before = toRegionState(region.id, (await redis.hGetAll(K.region(region.id))) ?? {})
    await redis.incrBy(K.points(username), -amount)
    await redis.hIncrBy(K.region(region.id), faction, amount)
    const afterRaw = (await redis.hGetAll(K.region(region.id))) ?? {}
    const after = toRegionState(region.id, afterRaw)

    if (after.controller && after.controller !== before.controller) {
      const name = FACTION_BY_ID[after.controller]!.name
      await logEvent(`${name} took the lead in ${region.name}`)
    }

    const points = Number((await redis.get(K.points(username))) ?? '0')
    return c.json<InvestResponse>({ ok: true, points, region: after })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return c.json<ErrorResponse>({ status: 'error', message: msg }, 500)
  }
})

world.post('/earn', async (c) => {
  try {
    const username = await reddit.getCurrentUsername()
    if (!username) {
      return c.json<ErrorResponse>({ status: 'error', message: 'Not logged in' }, 401)
    }

    const body = await c.req.json<{ game: string; score: number }>()
    const limit = EARN_LIMITS[body.game]
    if (limit == null) {
      return c.json<ErrorResponse>({ status: 'error', message: 'Unknown game' }, 400)
    }
    const score = Math.floor(body.score)
    if (!Number.isFinite(score) || score < 0 || score > 1000) {
      return c.json<ErrorResponse>({ status: 'error', message: 'Invalid score' }, 400)
    }

    // Spiel-Score in Einflusspunkte umrechnen
    let computed = 0
    if (body.game === 'quiz') computed = score * 2
    else if (body.game === 'sort') computed = score
    else if (body.game === 'higher') computed = score * 2

    const today = dateKey()
    const gameKey = K.earnedGame(body.game, today, username)
    const totalKey = K.earnedTotal(today, username)
    const gameEarned = Number((await redis.get(gameKey)) ?? '0')
    const totalEarned = Number((await redis.get(totalKey)) ?? '0')

    const earned = Math.max(
      0,
      Math.min(computed, limit - gameEarned, DAILY_EARN_CAP - totalEarned),
    )

    let faction: FactionId | null = null
    const f = await redis.hGet(K.factions, username)
    if (f && isFactionId(f)) faction = f

    let points = Number((await redis.get(K.points(username))) ?? '0')
    if (earned > 0) {
      await redis.incrBy(gameKey, earned)
      await redis.expire(gameKey, 60 * 60 * 48)
      await redis.incrBy(totalKey, earned)
      await redis.expire(totalKey, 60 * 60 * 48)
      points = await redis.incrBy(K.points(username), earned)
    }

    return c.json<EarnResponse>({ ok: true, earned, points, faction })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return c.json<ErrorResponse>({ status: 'error', message: msg }, 500)
  }
})

// Taeglicher Tick: leichter Verfall, damit die Karte in Bewegung bleibt,
// plus Tages-Zusammenfassung im Event-Log.
export const worldTick = new Hono()

worldTick.post('/world-tick', async (c) => {
  try {
    const regions = await readRegions()

    for (const r of regions) {
      for (const [faction, value] of Object.entries(r.influence)) {
        const decay = Math.floor(value * 0.05)
        if (decay > 0) {
          await redis.hIncrBy(K.region(r.id), faction, -decay)
        }
      }
    }

    const counts: Record<string, number> = {}
    for (const r of regions) {
      if (r.controller) counts[r.controller] = (counts[r.controller] ?? 0) + 1
    }
    const leader = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
    if (leader) {
      const name = FACTION_BY_ID[leader[0]]?.name ?? leader[0]
      await logEvent(`Daily report: ${name} leads with ${leader[1]} regions`)
    } else {
      await logEvent('Daily report: the world map is still open')
    }

    return c.json({ ok: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return c.json<ErrorResponse>({ status: 'error', message: msg }, 500)
  }
})
