'use client';

import { DocumentRepository } from "@/components/document-repository";
import { TaskManager } from "@/components/TaskManager";
import { LogViewer } from "@/components/LogViewer";
import { use, useState, useEffect } from "react";

export default function EATViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [logRefreshTrigger, setLogRefreshTrigger] = useState(0);

  // Set page title
  useEffect(() => {
    document.title = `EAT #${id} | 1031 Exchange CRM`;
  }, [id]);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">EAT View</h1>

          <div className="text-gray-600">
            <p>Детали EAT ID: {id}</p>
            <p className="mt-2 text-sm">Страница в разработке...</p>
          </div>
        </div>

        <DocumentRepository entityType="eat" entityId={id} />
        
        {/* Tasks Section */}
        <TaskManager
          entityType="eat"
          entityId={parseInt(id)}
          entityName={`EAT #${id}`}
          onLogCreate={() => setLogRefreshTrigger(Date.now())}
        />

        {/* Activity Log Section */}
        <LogViewer
          entityType="eat"
          entityId={parseInt(id)}
          entityName={`EAT #${id}`}
          refreshTrigger={logRefreshTrigger}
        />
      </div>
    </div>
  );
}


















