import { createCookieSessionStorage } from "react-router";
import type {User} from "~/utils/models/user.model";
import * as process from "node:process";

type SessionData = {
    user: User
    authorization: string
    ingredients: {[key:string]:string[]}
}

type SessionFlashData = {
    error: string;
};

const { getSession, commitSession, destroySession } =
    createCookieSessionStorage< SessionData , SessionFlashData>(
        {
            // a Cookie from `createCookie` or the CookieOptions to create one
            cookie: {
                name: "earl-grey",

                // Expires can also be set (although maxAge overrides it when used in combination).
                // Note that this method is NOT recommended as `new Date` creates only one date on each server deployment, not a dynamic date in the future!
                //
                // expires: new Date(Date.now() + 60_000),
                httpOnly: true,
                maxAge: 10800,
                path: "/",
                sameSite: "strict",
                secrets: [process.env.SESSION_SECRET_1 as string],
                secure: true,
            },
        }
    );

export { getSession, commitSession, destroySession };