import type { EarnResponse } from '../shared/world'

// Meldet einen Spiel-Score ans World Game. Gibt null zurueck, wenn nichts
// verdient wurde oder der Aufruf fehlschlaegt (Spiel funktioniert trotzdem).
export async function earnInfluence(
  game: 'quiz' | 'sort' | 'higher',
  score: number,
): Promise<EarnResponse | null> {
  if (score <= 0) return null
  try {
    const res = await fetch('/api/world/earn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game, score }),
    })
    if (!res.ok) return null
    const data = (await res.json()) as EarnResponse
    return data.earned > 0 ? data : null
  } catch {
    return null
  }
}
