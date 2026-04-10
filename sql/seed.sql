-- seed.sql
-- Inserts a seed user and 9 recipes (3 cuisines x 3 meal categories).
-- Safe to re-run: all inserts use ON CONFLICT DO NOTHING.

-- ── Seed user (required as foreign key for recipes) ────────────────────────
INSERT INTO "user" (id, activation_token, avatar_url, bio, created_at, email, hash, username)
VALUES (
    '01967f50-68c0-7000-8000-000000000001',
    NULL,
    NULL,
    'Recipe seed account',
    NOW(),
    'seed@ourgreatmeals.com',
    '$argon2id$v=19$m=65536,t=3,p=4$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    'seed_chef'
) ON CONFLICT DO NOTHING;

-- ── MEXICAN ────────────────────────────────────────────────────────────────

-- Breakfast
INSERT INTO recipe (id, user_id, title, cuisine, meal_category, prep_time, cook_time, total_time, servings, calories, carbs, fat_content, protein, image_url, ingredients, instructions)
VALUES (
    '01967f50-68c0-7000-8000-000000000002',
    '01967f50-68c0-7000-8000-000000000001',
    'Huevos Rancheros',
    'Mexican',
    'Breakfast',
    '10 min', '15 min', '25 min', 2,
    '420', '38g', '22g', '18g', NULL,
    '[
        {"name":"corn tortillas","amount":4,"units":"pieces"},
        {"name":"eggs","amount":4,"units":"large"},
        {"name":"black beans","amount":1,"units":"cup"},
        {"name":"salsa roja","amount":0.5,"units":"cup"},
        {"name":"cotija cheese","amount":2,"units":"tbsp"},
        {"name":"cilantro","amount":2,"units":"tbsp"}
    ]'::jsonb,
    '[
        {"stepNumber":1,"instruction":"Warm tortillas in a dry skillet over medium heat for 30 seconds per side. Keep warm."},
        {"stepNumber":2,"instruction":"Heat black beans in a small saucepan over medium heat. Season with salt."},
        {"stepNumber":3,"instruction":"Fry eggs in a lightly oiled skillet sunny-side up or over-easy."},
        {"stepNumber":4,"instruction":"Warm salsa roja in a small pan. Place tortillas on plates, top with beans, an egg, and salsa."},
        {"stepNumber":5,"instruction":"Finish with cotija cheese and fresh cilantro."}
    ]'::jsonb
) ON CONFLICT DO NOTHING;

-- Lunch
INSERT INTO recipe (id, user_id, title, cuisine, meal_category, prep_time, cook_time, total_time, servings, calories, carbs, fat_content, protein, image_url, ingredients, instructions)
VALUES (
    '01967f50-68c0-7000-8000-000000000003',
    '01967f50-68c0-7000-8000-000000000001',
    'Chicken Burrito Bowl',
    'Mexican',
    'Lunch',
    '15 min', '20 min', '35 min', 2,
    '580', '62g', '14g', '42g', NULL,
    '[
        {"name":"chicken breast","amount":2,"units":"pieces"},
        {"name":"cooked white rice","amount":2,"units":"cups"},
        {"name":"black beans","amount":1,"units":"cup"},
        {"name":"corn","amount":0.5,"units":"cup"},
        {"name":"pico de gallo","amount":0.5,"units":"cup"},
        {"name":"lime","amount":1,"units":"whole"},
        {"name":"cumin","amount":1,"units":"tsp"},
        {"name":"chili powder","amount":1,"units":"tsp"}
    ]'::jsonb,
    '[
        {"stepNumber":1,"instruction":"Season chicken with cumin, chili powder, salt, and pepper."},
        {"stepNumber":2,"instruction":"Cook chicken in a skillet over medium-high heat 6-7 min per side until cooked through. Rest 5 min then slice."},
        {"stepNumber":3,"instruction":"Warm black beans and corn in a small pot. Season with salt."},
        {"stepNumber":4,"instruction":"Build bowls: rice base, then beans, corn, sliced chicken, and pico de gallo."},
        {"stepNumber":5,"instruction":"Squeeze lime juice over the bowl before serving."}
    ]'::jsonb
) ON CONFLICT DO NOTHING;

