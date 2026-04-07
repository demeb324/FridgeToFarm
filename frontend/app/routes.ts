import {type RouteConfig, index, route, layout} from "@react-router/dev/routes";

export default [
    layout('layouts/main.tsx', [

        index("routes/home/home.tsx"),
        route('/api/image/:id','routes/api/image.tsx'),
        route("/recipe", "routes/recipe/recipe.tsx"),
        route('/meals', 'routes/meals/meals.tsx'),
        route('/login', 'routes/login-newaccount/login.tsx'),
        route('/friends', 'routes/friends/friends.tsx'),
        route('/accountset', 'routes/account/accountset.tsx'),
        route('/items-list/:id', 'routes/items-list-page/items-list.tsx'),
        route('/recipe-generation', 'routes/recipe-generation/recipe-generation.tsx'),
        route("/allfriends", "routes/friends/allfriends.tsx"),
        route('/saved-recipes', 'routes/recipe/saved-recipes.tsx'),
        route("/friendprofile", "routes/friends/friendprofile.tsx"),
        route("/sign-up", "routes/sign-up/sign-up.tsx")

    ])

] satisfies RouteConfig

