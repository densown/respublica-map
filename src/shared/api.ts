export type InitResponse = {
  type: 'init'
  postId: string
  username: string
}

export type LeaderboardEntry = {
  username: string
  score: number
  rank: number
}

export type LeaderboardResponse = {
  entries: LeaderboardEntry[]
  userEntry?: LeaderboardEntry
}

export type ScoreSubmitResponse = {
  accepted: boolean
  newBest: boolean
  previousBest?: number
  rank: number
}
