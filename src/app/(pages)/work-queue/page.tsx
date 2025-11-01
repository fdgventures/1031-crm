export const metadata = {
  title: "Work Queue | Exchange CRM",
  description:
    "Unified task list across profiles, properties, exchanges, and transactions.",
};

const sections = [
  {
    title: "Profiles",
    description:
      "Follow up on missing contact information, invitations, and verification requests.",
    tasks: [
      {
        title: "Send onboarding email to pending invitees",
        due: "Due today",
        assignee: "Team Inbox",
      },
      {
        title: "Review profile updates submitted this week",
        due: "Tomorrow",
        assignee: "Client Success",
      },
    ],
  },
  {
    title: "Properties",
    description:
      "Track ownership confirmations, document uploads, and appraisal milestones.",
    tasks: [
      {
        title: "Upload purchase agreement for 12 Oak Street",
        due: "In 2 days",
        assignee: "Transactions",
      },
      {
        title: "Confirm vesting details for pending sellers",
        due: "This week",
        assignee: "Property Ops",
      },
    ],
  },
  {
    title: "Exchanges",
    description:
      "Monitor identification deadlines, intermediary requests, and client outreach.",
    tasks: [
      {
        title: "Schedule 45-day checkpoint call for EX-1045",
        due: "Friday",
        assignee: "Advisory",
      },
      {
        title: "Prepare replacement property shortlist for EX-1078",
        due: "Next Monday",
        assignee: "Research",
      },
    ],
  },
  {
    title: "Transactions",
    description:
      "Coordinate closing packages, non-exchange participants, and funding releases.",
    tasks: [
      {
        title: "Collect signatures for TRX-230 billing statement",
        due: "In 3 days",
        assignee: "Settlement",
      },
      {
        title: "Verify wire instructions with closing agent",
        due: "Next week",
        assignee: "Finance",
      },
    ],
  },
];

export default function WorkQueuePage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="rounded-xl bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-bold text-gray-900">Work Queue</h1>
          <p className="mt-2 text-sm text-gray-600">
            A consolidated list of actionable tasks across every client workflow.
            Use this queue to keep the team aligned and ensure nothing falls
            through the cracks.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-2">
          {sections.map((section) => (
            <section
              key={section.title}
              className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {section.title}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {section.description}
                </p>
              </div>

              <ul className="space-y-3">
                {section.tasks.map((task) => (
                  <li
                    key={task.title}
                    className="flex items-start justify-between rounded-lg border border-gray-100 bg-gray-50 p-4"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {task.title}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        Owner: {task.assignee}
                      </p>
                    </div>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                      {task.due}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <footer className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">
            Coming Soon
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            This queue is the first iteration. Automated ingest from profiles,
            properties, exchanges, and transactions is on the roadmap so your
            team can manage every deadline from one screen.
          </p>
        </footer>
      </div>
    </div>
  );
}
