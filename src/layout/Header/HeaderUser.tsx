"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function HeaderUser() {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    // Даем время на восстановление сессии
    setTimeout(() => {
      supabase.auth.getUser().then(({ data }) => {
        setUser(data.user);
      });
    }, 100);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  if (!user) {
    return (
      <Link
        href="/admin/signin"
        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm"
      >
        Sign In
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <Link
        href="/admin/dashboard"
        className="text-gray-700 hover:text-gray-900 text-sm font-medium"
      >
        Admin
      </Link>
      <div className="flex flex-col items-end">
        <span className="text-sm text-gray-700">{user.email}</span>
        <button
          onClick={handleSignOut}
          className="text-gray-600 hover:text-gray-900 text-xs font-medium"
        >
          Sign Out
        </button>
      </div>
      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
        {user.email?.charAt(0).toUpperCase()}
      </div>
    </div>
  );
}
