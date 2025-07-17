
'use client';

import * as React from 'react';
import { onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, type User } from 'firebase/auth';
import { auth, isFirebaseConfigured } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signup: (email: string, pass: string) => Promise<any>;
  login: (email: string, pass: string) => Promise<any>;
  logout: () => Promise<any>;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);
  const { toast } = useToast();

  React.useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signup = (email: string, pass: string) => {
    if (!auth) {
        toast({ title: 'Firebase Not Configured', description: 'Please set up Firebase credentials to sign up.', variant: 'destructive' });
        return Promise.reject(new Error("Firebase not configured"));
    }
    return createUserWithEmailAndPassword(auth, email, pass);
  };

  const login = (email: string, pass: string) => {
    if (!auth) {
        toast({ title: 'Firebase Not Configured', description: 'Please set up Firebase credentials to log in.', variant: 'destructive' });
        return Promise.reject(new Error("Firebase not configured"));
    }
    return signInWithEmailAndPassword(auth, email, pass);
  };

  const logout = () => {
    if (!auth) {
        return Promise.resolve();
    }
    return signOut(auth);
  };

  const value = { user, loading, signup, login, logout };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
