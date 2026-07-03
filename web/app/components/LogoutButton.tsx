"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();
  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    router.replace("/");
    router.refresh();
  }
  return (
    <button
      onClick={logout}
      className="hover:text-accent transition-colors"
    >
      Logout
    </button>
  );
}
