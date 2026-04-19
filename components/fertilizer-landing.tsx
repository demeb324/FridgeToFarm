const availabilityPoints = [
  {
    name: "Mesa Verde Bistro",
    type: "Restaurant source",
    location: "Downtown collection zone",
    volume: "14 bins ready",
    window: "Pickup by 10:30 AM",
    status: "Ready now",
  },
  {
    name: "Green Bowl Kitchen",
    type: "Prepared food partner",
    location: "Midtown corridor",
    volume: "8 bins ready",
    window: "Pickup by 1:00 PM",
    status: "Queued",
  },
  {
    name: "Harvest Square Market",
    type: "Retail food source",
    location: "North market route",
    volume: "11 bins ready",
    window: "Pickup by 2:15 PM",
    status: "Ready now",
  },
];

const dispatchCards = [
  {
    title: "Available pickup sources",
    value: "3 live stops",
    body: "Restaurants and markets with food-waste output ready for driver pickup.",
  },
  {
    title: "Drivers in range",
    value: "5 drivers",
    body: "Drivers that can accept a route and move material to a processing or farm destination.",
  },
  {
    title: "Farm deliveries today",
    value: "2 drop-offs",
    body: "Farmers scheduled to receive processed organic fertilizer from the route network.",
  },
];

const routeFlow = [
  {
    step: "01",
    title: "Source becomes available",
    body: "Restaurants mark organic material as ready, including quantity, pickup window, and contamination notes.",
  },
  {
    step: "02",
    title: "Driver accepts route",
    body: "A nearby driver sees the stop, confirms capacity, and starts a pickup route from the source location.",
  },
  {
    step: "03",
    title: "Material moves through processing",
    body: "Collected food waste is routed to a composting or conversion site where it becomes fertilizer-ready output.",
  },
  {
    step: "04",
    title: "Farmer receives delivery",
    body: "Processed material is sent onward to the farm with delivery timing, quantity, and application notes.",
  },
];

const farmerRequests = [
  {
    farm: "Sunrise Family Farm",
    crop: "Vegetables and herbs",
    need: "2 pallets of finished fertilizer",
    eta: "Delivery requested this afternoon",
  },
  {
    farm: "Rio Grande Growers",
    crop: "Mixed row crops",
    need: "1 pallet test load",
    eta: "Delivery requested tomorrow morning",
  },
];

export function FertilizerLanding() {
  return (
    <div className="min-h-screen bg-white text-stone-900">
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[2.5rem] border border-emerald-100 bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.12),_transparent_34%),linear-gradient(180deg,#ffffff_0%,#f6fbf5_100%)] p-8 shadow-[0_30px_80px_-55px_rgba(21,128,61,0.45)] sm:p-12">
          <div className="max-w-4xl">
            <div className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1 text-sm font-semibold text-emerald-800">
              Circular agriculture demo
            </div>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-stone-950 sm:text-6xl">
              Turning Restaurant Food Waste Into Agricultural Fertilizer
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-stone-600">
              A dispatch-style frontend for showing where food-waste material is available, which drivers can collect it, and how it reaches farmers as usable fertilizer.
            </p>
          </div>
        </section>

        <section className="py-16">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-700">Live Availability</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
              See where food-waste material is ready for pickup.
            </h2>
          </div>
          <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="grid gap-4">
              {availabilityPoints.map((point) => (
                <article
                  key={point.name}
                  className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-[0_20px_40px_-35px_rgba(41,37,36,0.4)]"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">{point.type}</p>
                      <h3 className="mt-2 text-xl font-semibold text-stone-950">{point.name}</h3>
                      <p className="mt-2 text-sm leading-7 text-stone-600">{point.location}</p>
                    </div>
                    <div className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800">
                      {point.status}
                    </div>
                  </div>
                  <div className="mt-5 grid gap-4 text-sm text-stone-600 sm:grid-cols-2">
                    <div>
                      <p className="font-semibold text-stone-900">Available volume</p>
                      <p className="mt-1">{point.volume}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-stone-900">Pickup window</p>
                      <p className="mt-1">{point.window}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="space-y-4">
              {dispatchCards.map((card) => (
                <article
                  key={card.title}
                  className="rounded-[2rem] border border-emerald-100 bg-[linear-gradient(180deg,#ffffff_0%,#f7fcf5_100%)] p-6 shadow-[0_20px_40px_-35px_rgba(21,128,61,0.35)]"
                >
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">{card.title}</p>
                  <p className="mt-3 text-3xl font-semibold text-stone-950">{card.value}</p>
                  <p className="mt-3 text-sm leading-7 text-stone-600">{card.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="py-8">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-700">Operational Flow</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
              Route material from restaurant availability to farm delivery.
            </h2>
          </div>
          <div className="mt-8 grid gap-6 lg:grid-cols-4">
            {routeFlow.map((item) => (
              <article
                key={item.step}
                className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-[0_20px_40px_-35px_rgba(41,37,36,0.35)]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-700 text-sm font-semibold text-white">
                  {item.step}
                </div>
                <h3 className="mt-5 text-xl font-semibold text-stone-950">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-stone-600">{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="py-16">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-700">Farmer Delivery Queue</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
              Match processed fertilizer loads with farmers ready to receive them.
            </h2>
          </div>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {farmerRequests.map((request) => (
              <article
                key={request.farm}
                className="rounded-[2rem] border border-stone-200 bg-[linear-gradient(135deg,#f6fbf5_0%,#fffaf1_100%)] p-6 shadow-[0_20px_40px_-35px_rgba(41,37,36,0.35)]"
              >
                <h3 className="text-xl font-semibold text-stone-950">{request.farm}</h3>
                <div className="mt-5 grid gap-4 text-sm text-stone-600">
                  <div>
                    <p className="font-semibold text-stone-900">Crop profile</p>
                    <p className="mt-1">{request.crop}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-stone-900">Requested amount</p>
                    <p className="mt-1">{request.need}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-stone-900">Delivery timing</p>
                    <p className="mt-1">{request.eta}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
