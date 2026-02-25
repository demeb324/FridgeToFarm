export function RecipeCard(props: {recipe: { image: string, name: string}}) {
    return (
        <>

            <div className="md:mx-0 mx-16 flex flex-col">
                <div className="md:mx-0 mx-16">
                    <img className="mb-2" src={props.recipe.image} alt={props.recipe.name}/>
                </div>
                <p className="p-4 text-center flex-grow">{props.recipe.name}</p>
            </div>

        </>
    )
}
