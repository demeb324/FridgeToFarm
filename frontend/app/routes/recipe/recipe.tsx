import { useState } from "react";

const recipe = {
    title: "Sarah's Easy Shredded Chicken Taco Filling",
    rating: 4.5,
    ratingCount: 2358,
    reviewCount: 90,
    photoCount: 30,
    prepTime: "15 min",
    cookTime: "15 min",
    totalTime: "30 min",
    servings: 4,
    ingredients: [
        "1 lb boneless, skinless chicken breasts",
        "1 onion",
        "½ tomatoe",
        "1 tbsp olive oil",
        "Salt and pepper to taste",
    //     salt, pepper and olive oil is from other page?
    ],
    steps: [
        "turn on the stove.",
        "add some oil.",
        "add the onions, tomatoes and chicken.",
    ],
    nutrition: { calories: 213, fat: "6g", carbs: "1g", protein: "35g" },
};

export default function Recipe(): Element {
    const [selectedStar, setSelectedStar] = useState(0);
    const [reviewText, setReviewText] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        alert(`Rating: ${selectedStar} stars\nReview: ${reviewText}`);
    };

    return (
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: 20, fontFamily: "sans-serif" }}>

            {/* view in home page section 2 */}
            <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
                <div style={{ width: 120, height: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    Picture
                </div>
                <div>
                    <h1 style={{ fontSize: 20, margin: "0 0 8px" }}>{recipe.title}</h1>
                    <div>
                        {[1,2,3,4,5].map((n) => (
                            <span key={n}>{n <= Math.round(recipe.rating) ? "★" : "☆"}</span>
                        ))}
                        <span> {recipe.rating} &nbsp; {recipe.ratingCount.toLocaleString()} Ratings</span>
                    </div>
                    <p>{recipe.reviewCount} Reviews</p>
                    <p>{recipe.photoCount} Photos</p>
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                        <button>Save</button>
                        <button>Rate</button>
                        <button>Print</button>
                        <button>Share</button>
                    {/*    what is the page that has the information of the button or how do I link this*/}
                    </div>
                </div>
            </div>



            {/* picture */}
            <div style={{ marginBottom: 16 }}>
                <h2>Photos:</h2>
                <div style={{ display: "flex", gap: 8 }}>
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} style={{ width: 90, height: 65, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>
                            Picture
                        </div>
                    ))}
                </div>
            </div>



            {/* TIME & SERVINGS */}
            <div style={{ display: "flex", gap: 32, marginBottom: 16 }}>
                <div><strong>Prep Time:</strong><br />{recipe.prepTime}</div>
                <div><strong>Cook Time:</strong><br />{recipe.cookTime}</div>
                <div><strong>Total Time:</strong><br />{recipe.totalTime}</div>
                <div><strong>Servings:</strong><br />{recipe.servings}</div>
            </div>



            {/* INGREDIENTS */}
            <div style={{ marginBottom: 16 }}>
                <h2>Ingredients:</h2>
                <ul>
                    {recipe.ingredients.map((item, i) => (
                        <li key = {i}> {item} </li>
                    ))}
                </ul>
            </div>



            {/* DIRECTIONS */}
            <div style={{ marginBottom: 16 }}>
                <h2>Directions:</h2>
                {recipe.steps.map((text, i) => (
                    <div key={i} style={{ marginBottom: 16 }}>
                        <strong>Step {i + 1}:</strong>
                        <p>{text}</p>
                        <div style={{ width: 150, height: 110, border: "1px solid black", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            Picture
                        </div>
                    </div>
                ))}
            </div>



            {/* NUTRITION */}
            <div style={{ marginBottom: 16 }}>
                <h2>Nutrition Facts (per serving):</h2>
                <div style={{ display: "flex", gap: 40, marginBottom: 12 }}>
                    <div>{recipe.nutrition.calories}<br /><small>Calories</small></div>
                    <div>{recipe.nutrition.fat}<br /><small>Fat</small></div>
                    <div>{recipe.nutrition.carbs}<br /><small>Carbs</small></div>
                    <div>{recipe.nutrition.protein}<br /><small>Protein</small></div>
                </div>
                <div style={{ textAlign: "center" }}>
                    <button>I MADE IT</button>
                </div>
            </div>



            {/* REVIEWS */}
            <div style={{ marginBottom: 32 }}>
                <h2>Reviews ({recipe.reviewCount})</h2>
                <form onSubmit={handleSubmit}>
                    <p><strong>My Rating</strong></p>
                    <div style={{ marginBottom: 8 }}>
                        {[1,2,3,4,5].map((n) => (
                            <span
                                key={n}
                                style={{ fontSize: 22, cursor: "pointer" }}
                                onClick={() => setSelectedStar(n)}
                            >
                {n <= selectedStar ? "★" : "☆"}
              </span>
                        ))}
                    </div>
                    <p><strong>My Review</strong></p>
                    <textarea
                        rows={5}
                        style={{ width: "100%", marginBottom: 8 }}
                        placeholder="What did you think about this recipe? Did you make any changes or notes?"
                        value={reviewText}
                        onChange={(e) => setReviewText(e.target.value)}
                    />
                    <br />
                    <button type="submit">Submit</button>
                </form>
            </div>

        </div>
    );
}