export const metadata = {
  title: "Search | Exchange CRM",
};

export default function SearchPage() {
  return (
    <div className="space-y-6">
      <header className="rounded-xl bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-bold text-gray-900">Search</h1>
        <p className="mt-2 text-sm text-gray-600">
          Quickly find profiles, properties, transactions, and more.
        </p>
      </header>

      <section className="rounded-xl bg-white p-6 shadow-sm">
        <div className="mb-4">
          <label className="text-sm font-medium text-gray-700">
            Search term
          </label>
          <input
            type="text"
            placeholder="Type a keyword..."
            className="mt-2 w-full rounded-lg border border-gray-200 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <p className="text-sm text-gray-500">
          Use filters to narrow down results. Saved searches will appear here in
          the future.
        </p>
      </section>

      <section className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900">Recent searches</h2>
        <p className="mt-2 text-sm text-gray-600">
          You haven&apos;t performed any searches yet. Once you do, they will be
          listed here for quick access.
        </p>
      </section>
    </div>
  );
}

