"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Shield, Users, Key, Search, Loader2, CheckCircle, XCircle } from "lucide-react";

interface User {
  id: string;
  name: string | null;
  email: string | null;
  isAdmin: boolean;
  signupMethod: string | null;
  createdAt: string;
  _count: {
    ratings: number;
    watchlist: number;
  };
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchUsers();
    }
  }, [status]);

  const fetchUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/reset-password");
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to load users");
        return;
      }

      setUsers(data.users);
    } catch (err) {
      setError("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser || !newPassword) return;

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setResetting(true);
    setError("");
    setResetSuccess("");

    try {
      const response = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail: selectedUser.email,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to reset password");
        return;
      }

      setResetSuccess(`Password reset successfully for ${selectedUser.email}`);
      setNewPassword("");
      setSelectedUser(null);
    } catch (err) {
      setError("Failed to connect to server");
    } finally {
      setResetting(false);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  if (error === "Forbidden - Admin access required") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-4"
        >
          <XCircle className="w-16 h-16 text-red-500 mx-auto" />
          <h1 className="text-2xl font-bold text-white">Access Denied</h1>
          <p className="text-gray-400">You don't have admin privileges.</p>
          <Button onClick={() => router.push("/")} variant="outline" className="border-white/20 text-white">
            Go Home
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4"
      >
        <div className="w-14 h-14 bg-cyan-500/20 rounded-2xl flex items-center justify-center">
          <Shield className="w-7 h-7 text-cyan-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">Admin Panel</h1>
          <p className="text-gray-400">Manage user accounts and reset passwords</p>
        </div>
      </motion.div>

      {/* Success Message */}
      {resetSuccess && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center gap-3"
        >
          <CheckCircle className="w-5 h-5 text-green-500" />
          <p className="text-green-400">{resetSuccess}</p>
        </motion.div>
      )}

      {/* Error Message */}
      {error && error !== "Forbidden - Admin access required" && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400"
        >
          {error}
        </motion.div>
      )}

      {/* Reset Password Section */}
      {selectedUser && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-6 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20"
        >
          <div className="flex items-center gap-3 mb-4">
            <Key className="w-5 h-5 text-cyan-400" />
            <h2 className="text-xl font-semibold text-white">Reset Password</h2>
          </div>
          
          <p className="text-gray-400 mb-4">
            Resetting password for: <span className="text-cyan-400 font-semibold">{selectedUser.email}</span>
          </p>

          <div className="flex gap-3">
            <Input
              type="password"
              placeholder="New password (min 6 characters)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="bg-white/5 border-white/10 text-white flex-1"
            />
            <Button
              onClick={handleResetPassword}
              disabled={resetting || newPassword.length < 6}
              className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold"
            >
              {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reset"}
            </Button>
            <Button
              onClick={() => {
                setSelectedUser(null);
                setNewPassword("");
              }}
              variant="outline"
              className="border-white/20 text-white"
            >
              Cancel
            </Button>
          </div>
        </motion.div>
      )}

      {/* Users List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-gray-400" />
            <h2 className="text-xl font-semibold text-white">Users ({users.length})</h2>
          </div>
          
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/5 border-white/10 text-white w-64"
            />
          </div>
        </div>

        <div className="space-y-2">
          {filteredUsers.map((user) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                selectedUser?.id === user.id
                  ? "bg-cyan-500/10 border-cyan-500/30"
                  : "bg-white/5 border-white/10 hover:border-white/20"
              }`}
              onClick={() => setSelectedUser(user)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold">
                      {user.name?.charAt(0) || user.email?.charAt(0) || "?"}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-white font-semibold">{user.name || "No name"}</p>
                      {user.isAdmin && (
                        <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-semibold">
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="text-gray-400 text-sm">{user.email}</p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-gray-400 text-sm">
                    {user._count.ratings} ratings • {user._count.watchlist} watchlist
                  </p>
                  <p className="text-gray-500 text-xs">
                    {user.signupMethod === "oauth" ? "Google" : "Email"} • {new Date(user.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