-- Dinner
INSERT INTO recipe (id, user_id, title, cuisine, meal_category, prep_time, cook_time, total_time, servings, calories, carbs, fat_content, protein, image_url, ingredients, instructions)
VALUES (
    '01967f50-68c0-7000-8000-000000000004',
    '01967f50-68c0-7000-8000-000000000001',
    'Carne Asada Tacos',
    'Mexican',
    'Dinner',
    '15 min', '10 min', '25 min', 4,
    '510', '44g', '20g', '36g', NULL,
    '[
        {"name":"flank steak","amount":1,"units":"lb"},
        {"name":"corn tortillas","amount":8,"units":"pieces"},
        {"name":"white onion","amount":0.5,"units":"cup"},
        {"name":"cilantro","amount":0.25,"units":"cup"},
        {"name":"lime","amount":2,"units":"whole"},
        {"name":"orange juice","amount":0.25,"units":"cup"},
        {"name":"garlic","amount":3,"units":"cloves"},
        {"name":"jalapeno","amount":1,"units":"whole"}
    ]'::jsonb,
    '[
        {"stepNumber":1,"instruction":"Marinate steak in orange juice, minced garlic, lime juice, salt, and pepper for at least 30 min."},
        {"stepNumber":2,"instruction":"Grill or sear steak over high heat 3-4 min per side for medium. Rest 5 min."},
        {"stepNumber":3,"instruction":"Slice steak thinly against the grain."},
        {"stepNumber":4,"instruction":"Warm tortillas on a dry skillet."},
        {"stepNumber":5,"instruction":"Fill tortillas with steak, diced onion, cilantro, and a squeeze of lime."}
    ]'::jsonb
) ON CONFLICT DO NOTHING;

-- ── CHINESE ────────────────────────────────────────────────────────────────

-- Breakfast
INSERT INTO recipe (id, user_id, title, cuisine, meal_category, prep_time, cook_time, total_time, servings, calories, carbs, fat_content, protein, image_url, ingredients, instructions)
VALUES (
    '01967f50-68c0-7000-8000-000000000005',
    '01967f50-68c0-7000-8000-000000000001',
    'Congee with Pork',
    'Chinese',
    'Breakfast',
    '10 min', '40 min', '50 min', 4,
    '320', '48g', '8g', '16g', NULL,
    '[
        {"name":"jasmine rice","amount":1,"units":"cup"},
        {"name":"ground pork","amount":0.5,"units":"lb"},
        {"name":"chicken broth","amount":6,"units":"cups"},
        {"name":"ginger","amount":1,"units":"inch"},
        {"name":"green onions","amount":3,"units":"stalks"},
        {"name":"soy sauce","amount":2,"units":"tbsp"},
        {"name":"sesame oil","amount":1,"units":"tsp"}
    ]'::jsonb,
    '[
        {"stepNumber":1,"instruction":"Bring broth and sliced ginger to a boil. Add rice and reduce heat to a low simmer."},
        {"stepNumber":2,"instruction":"Cook, stirring occasionally, for 35-40 min until rice breaks down into a thick porridge."},
        {"stepNumber":3,"instruction":"Brown ground pork in a separate pan with soy sauce. Break into small pieces."},
        {"stepNumber":4,"instruction":"Stir pork into congee. Adjust seasoning with salt and soy sauce."},
        {"stepNumber":5,"instruction":"Serve topped with sliced green onions and a drizzle of sesame oil."}
    ]'::jsonb
) ON CONFLICT DO NOTHING;

