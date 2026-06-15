export default function Home() {
  return (
    <main className="min-h-screen bg-stone-50">
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto flex justify-between items-center px-6 py-5">
          <div>
            <h1 className="text-3xl font-bold">
              Equishopper
            </h1>

            <p className="text-gray-500">
              Køb og sælg brugt rideudstyr
            </p>
          </div>

          <div className="flex gap-3">
            <button className="border rounded-full px-5 py-2">
              Log ind
            </button>

            <button className="bg-black text-white rounded-full px-5 py-2">
              Opret annonce
            </button>
          </div>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-5xl font-bold mb-6">
          Danmarks markedsplads for brugt rideudstyr 🐴
        </h2>

        <p className="text-xl text-gray-600 mb-10">
          Find sadler, trenser, dækkener, ridebukser og meget mere.
        </p>

        <div className="flex gap-3">
          <input
            className="border rounded-full px-6 py-4 flex-1"
            placeholder="Søg efter rideudstyr..."
          />

          <button className="bg-black text-white rounded-full px-8">
            Søg
          </button>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-20">
        <h3 className="text-3xl font-bold mb-8">
          Populære kategorier
        </h3>

        <div className="grid md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-8 shadow">
            Sadler
          </div>

          <div className="bg-white rounded-2xl p-8 shadow">
            Dækkener
          </div>

          <div className="bg-white rounded-2xl p-8 shadow">
            Trenser
          </div>

          <div className="bg-white rounded-2xl p-8 shadow">
            Ridestøvler
          </div>
        </div>
      </section>
    </main>
  );
}


