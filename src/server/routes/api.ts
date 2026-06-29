import { Hono } from 'hono'
import { context, reddit } from '@devvit/web/server'
import type { InitResponse } from '../../shared/api'

type ErrorResponse = {
  status: 'error'
  message: string
}

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
