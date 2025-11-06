"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { getAllEntities, type Entity } from "@/lib/entities";
import { CreateEntityModal } from "@/components/CreateEntityModal";

export default function EntitiesPage() {
  const router = useRouter();
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    document.title = "Entities | 1031 Exchange CRM";
  }, []);

  const loadEntities = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAllEntities();
      setEntities(data);
    } catch (error) {
      console.error("Error loading entities:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEntities();
  }, [loadEntities]);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-900">Entities</h1>
            <Button
              onClick={() => setShowCreateModal(true)}
              variant="primary"
            >
              + Create Entity
            </Button>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin h-12 w-12 border-2 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading...</p>
              </div>
            ) : entities.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600 mb-4">No entities created yet</p>
                <Button onClick={() => setShowCreateModal(true)} variant="primary">
                  Create First Entity
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {entities.map((entity) => (
                  <div
                    key={entity.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => router.push(`/entities/${entity.id}`)}
                  >
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {entity.name}
                    </h3>
                    {entity.email && (
                      <p className="text-sm text-gray-600">{entity.email}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      Created: {new Date(entity.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateEntityModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={(id) => {
            setShowCreateModal(false);
            router.push(`/entities/${id}`);
          }}
        />
      )}
    </div>
  );
}

