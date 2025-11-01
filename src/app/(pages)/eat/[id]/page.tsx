import { DocumentRepository } from "@/components/document-repository";
import { use } from "react";

export default function EATViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
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
      </div>
    </div>
  );
}


















