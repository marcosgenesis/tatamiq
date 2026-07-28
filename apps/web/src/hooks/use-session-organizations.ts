import { useEffect, useState } from "react";
import { authClient } from "../lib/auth-client";

/**
 * Resolves the Better Auth organization store against the current authenticated user.
 *
 * Organization atoms outlive route layouts, so after a session expires they can contain the
 * unauthenticated request's empty result. Consumers must not interpret that value as "this user
 * has no academy" until a request for the current session has completed.
 */
export function useSessionOrganizations(userId: string | null | undefined, enabled = true) {
  const organizations = authClient.useListOrganizations();
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || !enabled) {
      setResolvedUserId(null);
      return;
    }

    let cancelled = false;
    setResolvedUserId(null);
    void organizations.refetch().then(() => {
      if (!cancelled) setResolvedUserId(userId);
    });

    return () => {
      cancelled = true;
    };
  }, [userId, enabled, organizations.refetch]);

  return {
    organizations,
    resolvedForSession: !!userId && resolvedUserId === userId,
  };
}
