"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui";
import { createClient } from "@/lib/supabase-client";

export default function SetupPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const supabase = createClient();

  const handleSetup = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Проверяем, есть ли уже владелец workspace
      const { data: owner } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("email", "fdgventures@gmail.com")
        .single();

      if (owner) {
        // Обновляем существующего пользователя на workspace_owner
        const { error: updateError } = await supabase
          .from("user_profiles")
          .update({
            role: "platform_super_admin",
            role_type: "workspace_owner",
          })
          .eq("email", "fdgventures@gmail.com");

        if (updateError) throw updateError;
        setSuccess("Workspace owner setup complete!");
      } else {
        // Проверяем, есть ли пользователь в auth
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user && user.email === "fdgventures@gmail.com") {
          // Создаем профиль для владельца
          const { error: insertError } = await supabase
            .from("user_profiles")
            .insert({
              id: user.id,
              email: "fdgventures@gmail.com",
              role: "platform_super_admin",
              role_type: "workspace_owner",
              is_verified: user.email_confirmed_at !== null,
            });

          if (insertError) throw insertError;
          setSuccess("Workspace owner setup complete!");
        } else {
          setError("Please sign in with fdgventures@gmail.com first");
        }
      }
    } catch (err: any) {
      setError(err.message || "Setup failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Setup Workspace Owner
        </h2>
        <p className="text-gray-600 mb-6">
          This will set fdgventures@gmail.com as the workspace owner.
        </p>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-md p-4">
            <p className="text-sm text-green-600">{success}</p>
          </div>
        )}

        <Button
          onClick={handleSetup}
          disabled={isLoading}
          variant="primary"
          className="w-full"
        >
          {isLoading ? "Setting up..." : "Setup Workspace Owner"}
        </Button>
      </div>
    </div>
  );
}
