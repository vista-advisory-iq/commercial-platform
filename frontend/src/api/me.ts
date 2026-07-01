import client from './client'
import type { User } from '@/types'

export async function getMe(): Promise<User> {
  const res = await client.get('/me/')
  return res.data
}
