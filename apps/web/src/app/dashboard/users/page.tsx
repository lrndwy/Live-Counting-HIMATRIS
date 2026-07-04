"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { PanelShell } from "@/components/panel/PanelShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { UserProfile } from "@/lib/types";

export default function UsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadUsers = useCallback(async () => {
    const res = await fetch("/api/users", { credentials: "include" });
    if (!res.ok) return;
    const data = (await res.json()) as { users: UserProfile[] };
    setUsers(data.users);
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, displayName }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Gagal membuat user");
      setMessage(`User PANWASLU ${email} berhasil dibuat.`);
      setEmail("");
      setPassword("");
      setDisplayName("");
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat user");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(user: UserProfile) {
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !user.active }),
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setError(data.error || "Gagal mengubah status");
      return;
    }
    await loadUsers();
  }

  return (
    <PanelShell title="Users PANWASLU" roles={["admin"]}>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Buat User</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onCreate} className="space-y-3">
              <Input
                placeholder="Nama"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
              <Input
                type="email"
                required
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Input
                type="password"
                required
                minLength={6}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Button type="submit" disabled={submitting}>
                {submitting ? "Menyimpan..." : "Buat User"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Daftar PANWASLU</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {message && <p className="text-sm text-emerald-700">{message}</p>}
            {error && <p className="text-sm text-destructive">{error}</p>}
            {users.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada user.</p>
            ) : (
              users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">{user.displayName}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <Badge variant={user.active ? "success" : "secondary"}>
                      {user.active ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleActive(user)}
                  >
                    {user.active ? "Nonaktifkan" : "Aktifkan"}
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </PanelShell>
  );
}
