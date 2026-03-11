import type { Request, Response } from 'express'

export function indexController (request: Request, response: Response): void {
    response.json('🤯 😬 😱')
}