import express, {type Application } from 'express'
import morgan from 'morgan'
// Routes
import session from 'express-session'
import type {  RedisClientType } from 'redis'
import {RedisStore} from 'connect-redis'
import {indexRoute} from "./apis/index.route.ts";
import {healthRoute} from "./apis/health/health.route.ts";
import {signUpRoute} from "./apis/sign-up/sign-up.route.ts";
import {signInRoute} from "./apis/sign-in/sign-in.route.ts";
import {recipeRoute} from "./apis/recipe/recipe.route.ts";
import {reviewRoute} from "./apis/review/review.route.ts";
import {friendRoute} from "./apis/friend/friend.route.ts";
export class App {
    app: Application
    redisStore : RedisStore

    constructor (  redisClient: RedisClientType
    ) {
        this.redisStore = new RedisStore({client: redisClient})
        this.app = express()
        this.settings()
        this.middlewares()
        this.routes()
    }
    // private method that sets the port for the sever, to one from index.route.ts, and external .env file or defaults to 3000
    public settings (): void {}

    // private method to setting up the middleware to handle json responses, one for dev and one for prod
    private middlewares (): void {

        this.app.use(morgan('dev'))
        this.app.use(express.json())
        this.app.use(session( {
            store: this.redisStore,
            saveUninitialized: false,
            secret: process.env.SESSION_SECRET as string,
            resave: false
        }))
    }
    // private method for setting up routes in their basic sense (ie. any route that performs an action on profiles starts with /profiles)
    private routes (): void {
        this.app.use(indexRoute.basePath, indexRoute.router)
        this.app.use(healthRoute.basePath, healthRoute.router)
        this.app.use(signUpRoute.basePath, signUpRoute.router)
        this.app.use(signInRoute.basePath, signInRoute.router)
        this.app.use(recipeRoute.basePath, recipeRoute.router)
        this.app.use(reviewRoute.basepath, reviewRoute.router)
        this.app.use(friendRoute.basepath, friendRoute.router)
    }

    // starts the server and tells the terminal to post a message that the server is running and on what port
    public  listen (): void {
        this.app.listen(4200)
        console.log('Express application built successfully')
    }
}