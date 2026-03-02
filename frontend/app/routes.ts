import {type RouteConfig, index, route, layout} from "@react-router/dev/routes";

export default [
    layout('layouts/main.tsx', [
    index("routes/home/home.tsx"),
    route("/recipe", "routes/recipe/recipe.tsx"),
    route('/meals','routes/meals/meals.tsx')
    ])
] satisfies RouteConfig

