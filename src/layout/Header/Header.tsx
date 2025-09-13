"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";

export default function Header() {
  const [user, setUser] = useState<{
    email?: string;
    user_metadata?: {
      full_name?: string;
      avatar_url?: string;
    };
    id?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkUser();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state changed:", event, session?.user?.email);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUser = async () => {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        console.log("❌ Authentication error:", authError);
      } else {
        console.log("👤 User:", user ? "Authorized" : "Not authorized");
      }

      setUser(user);
      setIsLoading(false);
    } catch (err) {
      console.error("💥 Critical error:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      console.log("🚪 Signing out...");
      await supabase.auth.signOut();
      // User state will be updated by onAuthStateChange
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
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-gray-900">
              Exchange CRM
            </h1>
          </div>
          <nav className="hidden md:flex space-x-8">
            <a href="/profiles" className="text-gray-500 hover:text-gray-900">
              Profiles
            </a>
            <a href="/exchanges" className="text-gray-500 hover:text-gray-900">
              Exchanges
            </a>
            <a
              href="/transactions"
              className="text-gray-500 hover:text-gray-900"
            >
              Transactions
            </a>
            <a
              href="/business-cards"
              className="text-gray-500 hover:text-gray-900"
            >
              Business Cards
            </a>
            <a href="/properties" className="text-gray-500 hover:text-gray-900">
              Properties
            </a>
            <a
              href="/tax-accounts"
              className="text-gray-500 hover:text-gray-900"
            >
              Tax Accounts
            </a>
            <a href="/eat" className="text-gray-500 hover:text-gray-900">
              EAT
            </a>
          </nav>
          <div className="flex items-center space-x-4 w-64 justify-end transition-all duration-200">
            {isLoading ? (
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
                <div className="hidden md:block">
                  <div className="w-24 h-4 bg-gray-200 rounded animate-pulse mb-1"></div>
                  <div className="w-40 h-3 bg-gray-200 rounded animate-pulse"></div>
                </div>
                <div className="w-20 h-7 bg-gray-200 rounded animate-pulse"></div>
              </div>
            ) : user ? (
              <div className="flex items-center space-x-3">
                {user.user_metadata?.avatar_url && (
                  <Image
                    src={user.user_metadata.avatar_url}
                    alt="Avatar"
                    width={32}
                    height={32}
                    className="w-8 h-8 rounded-full"
                    unoptimized
                  />
                )}
                <div className="hidden md:block">
                  <p className="text-sm font-medium text-gray-900">
                    {user.user_metadata?.full_name || "User"}
                  </p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
                <button
                  onClick={signOut}
                  className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <a
                href="/auth/signin"
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 inline-block"
              >
                Sign In
              </a>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
