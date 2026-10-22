import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { setAccessToken } from '../api/client';
import * as api from '../api/endpoints';
import type { Me } from '../api/types';

interface AuthValue {
  me: Me | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  hasRole: (role: Me['roles'][number]) => boolean;
}

const AuthContext = createContext<AuthValue | null>(null);

/**
 * The auth context stores user, roles and scope from GET /auth/me. Route guards
 * read it; components never infer permission from a role name alone.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const meQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: api.fetchMe,
    retry: false,
    staleTime: 60_000,
  });

  const signIn = useCallback(
    async (email: string, password: string) => {
      const result = await api.login({ email, password });
      setAccessToken(result.data.accessToken);
      await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      await queryClient.fetchQuery({ queryKey: ['auth', 'me'], queryFn: api.fetchMe });
    },
    [queryClient],
  );

  const signOut = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      setAccessToken(null);
      queryClient.clear();
    }
  }, [queryClient]);

  const value = useMemo<AuthValue>(() => {
    const me = meQuery.data?.data ?? null;
    return {
      me,
      loading: meQuery.isLoading,
      signIn,
      signOut,
      hasRole: (role) => Boolean(me?.roles.includes(role)),
    };
  }, [meQuery.data, meQuery.isLoading, signIn, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
