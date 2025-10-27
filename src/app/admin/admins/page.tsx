"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button, Input } from "@/components/ui";
import { useRouter } from "next/navigation";

interface AdminProfile {
  id: string;
  email: string;
  role: string;
  role_type: string;
  is_verified: boolean;
  created_at: string;
  auth_user_id?: string;
}

interface Invitation {
  id: string;
  email: string;
  role: string;
  role_type: string;
  status: string;
  created_at: string;
  expires_at: string;
}

export default function AdminsManagementPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [admins, setAdmins] = useState<AdminProfile[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [newInvite, setNewInvite] = useState({
    email: "",
    role_type: "platform_super_admin",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [invitationLink, setInvitationLink] = useState<string | null>(null);

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  const checkAuthAndLoadData = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // console.log("User check:", user);

      if (!user) {
        router.push("/admin/signin");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      // console.log("Profile check:", {
      //   profile,
      //   profileError,
      //   role_type: profile?.role_type,
      // });

      if (profileError) {
        console.error("Profile error:", profileError);
        console.error("Full error:", JSON.stringify(profileError, null, 2));
        router.push("/admin/dashboard");
        return;
      }

      if (!profile) {
        console.log("No profile found");
        router.push("/admin/dashboard");
        return;
      }

      // Разрешаем доступ только workspace_owner и platform_super_admin
      if (
        !profile.role_type ||
        !["workspace_owner", "platform_super_admin"].includes(profile.role_type)
      ) {
        router.push("/admin/dashboard");
        return;
      }

      setCurrentUser(profile);
      await loadAdmins();
      await loadInvitations();
    } catch (err) {
      console.error("Auth check error:", err);
      router.push("/admin/signin");
    } finally {
      setIsLoading(false);
    }
  };

  const loadAdmins = async () => {
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .in("role", ["platform_super_admin", "admin"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAdmins(data || []);
    } catch (err) {
      console.error("Failed to load admins:", err);
    }
  };

  const loadInvitations = async () => {
    try {
      const { data, error } = await supabase
        .from("admin_invitations")
        .select("*")
        .order("created_at", { ascending: false });

      // console.log("Load invitations:", { data, error });

      if (error) {
        console.error("Invitations error:", error);
        throw error;
      }
      setInvitations(data || []);
    } catch (err) {
      console.error("Failed to load invitations:", err);
      setInvitations([]); // Устанавливаем пустой массив вместо ошибки
    }
  };

  const handleInviteAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!newInvite.email) {
      setError("Email is required");
      return;
    }

    try {
      // Проверяем, нет ли уже пользователя с таким email
      const { data: existingAdmin } = await supabase
        .from("user_profiles")
        .select("id")
        .eq("email", newInvite.email)
        .single();

      if (existingAdmin) {
        setError("Admin with this email already exists");
        return;
      }

      // Проверяем, нет ли открытого приглашения
      const { data: existingInvitation } = await supabase
        .from("admin_invitations")
        .select("id")
        .eq("email", newInvite.email)
        .eq("status", "pending")
        .single();

      if (existingInvitation) {
        setError("Invitation already sent to this email");
        return;
      }

      const { data: insertedInvitation, error: inviteError } = await supabase
        .from("admin_invitations")
        .insert({
          email: newInvite.email,
          role_type: newInvite.role_type,
          role: newInvite.role_type,
          invited_by: currentUser.id,
        })
        .select()
        .single();

      if (inviteError) throw inviteError;

      // Генерируем ссылку на регистрацию
      const invitationUrl = `${window.location.origin}/admin/register-invite/${insertedInvitation.token}`;
      setInvitationLink(invitationUrl);
      setSuccess("Invitation created! Copy the link below to send it.");
      setNewInvite({ email: "", role_type: "platform_super_admin" });
      setShowInviteForm(false);
      await loadInvitations();
    } catch (err: any) {
      setError(err.message || "Failed to send invitation");
    }
  };

  const handleRemoveInvitation = async (invitationId: string) => {
    if (!confirm("Are you sure you want to remove this invitation?")) return;

    try {
      const { error } = await supabase
        .from("admin_invitations")
        .delete()
        .eq("id", invitationId);

      if (error) throw error;

      setSuccess("Invitation removed");
      await loadInvitations();
    } catch (err: any) {
      setError(err.message || "Failed to remove invitation");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // ВРЕМЕННО: Разрешаем всем видеть страницу для тестирования
  // В будущем это можно вернуть, чтобы прятать страницу от обычных админов
  // if (!currentUser || !["workspace_owner", "platform_super_admin"].includes(currentUser.role_type)) {
  //   return null;
  // }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Admins Management
          </h1>
          <p className="mt-2 text-gray-600">
            Manage administrators and their roles
          </p>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-md p-4">
            <p className="text-sm text-green-600 mb-2">{success}</p>
            {invitationLink && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Invitation Link:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={invitationLink}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-white text-sm"
                  />
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(invitationLink);
                      setSuccess("Link copied to clipboard!");
                    }}
                    variant="outline"
                    size="small"
                  >
                    Copy
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Кнопка пригласить админа */}
        <div className="mb-6">
          <Button
            onClick={() => setShowInviteForm(!showInviteForm)}
            variant="primary"
          >
            {showInviteForm ? "Cancel" : "+ Invite New Admin"}
          </Button>
        </div>

        {/* Форма приглашения */}
        {showInviteForm && (
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Invite New Admin</h2>
            <form onSubmit={handleInviteAdmin}>
              <div className="space-y-4">
                <Input
                  label="Email"
                  type="email"
                  value={newInvite.email}
                  onChange={(e) =>
                    setNewInvite({ ...newInvite, email: e.target.value })
                  }
                  required
                  placeholder="admin@example.com"
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role Type
                  </label>
                  <select
                    value={newInvite.role_type}
                    onChange={(e) =>
                      setNewInvite({ ...newInvite, role_type: e.target.value })
                    }
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="platform_super_admin">
                      Platform Super Admin
                    </option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <Button type="submit" variant="primary">
                  Send Invitation
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Список приглашений */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold">Pending Invitations</h2>
          </div>
          <div className="divide-y">
            {invitations.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                No pending invitations
              </div>
            ) : (
              invitations.map((invitation) => {
                const invitationUrl = `${window.location.origin}/admin/register-invite/${invitation.token}`;
                return (
                  <div key={invitation.id} className="px-6 py-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-medium">{invitation.email}</p>
                        <p className="text-sm text-gray-500">
                          Role:{" "}
                          {invitation.role_type === "platform_super_admin"
                            ? "Platform Super Admin"
                            : "Admin"}
                        </p>
                        <p className="text-xs text-gray-400">
                          Expires:{" "}
                          {new Date(invitation.expires_at).toLocaleDateString()}
                        </p>
                      </div>
                      {currentUser.role_type === "workspace_owner" && (
                        <Button
                          onClick={() => handleRemoveInvitation(invitation.id)}
                          variant="destructive"
                          size="small"
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                    <div className="mt-3 pt-3 border-t">
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Invitation Link:
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={invitationUrl}
                          readOnly
                          className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs"
                        />
                        <Button
                          onClick={() => {
                            navigator.clipboard.writeText(invitationUrl);
                            setSuccess("Link copied!");
                          }}
                          variant="outline"
                          size="small"
                        >
                          Copy
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Список админов */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold">Active Administrators</h2>
          </div>
          <div className="divide-y">
            {admins.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                No administrators found
              </div>
            ) : (
              admins.map((admin) => (
                <div key={admin.id} className="px-6 py-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{admin.email}</p>
                      <p className="text-sm text-gray-500">
                        {admin.role_type === "workspace_owner" && "👑 "}
                        Role: {admin.role_type}
                      </p>
                      <p className="text-xs text-gray-400">
                        Joined:{" "}
                        {new Date(admin.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-sm">
                      {admin.is_verified ? (
                        <span className="text-green-600">✓ Verified</span>
                      ) : (
                        <span className="text-yellow-600">⚠ Pending</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
