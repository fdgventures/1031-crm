export const metadata = {
  title: "Messages | Exchange CRM",
};

export default function MessagePage() {
  return (
    <div className="space-y-6">
      <header className="rounded-xl bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-bold text-gray-900">Messages</h1>
        <p className="mt-2 text-sm text-gray-600">
          Centralize conversations with intermediaries, clients, and team
          members.
        </p>
      </header>

      <section className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900">Inbox</h2>
        <p className="mt-2 text-sm text-gray-600">
          No messages yet. Start a new conversation to keep everyone aligned on
          critical deadlines.
        </p>
      </section>

      <section className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900">Shortcuts</h2>
        <ul className="mt-3 space-y-2 text-sm text-gray-600">
          <li>• Create message templates for common client updates.</li>
          <li>• Share transaction milestones with stakeholders.</li>
          <li>• Save draft replies for later.</li>
        </ul>
      </section>
    </div>
  );
}

