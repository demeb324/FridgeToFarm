import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
    index("routes/home/home.tsx"),
    route("/recipe", "routes/recipe/recipe.tsx"),
    route("/meals", "routes/meals/meals.tsx"),
] satisfies RouteConfig;