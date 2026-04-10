import { v7 as uuidv7 } from 'uuid'
import { setHash } from './utils/auth.utils.ts'
import { insertUser } from './apis/user/user.model.ts'
import { insertRecipe } from './apis/recipe/recipe.model.ts'
import type { Recipe } from './apis/recipe/recipe.model.ts'
import { sql } from './utils/database.utils.ts'

// ---------------------------------------------------------------------------
// Seed user — all recipes are authored by this account
// ---------------------------------------------------------------------------
const SEED_USER_ID = '01967f50-68c0-7000-8000-000000000001'

async function seedUser (): Promise<void> {
  const existing = await sql`SELECT id FROM "user" WHERE id = ${SEED_USER_ID}`
  if (existing.length > 0) {
    console.log('Seed user already exists, skipping.')
    return
  }

  const hash = await setHash('SeedPassword1!')
  await insertUser({
    id: SEED_USER_ID,
    activationToken: null,
    avatarUrl: null,
    bio: 'Recipe seed account',
    createdAt: null,
    email: 'seed@ourgreatmeals.com',
    hash,
    username: 'seed_chef'
  })
  console.log('Seed user created.')
}

// ---------------------------------------------------------------------------
// Recipe data — 3 cuisines × 3 meal categories = 9 recipes
// ---------------------------------------------------------------------------
const recipes: Recipe[] = [
  // ── MEXICAN ───────────────────────────────────────────────────────────────
  {
    id: uuidv7(),
    userId: SEED_USER_ID,
    title: 'Huevos Rancheros',
    cuisine: 'Mexican',
    mealCategory: 'Breakfast',
    prepTime: '10 min',
    cookTime: '15 min',
    totalTime: '25 min',
    servings: 2,
    calories: '420',
    carbs: '38g',
    fatContent: '22g',
    protein: '18g',
    imageUrl: null,
    ingredients: [
      { name: 'corn tortillas', amount: 4, units: 'pieces' },
      { name: 'eggs', amount: 4, units: 'large' },
      { name: 'black beans', amount: 1, units: 'cup' },
      { name: 'salsa roja', amount: 0.5, units: 'cup' },
      { name: 'cotija cheese', amount: 2, units: 'tbsp' },
      { name: 'cilantro', amount: 2, units: 'tbsp' }
    ],
    instructions: [
      { stepNumber: 1, instruction: 'Warm tortillas in a dry skillet over medium heat for 30 seconds per side. Keep warm.' },
      { stepNumber: 2, instruction: 'Heat black beans in a small saucepan over medium heat. Season with salt.' },
      { stepNumber: 3, instruction: 'Fry eggs in a lightly oiled skillet to your liking (sunny-side up or over-easy).' },
      { stepNumber: 4, instruction: 'Warm salsa roja in a small pan. Place tortillas on plates, top with beans, an egg, and salsa.' },
      { stepNumber: 5, instruction: 'Finish with cotija cheese and fresh cilantro.' }
    ]
  },
  {
    id: uuidv7(),
    userId: SEED_USER_ID,
    title: 'Chicken Burrito Bowl',
    cuisine: 'Mexican',
    mealCategory: 'Lunch',
    prepTime: '15 min',
    cookTime: '20 min',
    totalTime: '35 min',
    servings: 2,
    calories: '580',
    carbs: '62g',
    fatContent: '14g',
    protein: '42g',
    imageUrl: null,
    ingredients: [
      { name: 'chicken breast', amount: 2, units: 'pieces' },
      { name: 'cooked white rice', amount: 2, units: 'cups' },
      { name: 'black beans', amount: 1, units: 'cup' },
      { name: 'corn', amount: 0.5, units: 'cup' },
      { name: 'pico de gallo', amount: 0.5, units: 'cup' },
      { name: 'lime', amount: 1, units: 'whole' },
      { name: 'cumin', amount: 1, units: 'tsp' },
      { name: 'chili powder', amount: 1, units: 'tsp' }
    ],
    instructions: [
      { stepNumber: 1, instruction: 'Season chicken with cumin, chili powder, salt, and pepper.' },
      { stepNumber: 2, instruction: 'Cook chicken in a skillet over medium-high heat 6-7 min per side until cooked through. Rest 5 min then slice.' },
      { stepNumber: 3, instruction: 'Warm black beans and corn in a small pot. Season with salt.' },
      { stepNumber: 4, instruction: 'Build bowls: rice base, then beans, corn, sliced chicken, and pico de gallo.' },
      { stepNumber: 5, instruction: 'Squeeze lime juice over the bowl before serving.' }
    ]
  },
  {
    id: uuidv7(),
    userId: SEED_USER_ID,
    title: 'Carne Asada Tacos',
    cuisine: 'Mexican',
    mealCategory: 'Dinner',
    prepTime: '15 min',
    cookTime: '10 min',
    totalTime: '25 min',
    servings: 4,
    calories: '510',
    carbs: '44g',
    fatContent: '20g',
    protein: '36g',
    imageUrl: null,
    ingredients: [
      { name: 'flank steak', amount: 1, units: 'lb' },
      { name: 'corn tortillas', amount: 8, units: 'pieces' },
      { name: 'white onion', amount: 0.5, units: 'cup' },
      { name: 'cilantro', amount: 0.25, units: 'cup' },
      { name: 'lime', amount: 2, units: 'whole' },
      { name: 'orange juice', amount: 0.25, units: 'cup' },
      { name: 'garlic', amount: 3, units: 'cloves' },
      { name: 'jalapeño', amount: 1, units: 'whole' }
    ],
    instructions: [
      { stepNumber: 1, instruction: 'Marinate steak in orange juice, minced garlic, lime juice, salt, and pepper for at least 30 min.' },
      { stepNumber: 2, instruction: 'Grill or sear steak over high heat 3-4 min per side for medium. Rest 5 min.' },
      { stepNumber: 3, instruction: 'Slice steak thinly against the grain.' },
      { stepNumber: 4, instruction: 'Warm tortillas on a dry skillet.' },
      { stepNumber: 5, instruction: 'Fill tortillas with steak, diced onion, cilantro, and a squeeze of lime.' }
    ]
  },

  // ── CHINESE ───────────────────────────────────────────────────────────────
  {
    id: uuidv7(),
    userId: SEED_USER_ID,
    title: 'Congee with Pork',
    cuisine: 'Chinese',
    mealCategory: 'Breakfast',
    prepTime: '10 min',
    cookTime: '40 min',
    totalTime: '50 min',
    servings: 4,
    calories: '320',
    carbs: '48g',
    fatContent: '8g',
    protein: '16g',
    imageUrl: null,
    ingredients: [
      { name: 'jasmine rice', amount: 1, units: 'cup' },
      { name: 'ground pork', amount: 0.5, units: 'lb' },
      { name: 'chicken broth', amount: 6, units: 'cups' },
      { name: 'ginger', amount: 1, units: 'inch' },
      { name: 'green onions', amount: 3, units: 'stalks' },
      { name: 'soy sauce', amount: 2, units: 'tbsp' },
      { name: 'sesame oil', amount: 1, units: 'tsp' }
    ],
    instructions: [
      { stepNumber: 1, instruction: 'Bring broth and sliced ginger to a boil. Add rice and reduce heat to a low simmer.' },
      { stepNumber: 2, instruction: 'Cook, stirring occasionally, for 35-40 min until rice breaks down into a thick porridge.' },
      { stepNumber: 3, instruction: 'Brown ground pork in a separate pan with soy sauce. Break into small pieces.' },
      { stepNumber: 4, instruction: 'Stir pork into congee. Adjust seasoning with salt and soy sauce.' },
      { stepNumber: 5, instruction: 'Serve topped with sliced green onions and a drizzle of sesame oil.' }
    ]
  },
  {
    id: uuidv7(),
    userId: SEED_USER_ID,
    title: 'Vegetable Fried Rice',
    cuisine: 'Chinese',
    mealCategory: 'Lunch',
    prepTime: '10 min',
    cookTime: '15 min',
    totalTime: '25 min',
    servings: 2,
    calories: '420',
    carbs: '68g',
    fatContent: '10g',
    protein: '12g',
    imageUrl: null,
    ingredients: [
      { name: 'cooked jasmine rice', amount: 3, units: 'cups' },
      { name: 'eggs', amount: 2, units: 'large' },
      { name: 'carrots', amount: 1, units: 'medium' },
      { name: 'frozen peas', amount: 0.5, units: 'cup' },
      { name: 'soy sauce', amount: 3, units: 'tbsp' },
      { name: 'sesame oil', amount: 1, units: 'tsp' },
      { name: 'garlic', amount: 2, units: 'cloves' },
      { name: 'green onions', amount: 3, units: 'stalks' }
    ],
    instructions: [
      { stepNumber: 1, instruction: 'Use day-old rice. Heat oil in a wok over high heat until smoking.' },
      { stepNumber: 2, instruction: 'Scramble eggs in the wok, breaking into small pieces. Push to the side.' },
      { stepNumber: 3, instruction: 'Add garlic, carrots, and peas. Stir-fry 2 min.' },
      { stepNumber: 4, instruction: 'Add rice. Press flat against the wok and cook undisturbed 1 min for crispy bits.' },
      { stepNumber: 5, instruction: 'Add soy sauce and sesame oil. Toss well. Top with green onions.' }
    ]
  },
  {
    id: uuidv7(),
    userId: SEED_USER_ID,
    title: 'Kung Pao Chicken',
    cuisine: 'Chinese',
    mealCategory: 'Dinner',
    prepTime: '15 min',
    cookTime: '15 min',
    totalTime: '30 min',
    servings: 4,
    calories: '490',
    carbs: '22g',
    fatContent: '24g',
    protein: '44g',
    imageUrl: null,
    ingredients: [
      { name: 'chicken thighs', amount: 1.5, units: 'lbs' },
      { name: 'peanuts', amount: 0.5, units: 'cup' },
      { name: 'dried red chilies', amount: 6, units: 'whole' },
      { name: 'soy sauce', amount: 3, units: 'tbsp' },
      { name: 'rice vinegar', amount: 2, units: 'tbsp' },
      { name: 'hoisin sauce', amount: 1, units: 'tbsp' },
      { name: 'cornstarch', amount: 1, units: 'tbsp' },
      { name: 'garlic', amount: 4, units: 'cloves' }
    ],
    instructions: [
      { stepNumber: 1, instruction: 'Cut chicken into 1-inch cubes. Toss with 1 tbsp soy sauce and cornstarch. Let sit 10 min.' },
      { stepNumber: 2, instruction: 'Mix remaining soy sauce, rice vinegar, and hoisin in a small bowl for the sauce.' },
      { stepNumber: 3, instruction: 'Heat oil in wok over high heat. Stir-fry dried chilies and garlic 30 seconds.' },
      { stepNumber: 4, instruction: 'Add chicken. Stir-fry 5-6 min until cooked through and golden.' },
      { stepNumber: 5, instruction: 'Pour in sauce and toss. Add peanuts, stir 1 min. Serve over steamed rice.' }
    ]
  },

  // ── MIDDLE EASTERN ────────────────────────────────────────────────────────
  {
    id: uuidv7(),
    userId: SEED_USER_ID,
    title: 'Shakshuka',
    cuisine: 'Middle Eastern',
    mealCategory: 'Breakfast',
    prepTime: '10 min',
    cookTime: '20 min',
    totalTime: '30 min',
    servings: 2,
    calories: '310',
    carbs: '22g',
    fatContent: '16g',
    protein: '18g',
    imageUrl: null,
    ingredients: [
      { name: 'eggs', amount: 4, units: 'large' },
      { name: 'crushed tomatoes', amount: 28, units: 'oz can' },
      { name: 'red bell pepper', amount: 1, units: 'whole' },
      { name: 'onion', amount: 1, units: 'medium' },
      { name: 'garlic', amount: 3, units: 'cloves' },
      { name: 'cumin', amount: 1, units: 'tsp' },
      { name: 'paprika', amount: 1, units: 'tsp' },
      { name: 'feta cheese', amount: 0.25, units: 'cup' }
    ],
    instructions: [
      { stepNumber: 1, instruction: 'Sauté diced onion and bell pepper in olive oil over medium heat until soft, about 5 min.' },
      { stepNumber: 2, instruction: 'Add minced garlic, cumin, and paprika. Cook 1 min until fragrant.' },
      { stepNumber: 3, instruction: 'Pour in crushed tomatoes. Season with salt and pepper. Simmer 10 min.' },
      { stepNumber: 4, instruction: 'Make 4 wells in the sauce. Crack an egg into each well.' },
      { stepNumber: 5, instruction: 'Cover and cook 5-7 min until whites are set but yolks are still runny. Top with feta.' }
    ]
  },
  {
    id: uuidv7(),
    userId: SEED_USER_ID,
    title: 'Falafel Wrap',
    cuisine: 'Middle Eastern',
    mealCategory: 'Lunch',
    prepTime: '20 min',
    cookTime: '10 min',
    totalTime: '30 min',
    servings: 2,
    calories: '520',
    carbs: '64g',
    fatContent: '18g',
    protein: '22g',
    imageUrl: null,
    ingredients: [
      { name: 'canned chickpeas', amount: 15, units: 'oz can' },
      { name: 'flatbread', amount: 2, units: 'pieces' },
      { name: 'parsley', amount: 0.25, units: 'cup' },
      { name: 'garlic', amount: 2, units: 'cloves' },
      { name: 'cumin', amount: 1, units: 'tsp' },
      { name: 'tahini', amount: 3, units: 'tbsp' },
      { name: 'lemon juice', amount: 2, units: 'tbsp' },
      { name: 'tomato', amount: 1, units: 'medium' }
    ],
    instructions: [
      { stepNumber: 1, instruction: 'Blend chickpeas, parsley, garlic, cumin, salt, and flour in a food processor until coarse.' },
      { stepNumber: 2, instruction: 'Form into 8 small patties. Refrigerate 15 min to firm up.' },
      { stepNumber: 3, instruction: 'Pan-fry falafel in 1/4 inch of oil over medium heat 3 min per side until golden.' },
      { stepNumber: 4, instruction: 'Whisk tahini with lemon juice and 2-3 tbsp water until pourable.' },
      { stepNumber: 5, instruction: 'Warm flatbread. Layer with falafel, sliced tomato, and drizzle with tahini sauce.' }
    ]
  },
  {
    id: uuidv7(),
    userId: SEED_USER_ID,
    title: 'Lamb Kebabs',
    cuisine: 'Middle Eastern',
    mealCategory: 'Dinner',
    prepTime: '20 min',
    cookTime: '15 min',
    totalTime: '35 min',
    servings: 4,
    calories: '560',
    carbs: '12g',
    fatContent: '30g',
    protein: '54g',
    imageUrl: null,
    ingredients: [
      { name: 'ground lamb', amount: 1.5, units: 'lbs' },
      { name: 'onion', amount: 0.5, units: 'medium' },
      { name: 'garlic', amount: 3, units: 'cloves' },
      { name: 'cumin', amount: 1, units: 'tsp' },
      { name: 'coriander', amount: 1, units: 'tsp' },
      { name: 'cinnamon', amount: 0.25, units: 'tsp' },
      { name: 'parsley', amount: 0.25, units: 'cup' },
      { name: 'Greek yogurt', amount: 0.5, units: 'cup' }
    ],
    instructions: [
      { stepNumber: 1, instruction: 'Combine lamb with grated onion, minced garlic, cumin, coriander, cinnamon, parsley, salt, pepper.' },
      { stepNumber: 2, instruction: 'Mix well by hand until the meat is uniform. Chill 15 min.' },
      { stepNumber: 3, instruction: 'Divide into 8 portions. Shape each around a skewer into a 5-inch log.' },
      { stepNumber: 4, instruction: 'Grill over medium-high heat 4-5 min per side until cooked through and charred.' },
      { stepNumber: 5, instruction: 'Serve with Greek yogurt dipping sauce and warm flatbread.' }
    ]
  }
]

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main (): Promise<void> {
  console.log('Starting seed...')

  await seedUser()

  let inserted = 0
  let skipped = 0

  for (const recipe of recipes) {
    try {
      await insertRecipe(recipe)
      console.log(`  ✓ ${recipe.cuisine} ${recipe.mealCategory}: ${recipe.title}`)
      inserted++
    } catch (err: any) {
      if (err?.message?.includes('duplicate') || err?.code === '23505') {
        console.log(`  - Skipped (already exists): ${recipe.title}`)
        skipped++
      } else {
        console.error(`  ✗ Failed to insert "${recipe.title}":`, err.message)
      }
    }
  }

  console.log(`\nSeed complete: ${inserted} inserted, ${skipped} skipped.`)
  process.exit(0)
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
