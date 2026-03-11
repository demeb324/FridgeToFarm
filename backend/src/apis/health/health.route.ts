import { Router } from 'express'
import { healthCheckController } from './health.controller.ts'

const basePath = '/apis/health' as const
const router = Router()

/**
 * GET /apis/health
 * Health check endpoint for monitoring and container orchestration
 */
router.route('/')
    .get(healthCheckController)

export const healthRoute = { basePath, router }