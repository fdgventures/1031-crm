"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setIsLoading(false);
    };

    getInitialSession();

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

  const signOut = async () => {
    try {
      console.log("🚪 Signing out...");
      await supabase.auth.signOut();
      // User state will be updated by onAuthStateChange
      console.log("✅ Sign out successful");
    } catch (err) {
      console.error("❌ Sign out error:", err);
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
            <Link
              href="/profiles"
              className="text-gray-500 hover:text-gray-900"
            >
              Profiles
            </Link>
            <Link
              href="/exchanges"
              className="text-gray-500 hover:text-gray-900"
            >
              Exchanges
            </Link>
            <Link
              href="/transactions"
              className="text-gray-500 hover:text-gray-900"
            >
              Transactions
            </Link>
            <Link
              href="/business-cards"
              className="text-gray-500 hover:text-gray-900"
            >
              Business Cards
            </Link>
            <Link
              href="/properties"
              className="text-gray-500 hover:text-gray-900"
            >
              Properties
            </Link>
            <Link
              href="/tax-accounts"
              className="text-gray-500 hover:text-gray-900"
            >
              Tax Accounts
            </Link>
            <Link href="/eat" className="text-gray-500 hover:text-gray-900">
              EAT
            </Link>
          </nav>
          <div className="flex items-center space-x-4 w-64 justify-end">
            {isLoading ? (
              <div className="flex items-center space-x-3 w-full justify-end">
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
              <Link
                href="/auth/signin"
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 inline-block"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
