import type { Request, Response } from 'express'
import type { RedisClientType } from 'redis'
import { sql } from '../../utils/database.utils.ts'

export async function healthCheckController(request: Request, response: Response): Promise<void> {
    let isHealthy = true

    try {
        await sql`SELECT 1`
    } catch {
        isHealthy = false
    }

    try {
        const redisClient = request.app.locals.redisClient as RedisClientType
        if (!redisClient) {
            isHealthy = false
        } else {
            const timeout = new Promise((_, reject) => setTimeout(() => reject(), 2000))
            await Promise.race([redisClient.ping(), timeout])
        }
    } catch {
        isHealthy = false
    }

    response.status(isHealthy ? 200 : 503).json({ status: isHealthy ? 'healthy' : 'unhealthy' })
}