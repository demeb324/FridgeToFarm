export default function mealsPage () {
    return (
        <section className="container mx-auto my-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-32">
            <div>
                <img className="rounded-full w-1/2 mx-auto md:w-full" src="cheese-pizza.jpeg" alt="background picture"/>
                <p className="bg-slate-300 border-4 rounded-xl mt-4 mx-16 md:mx-0 p-4">
                    Ben's pizzaria!
                </p>
                <p className="bg-slate-300 border-4 rounded-xl mt-4 mx-64 md:mx-0 p-4">
                    ⭐⭐⭐⭐⭐
                </p>
            </div>
            <div>
                <img className="rounded-full w-1/2 mx-auto md:w-full" src="haw-pizza.jpeg" alt="background picture"/>
                <p className="bg-slate-300 border-4 rounded-xl mt-4 mx-16 md:mx-0 p-4">
                    Martin's pizzaria!
                </p>
                <p className="bg-slate-300 border-4 rounded-xl mt-4 mx-64 md:mx-0 p-4">
                    ⭐⭐⭐⭐⭐
                </p>
            </div>
            <div>
                <img className="rounded-full w-1/2 mx-auto md:w-full" src="marg-pizza.jpeg" alt="background picture"/>
                <p className="bg-slate-300 border-4 rounded-xl mt-4 mx-16 md:mx-0 p-4">
                   Perla's Pizza 
                </p>
            </div>
            <p className="bg-slate-300 border-4 rounded-xl mt-4 mx-64 md:mx-0 p-4">
                ⭐⭐⭐⭐⭐
            </p>
            <div>
                <img className="rounded-full w-1/2 mx-auto md:w-full" src="pep-pizza.jpeg" alt="background picture"/>
                <p className="bg-slate-300 border-4 rounded-xl mt-4 mx-16 md:mx-0 p-4">
                   Marty's Pizzaria!
                </p>
                <p className="bg-slate-300 border-4 rounded-xl mt-4 mx-64 md:mx-0 p-4">
                    ⭐⭐⭐⭐⭐
                </p>
            </div>
        </section>
    )
}