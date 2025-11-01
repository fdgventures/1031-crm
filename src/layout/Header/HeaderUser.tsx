"use client";

import React, { useEffect, useMemo, useState } from "react";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface User {
  id: string;
  email?: string;
}

export default function HeaderUser() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profileId, setProfileId] = useState<number | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const router = useRouter();
  const supabase = useMemo(
    () => (isSupabaseConfigured ? getSupabaseClient() : null),
    []
  );

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const checkUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setUser(user);

        if (user) {
          const { data: userProfile } = await supabase
            .from("user_profiles")
            .select("role_type")
            .eq("id", user.id)
            .single();

          const adminRoles = [
            "workspace_owner",
            "platform_super_admin",
            "admin",
          ];
          setIsAdmin(adminRoles.includes(userProfile?.role_type || ""));

          const { data: profileData } = await supabase
            .from("profile")
            .select("id, avatar_url")
            .eq("user_id", user.id)
            .single();

          if (profileData) {
            setProfileId(profileData.id);
            setAvatarUrl(profileData.avatar_url || null);
          } else {
            setProfileId(null);
            setAvatarUrl(null);
          }
        } else {
          setIsAdmin(false);
          setProfileId(null);
          setAvatarUrl(null);
        }
      } catch (err) {
        console.error("Supabase auth error:", err);
      }
    };

    checkUser().catch((err) => {
      console.error("Supabase auth error:", err);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        setUser(session?.user ?? null);

        if (session?.user) {
          const { data: userProfile } = await supabase
            .from("user_profiles")
            .select("role_type")
            .eq("id", session.user.id)
            .single();

          const adminRoles = [
            "workspace_owner",
            "platform_super_admin",
            "admin",
          ];
          setIsAdmin(adminRoles.includes(userProfile?.role_type || ""));

          const { data: profileData } = await supabase
            .from("profile")
            .select("id, avatar_url")
            .eq("user_id", session.user.id)
            .single();

          if (profileData) {
            setProfileId(profileData.id);
            setAvatarUrl(profileData.avatar_url || null);
          } else {
            setProfileId(null);
            setAvatarUrl(null);
          }
        } else {
          setIsAdmin(false);
          setProfileId(null);
          setAvatarUrl(null);
        }

        if (_event === "SIGNED_IN" || _event === "SIGNED_OUT") {
          router.refresh();
        }
      } catch (err) {
        console.error("Supabase auth state error:", err);
      }
    });

    return () => subscription.unsubscribe();
  }, [router, supabase]);

  if (!supabase) {
    return null;
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsAdmin(false);
    setProfileId(null);
    window.location.href = "/admin/signin";
  };

  const handleProfileClick = () => {
    if (profileId) {
      router.push(`/profiles/${profileId}`);
    }
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
      {isAdmin && (
        <Link
          href="/admin/dashboard"
          className="text-gray-700 hover:text-gray-900 text-sm font-medium"
        >
          Admin
        </Link>
      )}
      <div className="flex flex-col items-end">
        {profileId ? (
          <button
            onClick={handleProfileClick}
            className="text-sm text-gray-700 hover:text-blue-600 hover:underline"
          >
            {user.email}
          </button>
        ) : (
          <span className="text-sm text-gray-700">{user.email}</span>
        )}
        <button
          onClick={handleSignOut}
          className="text-gray-600 hover:text-gray-900 text-xs font-medium"
        >
          Sign Out
        </button>
      </div>
      {profileId ? (
        <button
          onClick={handleProfileClick}
          className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium hover:bg-blue-700 transition-colors overflow-hidden"
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          ) : (
            user.email?.charAt(0).toUpperCase()
          )}
        </button>
      ) : (
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium overflow-hidden">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          ) : (
            user.email?.charAt(0).toUpperCase()
          )}
        </div>
      )}
    </div>
  );
}
