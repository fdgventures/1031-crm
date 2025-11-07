"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase";

export default function AuthCheck() {
  const [authStatus, setAuthStatus] = useState<string>("Checking...");
  const supabase = getSupabaseClient();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      setAuthStatus("❌ Not logged in");
      return;
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("email, role_type")
      .eq("id", user.id)
      .single();

    if (profile) {
      setAuthStatus(`✅ Logged in: ${profile.email} (${profile.role_type})`);
    } else {
      setAuthStatus(`⚠️ Logged in but no profile found`);
    }
  };

  return (
    <div className="mb-4 p-3 bg-gray-100 rounded-lg text-sm">
      <strong>Auth Status:</strong> {authStatus}
    </div>
  );
}

