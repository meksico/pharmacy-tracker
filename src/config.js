import { getConfig } from './sheets.js'

let cache = null

export async function getOpenAIKey() {
  if (!cache) cache = await getConfig()
  return cache.OPENAI_API_KEY ?? null
}