-- Lunch
INSERT INTO recipe (id, user_id, title, cuisine, meal_category, prep_time, cook_time, total_time, servings, calories, carbs, fat_content, protein, image_url, ingredients, instructions)
VALUES (
    '01967f50-68c0-7000-8000-000000000006',
    '01967f50-68c0-7000-8000-000000000001',
    'Vegetable Fried Rice',
    'Chinese',
    'Lunch',
    '10 min', '15 min', '25 min', 2,
    '420', '68g', '10g', '12g', NULL,
    '[
        {"name":"jasmine rice","amount":3,"units":"cups"},
        {"name":"eggs","amount":2,"units":"large"},
        {"name":"carrots","amount":1,"units":"medium"},
        {"name":"frozen peas","amount":0.5,"units":"cup"},
        {"name":"soy sauce","amount":3,"units":"tbsp"},
        {"name":"sesame oil","amount":1,"units":"tsp"},
        {"name":"garlic","amount":2,"units":"cloves"},
        {"name":"green onions","amount":3,"units":"stalks"}
    ]'::jsonb,
    '[
        {"stepNumber":1,"instruction":"Use day-old rice. Heat oil in a wok over high heat until smoking."},
        {"stepNumber":2,"instruction":"Scramble eggs in the wok, breaking into small pieces. Push to the side."},
        {"stepNumber":3,"instruction":"Add garlic, carrots, and peas. Stir-fry 2 min."},
        {"stepNumber":4,"instruction":"Add rice. Press flat against the wok and cook undisturbed 1 min for crispy bits."},
        {"stepNumber":5,"instruction":"Add soy sauce and sesame oil. Toss well. Top with green onions."}
    ]'::jsonb
) ON CONFLICT DO NOTHING;

-- Dinner
INSERT INTO recipe (id, user_id, title, cuisine, meal_category, prep_time, cook_time, total_time, servings, calories, carbs, fat_content, protein, image_url, ingredients, instructions)
VALUES (
    '01967f50-68c0-7000-8000-000000000007',
    '01967f50-68c0-7000-8000-000000000001',
    'Kung Pao Chicken',
    'Chinese',
    'Dinner',
    '15 min', '15 min', '30 min', 4,
    '490', '22g', '24g', '44g', NULL,
    '[
        {"name":"chicken thighs","amount":1.5,"units":"lbs"},
        {"name":"peanuts","amount":0.5,"units":"cup"},
        {"name":"dried red chilies","amount":6,"units":"whole"},
        {"name":"soy sauce","amount":3,"units":"tbsp"},
        {"name":"rice vinegar","amount":2,"units":"tbsp"},
        {"name":"hoisin sauce","amount":1,"units":"tbsp"},
        {"name":"cornstarch","amount":1,"units":"tbsp"},
        {"name":"garlic","amount":4,"units":"cloves"}
    ]'::jsonb,
    '[
        {"stepNumber":1,"instruction":"Cut chicken into 1-inch cubes. Toss with 1 tbsp soy sauce and cornstarch. Let sit 10 min."},
        {"stepNumber":2,"instruction":"Mix remaining soy sauce, rice vinegar, and hoisin in a small bowl for the sauce."},
        {"stepNumber":3,"instruction":"Heat oil in wok over high heat. Stir-fry dried chilies and garlic 30 seconds."},
        {"stepNumber":4,"instruction":"Add chicken. Stir-fry 5-6 min until cooked through and golden."},
        {"stepNumber":5,"instruction":"Pour in sauce and toss. Add peanuts, stir 1 min. Serve over steamed rice."}
    ]'::jsonb
) ON CONFLICT DO NOTHING;

-- ── MIDDLE EASTERN ─────────────────────────────────────────────────────────

-- Breakfast
INSERT INTO recipe (id, user_id, title, cuisine, meal_category, prep_time, cook_time, total_time, servings, calories, carbs, fat_content, protein, image_url, ingredients, instructions)
VALUES (
    '01967f50-68c0-7000-8000-000000000008',
    '01967f50-68c0-7000-8000-000000000001',
    'Shakshuka',
    'Middle Eastern',
    'Breakfast',
    '10 min', '20 min', '30 min', 2,
    '310', '22g', '16g', '18g', NULL,
    '[
        {"name":"eggs","amount":4,"units":"large"},
        {"name":"crushed tomatoes","amount":2,"units":"cups"},
        {"name":"red bell pepper","amount":1,"units":"whole"},
        {"name":"onion","amount":1,"units":"medium"},
        {"name":"garlic","amount":3,"units":"cloves"},
        {"name":"cumin","amount":1,"units":"tsp"},
        {"name":"paprika","amount":1,"units":"tsp"},
        {"name":"feta cheese","amount":0.25,"units":"cup"}
    ]'::jsonb,
    '[
        {"stepNumber":1,"instruction":"Saute diced onion and bell pepper in olive oil over medium heat until soft, about 5 min."},
        {"stepNumber":2,"instruction":"Add minced garlic, cumin, and paprika. Cook 1 min until fragrant."},
        {"stepNumber":3,"instruction":"Pour in crushed tomatoes. Season with salt and pepper. Simmer 10 min."},
        {"stepNumber":4,"instruction":"Make 4 wells in the sauce. Crack an egg into each well."},
        {"stepNumber":5,"instruction":"Cover and cook 5-7 min until whites are set but yolks are still runny. Top with feta."}
    ]'::jsonb
) ON CONFLICT DO NOTHING;

