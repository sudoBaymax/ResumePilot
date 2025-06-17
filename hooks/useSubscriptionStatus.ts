import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";

export function useSubscriptionStatus() {
  const { session } = useAuth();
  const [data, setData] = useState<null | {
    subscription: any;
    usage: any;
    limits: { interviews: number; cover_letters: number };
  }>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStatus() {
      if (!session?.access_token) return;
      setLoading(true);
      const res = await fetch("/api/subscription/status", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json();
      setData(json);
      setLoading(false);
    }
    fetchStatus();
  }, [session?.access_token]);

  return { ...data, loading };
} 