"use client";

import React, { useEffect, useMemo, useState } from "react";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface User {
  id: string;
  email?: string;
}

// Функция для добавления таймаута к промисам
function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  fallbackValue?: T
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve, reject) =>
      setTimeout(() => {
        if (fallbackValue !== undefined) {
          resolve(fallbackValue);
        } else {
          reject(new Error("Request timeout"));
        }
      }, timeoutMs)
    ),
  ]);
}

export default function HeaderUser() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profileId, setProfileId] = useState<number | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const router = useRouter();
  const supabase = useMemo(
    () => (isSupabaseConfigured ? getSupabaseClient() : null),
    []
  );

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    const checkUser = async () => {
      try {
        // Добавляем таймаут 5 секунд для запроса пользователя
        const {
          data: { user },
        } = await withTimeout(supabase.auth.getUser(), 5000);
        setUser(user);

        if (user) {
          // Делаем оба запроса ПАРАЛЛЕЛЬНО для ускорения
          const [userProfileResult, profileDataResult] = await Promise.allSettled([
            withTimeout(
              supabase
                .from("user_profiles")
                .select("role_type")
                .eq("id", user.id)
                .single(),
              3000
            ),
            withTimeout(
              supabase
                .from("profile")
                .select("id, avatar_url")
                .eq("user_id", user.id)
                .maybeSingle(),
              3000
            ),
          ]);

          // Process user role
          if (userProfileResult.status === "fulfilled") {
            const adminRoles = [
              "workspace_owner",
              "platform_super_admin",
              "admin",
            ];
            setIsAdmin(adminRoles.includes(userProfileResult.value.data?.role_type || ""));
          } else {
            console.warn("Unable to fetch user role, defaulting to non-admin");
            setIsAdmin(false);
          }

          // Process profile data
          if (profileDataResult.status === "fulfilled" && profileDataResult.value.data) {
            setProfileId(profileDataResult.value.data.id);
            setAvatarUrl(profileDataResult.value.data.avatar_url || null);
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
        // Только логируем, если это не таймаут
        if (err instanceof Error && err.message !== "Request timeout") {
          console.error("Supabase auth error:", err);
        } else {
          console.warn("Auth check timed out, app will work in offline mode");
        }
        // При ошибке все равно позволяем использовать приложение
        setUser(null);
        setIsAdmin(false);
        setProfileId(null);
        setAvatarUrl(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        setUser(session?.user ?? null);

        if (session?.user) {
          // Делаем оба запроса ПАРАЛЛЕЛЬНО
          const [userProfileResult, profileDataResult] = await Promise.allSettled([
            withTimeout(
              supabase
                .from("user_profiles")
                .select("role_type")
                .eq("id", session.user.id)
                .single(),
              3000
            ),
            withTimeout(
              supabase
                .from("profile")
                .select("id, avatar_url")
                .eq("user_id", session.user.id)
                .maybeSingle(),
              3000
            ),
          ]);

          // Process user role
          if (userProfileResult.status === "fulfilled") {
            const adminRoles = [
              "workspace_owner",
              "platform_super_admin",
              "admin",
            ];
            setIsAdmin(adminRoles.includes(userProfileResult.value.data?.role_type || ""));
          } else {
            setIsAdmin(false);
          }

          // Process profile data
          if (profileDataResult.status === "fulfilled" && profileDataResult.value.data) {
            setProfileId(profileDataResult.value.data.id);
            setAvatarUrl(profileDataResult.value.data.avatar_url || null);
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
        if (err instanceof Error && err.message !== "Request timeout") {
          console.error("Supabase auth state error:", err);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [router, supabase]);

  if (!supabase) {
    return null;
  }

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      // Добавляем таймаут для signOut, если не сработает за 3 секунды, все равно выходим
      await withTimeout(supabase.auth.signOut(), 3000);
    } catch (err) {
      // Тихо игнорируем ошибки выхода - локальный выход все равно произойдет
      if (err instanceof Error && err.message !== "Request timeout") {
        console.warn("Sign out failed on server, proceeding with local sign out");
      }
    } finally {
      // Очищаем состояние и перенаправляем
      setUser(null);
      setIsAdmin(false);
      setProfileId(null);
      setAvatarUrl(null);
      setIsSigningOut(false);
      // Используем replace для перенаправления
      window.location.href = "/admin/signin";
    }
  };

  const handleProfileClick = () => {
    if (profileId) {
      router.push(`/profiles/${profileId}`);
    }
  };

  // Показываем индикатор загрузки во время начальной загрузки
  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
        <span className="text-sm text-gray-600">Загрузка...</span>
      </div>
    );
  }

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
            disabled={isSigningOut}
          >
            {user.email}
          </button>
        ) : (
          <span className="text-sm text-gray-700">{user.email}</span>
        )}
        <button
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="text-gray-600 hover:text-gray-900 text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
        >
          {isSigningOut ? (
            <>
              <div className="animate-spin h-3 w-3 border-2 border-gray-600 border-t-transparent rounded-full"></div>
              <span>Выход...</span>
            </>
          ) : (
            "Sign Out"
          )}
        </button>
      </div>
      {profileId ? (
        <button
          onClick={handleProfileClick}
          disabled={isSigningOut}
          className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium hover:bg-blue-700 transition-colors overflow-hidden disabled:opacity-50"
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
