"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [connectionStatus, setConnectionStatus] = useState<string>(
    "Checking connection..."
  );
  const [user, setUser] = useState<{
    email?: string;
    user_metadata?: {
      full_name?: string;
      avatar_url?: string;
    };
    id?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<{
    first_name: string;
    last_name: string;
  }>({
    first_name: "",
    last_name: "",
  });
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);

  useEffect(() => {
    testSupabaseConnection();
  }, []);

  const testSupabaseConnection = async () => {
    try {
      // Проверяем наличие переменных окружения
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      console.log("🔍 Checking environment variables:");
      console.log("URL:", supabaseUrl ? "✅ Configured" : "❌ Not configured");
      console.log("Key:", supabaseKey ? "✅ Configured" : "❌ Not configured");

      if (!supabaseUrl || !supabaseKey) {
        setConnectionStatus("❌ Supabase environment variables not configured!");
        setError(
          "Create .env.local file with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY variables"
        );
        return;
      }

      // Connection test
      console.log("🔄 Testing Supabase connection...");
      const { error } = await supabase.from("_test").select("*").limit(1);

      if (error) {
        console.log("📋 Connection error:", error);
        // If table doesn't exist, that's normal - connection is working
        if (error.code === "PGRST116") {
          setConnectionStatus("✅ Supabase connection is working!");
          console.log(
            "✅ Connection successful - table doesn't exist (this is normal)"
          );
        } else {
          setConnectionStatus(`❌ Error: ${error.message}`);
          setError(`Error code: ${error.code}. Message: ${error.message}`);
        }
      } else {
        setConnectionStatus("✅ Supabase connection is working!");
        console.log("✅ Connection successful");
      }

      // Check current user
      console.log("👤 Checking authentication...");
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        console.log("❌ Authentication error:", authError);
      } else {
        console.log(
          "👤 User:",
          user ? "Authorized" : "Not authorized"
        );
      }

      setUser(user);
    } catch (err) {
      console.error("💥 Critical error:", err);
      setConnectionStatus("❌ Supabase connection error");
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const testAuth = async () => {
    try {
      console.log("🔐 Starting Google authentication...");
      console.log(
        "📍 Redirect URL:",
        `${window.location.origin}/auth/callback`
      );

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        console.error("❌ Authentication error:", error);
        setError(`Authentication error: ${error.message}`);
      } else {
        console.log("✅ Authentication initiated successfully");
      }
    } catch (err) {
      console.error("💥 Critical authentication error:", err);
      setError(
        `Authentication error: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
    }
  };

  const signOut = async () => {
    try {
      console.log("🚪 Signing out...");
      await supabase.auth.signOut();
      setUser(null);
      console.log("✅ Sign out successful");
    } catch (err) {
      console.error("❌ Sign out error:", err);
      setError(
        `Sign out error: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
    }
  };

  const testDatabase = async () => {
    try {
      console.log("🗄️ Testing database operations...");

      // Create test table (if it doesn't exist)
      const { error: createError } = await supabase.rpc("create_test_table");

      if (createError && createError.code !== "PGRST301") {
        console.log(
          "⚠️ Failed to create test table:",
          createError.message
        );
      }

      // Try to insert test data
      const { data, error } = await supabase
        .from("test_table")
        .insert([
          {
            name: "Test User",
            email: user?.email || "test@example.com",
            created_at: new Date().toISOString(),
          },
        ])
        .select();

      if (error) {
        console.log("📋 Database error:", error);
        setError(`Database error: ${error.message}`);
      } else {
        console.log("✅ Data successfully added to database:", data);
        setConnectionStatus(
          "✅ Supabase connection and database operations are working!"
        );
      }
    } catch (err) {
      console.error("💥 Critical database error:", err);
      setError(
        `Database error: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
    }
  };

  const createProfile = async () => {
    if (!profile.first_name.trim() || !profile.last_name.trim()) {
      setError("Please fill in all fields");
      return;
    }

    if (!user) {
      setError("You need to sign in");
      return;
    }

    setIsCreatingProfile(true);
    try {
      console.log("👤 Creating user profile...");

      const { data, error } = await supabase
        .from("Profile")
        .insert([
          {
            first_name: profile.first_name.trim(),
            last_name: profile.last_name.trim(),
            // user_id: user.id, // Remove this field if it doesn't exist in the table
            created_at: new Date().toISOString(),
          },
        ])
        .select();

      if (error) {
        console.error("❌ Profile creation error:", error);
        setError(`Profile creation error: ${error.message}`);
      } else {
        console.log("✅ Profile created successfully:", data);
        setError(null);
        // Clear form
        setProfile({ first_name: "", last_name: "" });
        alert("Profile created successfully!");
      }
    } catch (err) {
      console.error("💥 Critical profile creation error:", err);
      setError(
        `Profile creation error: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
    } finally {
      setIsCreatingProfile(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            1031 Exchange CRM - Supabase Test
          </h1>

          {/* Connection Status */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">
              Connection Status
            </h2>
            <div className="p-4 bg-gray-100 rounded-lg">
              <p className="text-lg">{connectionStatus}</p>
              {error && (
                <p className="text-red-600 mt-2 text-sm">Details: {error}</p>
              )}
            </div>
          </div>

          {/* Profile Creation */}
          {user && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-700 mb-4">
                Profile Creation
              </h2>
              <div className="p-4 bg-gray-100 rounded-lg">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={profile.first_name}
                      onChange={(e) =>
                        setProfile({ ...profile, first_name: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter your first name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={profile.last_name}
                      onChange={(e) =>
                        setProfile({ ...profile, last_name: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter your last name"
                    />
                  </div>
                  <button
                    onClick={createProfile}
                    disabled={isCreatingProfile}
                    className="w-full bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {isCreatingProfile ? "Creating..." : "Create Profile"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* User Information */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">
              Authentication
            </h2>
            <div className="p-4 bg-gray-100 rounded-lg">
              {user ? (
                <div>
                  <p className="text-green-600 font-medium">
                    ✅ User authorized
                  </p>
                  <div className="mt-3 space-y-2">
                    {user.user_metadata?.avatar_url && (
                      <div className="flex items-center space-x-3">
                        <Image
                          src={user.user_metadata.avatar_url}
                          alt="Avatar"
                          width={40}
                          height={40}
                          className="w-10 h-10 rounded-full"
                          unoptimized
                        />
                        <div>
                          <p className="text-sm text-gray-600">
                            <strong>Name:</strong>{" "}
                            {user.user_metadata.full_name || "Not specified"}
                          </p>
                          <p className="text-sm text-gray-600">
                            <strong>Email:</strong> {user.email}
                          </p>
                          <p className="text-xs text-gray-500">
                            <strong>ID:</strong> {user.id}
                          </p>
                        </div>
                      </div>
                    )}
                    {!user.user_metadata?.avatar_url && (
                      <div className="space-y-1">
                        <p className="text-sm text-gray-600">
                          <strong>Email:</strong> {user.email}
                        </p>
                        <p className="text-xs text-gray-500">
                          <strong>ID:</strong> {user.id}
                        </p>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={signOut}
                    className="mt-4 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <div>
                  <p className="text-gray-600">
                    ❌ User not authorized
                  </p>
                  <button
                    onClick={testAuth}
                    className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                  >
                    Google Authentication Test
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Configuration Information */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">
              Configuration
            </h2>
            <div className="p-4 bg-gray-100 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Supabase URL:</strong>{" "}
                {process.env.NEXT_PUBLIC_SUPABASE_URL
                  ? "✅ Configured"
                  : "❌ Not configured"}
              </p>
              <p className="text-sm text-gray-600 mt-2">
                <strong>Supabase Key:</strong>{" "}
                {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
                  ? "✅ Configured"
                  : "❌ Not configured"}
              </p>
            </div>
          </div>

          {/* Test Buttons */}
          <div className="text-center space-x-4">
            <button
              onClick={testSupabaseConnection}
              className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 font-medium"
            >
              Retry Connection Test
            </button>
            <button
              onClick={testDatabase}
              className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 font-medium"
            >
              Database Test
            </button>
          </div>

          {/* Instructions */}
          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">
              How to configure Supabase connection:
            </h3>
            <ol className="text-sm text-blue-800 space-y-2">
              <li>
                <strong>1. Create .env.local file</strong> in the project root with
                the following content:
                <div className="mt-2 p-2 bg-gray-100 rounded text-xs font-mono">
                  NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
                  <br />
                  NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
                </div>
              </li>
              <li>
                <strong>2. Get data from Supabase Dashboard:</strong>
                <ul className="ml-4 mt-1 space-y-1">
                  <li>
                    • Go to{" "}
                    <a
                      href="https://supabase.com/dashboard"
                      target="_blank"
                      className="text-blue-600 underline"
                    >
                      supabase.com/dashboard
                    </a>
                  </li>
                  <li>• Select your project</li>
                  <li>• Go to Settings → API</li>
                  <li>• Copy Project URL and anon/public key</li>
                </ul>
              </li>
              <li>
                <strong>3. Restart the development server:</strong>
                <div className="mt-1 p-2 bg-gray-100 rounded text-xs font-mono">
                  npm run dev
                </div>
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
