export const metadata = {
  title: "Logs | Exchange CRM",
};

export default function LogsPage() {
  return (
    <div className="space-y-6">
      <header className="rounded-xl bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-bold text-gray-900">Logs</h1>
        <p className="mt-2 text-sm text-gray-600">
          Monitor key actions, approvals, and compliance events across the
          platform.
        </p>
      </header>

      <section className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900">Activity feed</h2>
        <p className="mt-2 text-sm text-gray-600">
          System events will appear here. Use filters to focus on exchanges,
          properties, or financial transactions.
        </p>
      </section>

      <section className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900">Retention policy</h2>
        <p className="mt-2 text-sm text-gray-600">
          Logs are stored securely for seven years to meet IRS recordkeeping
          requirements.
        </p>
      </section>
    </div>
  );
}