-- Lunch
INSERT INTO recipe (id, user_id, title, cuisine, meal_category, prep_time, cook_time, total_time, servings, calories, carbs, fat_content, protein, image_url, ingredients, instructions)
VALUES (
    '01967f50-68c0-7000-8000-000000000009',
    '01967f50-68c0-7000-8000-000000000001',
    'Falafel Wrap',
    'Middle Eastern',
    'Lunch',
    '20 min', '10 min', '30 min', 2,
    '520', '64g', '18g', '22g', NULL,
    '[
        {"name":"canned chickpeas","amount":2,"units":"cups"},
        {"name":"flatbread","amount":2,"units":"pieces"},
        {"name":"parsley","amount":0.25,"units":"cup"},
        {"name":"garlic","amount":2,"units":"cloves"},
        {"name":"cumin","amount":1,"units":"tsp"},
        {"name":"tahini","amount":3,"units":"tbsp"},
        {"name":"lemon juice","amount":2,"units":"tbsp"},
        {"name":"tomato","amount":1,"units":"medium"}
    ]'::jsonb,
    '[
        {"stepNumber":1,"instruction":"Blend chickpeas, parsley, garlic, cumin, salt, and flour in a food processor until coarse."},
        {"stepNumber":2,"instruction":"Form into 8 small patties. Refrigerate 15 min to firm up."},
        {"stepNumber":3,"instruction":"Pan-fry falafel in oil over medium heat 3 min per side until golden."},
        {"stepNumber":4,"instruction":"Whisk tahini with lemon juice and 2-3 tbsp water until pourable."},
        {"stepNumber":5,"instruction":"Warm flatbread. Layer with falafel, sliced tomato, and drizzle with tahini sauce."}
    ]'::jsonb
) ON CONFLICT DO NOTHING;

-- Dinner
INSERT INTO recipe (id, user_id, title, cuisine, meal_category, prep_time, cook_time, total_time, servings, calories, carbs, fat_content, protein, image_url, ingredients, instructions)
VALUES (
    '01967f50-68c0-7000-8000-00000000000a',
    '01967f50-68c0-7000-8000-000000000001',
    'Lamb Kebabs',
    'Middle Eastern',
    'Dinner',
    '20 min', '15 min', '35 min', 4,
    '560', '12g', '30g', '54g', NULL,
    '[
        {"name":"ground lamb","amount":1.5,"units":"lbs"},
        {"name":"onion","amount":0.5,"units":"medium"},
        {"name":"garlic","amount":3,"units":"cloves"},
        {"name":"cumin","amount":1,"units":"tsp"},
        {"name":"coriander","amount":1,"units":"tsp"},
        {"name":"cinnamon","amount":0.25,"units":"tsp"},
        {"name":"parsley","amount":0.25,"units":"cup"},
        {"name":"Greek yogurt","amount":0.5,"units":"cup"}
    ]'::jsonb,
    '[
        {"stepNumber":1,"instruction":"Combine lamb with grated onion, garlic, cumin, coriander, cinnamon, parsley, salt, and pepper."},
        {"stepNumber":2,"instruction":"Mix well by hand until uniform. Chill 15 min."},
        {"stepNumber":3,"instruction":"Divide into 8 portions. Shape each around a skewer into a 5-inch log."},
        {"stepNumber":4,"instruction":"Grill over medium-high heat 4-5 min per side until cooked through and charred."},
        {"stepNumber":5,"instruction":"Serve with Greek yogurt dipping sauce and warm flatbread."}
    ]'::jsonb
) ON CONFLICT DO NOTHING;
