import { Hono } from 'hono'
import { context, reddit, redis } from '@devvit/web/server'
import type { InitResponse, LeaderboardResponse, ScoreSubmitResponse } from '../../shared/api'

type ErrorResponse = {
  status: 'error'
  message: string
}

const LEADERBOARD_KEY = 'higher:leaderboard'
const LEADERBOARD_SIZE = 10

export const api = new Hono()

api.get('/init', async (c) => {
  const { postId } = context

  if (!postId) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'postId is required but missing from context' },
      400,
    )
  }

  try {
    const username = await reddit.getCurrentUsername()
    return c.json<InitResponse>({
      type: 'init',
      postId,
      username: username ?? 'anonymous',
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return c.json<ErrorResponse>({ status: 'error', message: msg }, 400)
  }
})

api.get('/higher/leaderboard', async (c) => {
  try {
    const top = await redis.zRange(LEADERBOARD_KEY, 0, LEADERBOARD_SIZE - 1, {
      by: 'rank',
      reverse: true,
    })

    const entries = top.map((e, i) => ({
      username: e.member,
      score: e.score,
      rank: i + 1,
    }))

    let userEntry: LeaderboardResponse['userEntry']
    try {
      const username = await reddit.getCurrentUsername()
      if (username) {
        const userScore = await redis.zScore(LEADERBOARD_KEY, username)
        if (userScore != null) {
          const rank = await redis.zRank(LEADERBOARD_KEY, username)
          const total = await redis.zCard(LEADERBOARD_KEY)
          userEntry = {
            username,
            score: userScore,
            rank: rank != null ? total - rank : 0,
          }
        }
      }
    } catch {
      // user not logged in or no score yet
    }

    return c.json<LeaderboardResponse>({ entries, userEntry })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return c.json<ErrorResponse>({ status: 'error', message: msg }, 500)
  }
})

api.post('/higher/score', async (c) => {
  try {
    const username = await reddit.getCurrentUsername()
    if (!username) {
      return c.json<ErrorResponse>({ status: 'error', message: 'Not logged in' }, 401)
    }

    const body = await c.req.json<{ score: number }>()
    const score = Math.floor(body.score)
    if (score < 1 || score > 10000) {
      return c.json<ErrorResponse>({ status: 'error', message: 'Invalid score' }, 400)
    }

    const existing = await redis.zScore(LEADERBOARD_KEY, username)
    const isNewBest = existing == null || score > existing

    if (isNewBest) {
      await redis.zAdd(LEADERBOARD_KEY, { member: username, score })
    }

    const rank = await redis.zRank(LEADERBOARD_KEY, username)
    const total = await redis.zCard(LEADERBOARD_KEY)

    return c.json<ScoreSubmitResponse>({
      accepted: isNewBest,
      newBest: isNewBest,
      previousBest: existing ?? undefined,
      rank: rank != null ? total - rank : 0,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return c.json<ErrorResponse>({ status: 'error', message: msg }, 500)
  }
})
