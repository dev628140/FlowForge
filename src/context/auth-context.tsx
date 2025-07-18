
'use client';

import * as React from 'react';
import { 
  onAuthStateChanged, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  updateProfile,
  updatePassword,
  sendPasswordResetEmail,
  type User 
} from 'firebase/auth';
import { auth, storage, isFirebaseConfigured } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { getDownloadURL, ref, uploadBytes, uploadString } from 'firebase/storage';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signup: (email: string, pass: string) => Promise<any>;
  login: (email: string, pass: string) => Promise<any>;
  logout: () => Promise<any>;
  updateUserProfile: (profile: { displayName?: string }) => Promise<void>;
  updateUserPassword: (password: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  updateUserProfilePicture: (photoDataUrl: string) => Promise<void>;
  removeUserProfilePicture: () => Promise<void>;
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
      setUser(user ? { ...user } : null);
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

  const updateUserProfile = async (profile: { displayName?: string }) => {
    if (!auth || !auth.currentUser) throw new Error("User not authenticated");
    await updateProfile(auth.currentUser, profile);
    setUser(auth.currentUser ? { ...auth.currentUser } : null);
  };
  
  const updateUserPassword = async (password: string) => {
    if (!auth || !auth.currentUser) throw new Error("User not authenticated");
    await updatePassword(auth.currentUser, password);
  };

  const sendPasswordReset = async (email: string) => {
    if (!auth) throw new Error("Firebase not configured");
    await sendPasswordResetEmail(auth, email);
  };

  const updateUserProfilePicture = async (photoDataUrl: string) => {
    if (!auth || !auth.currentUser || !storage) throw new Error("User not authenticated or storage not configured");
    const filePath = `avatars/${auth.currentUser.uid}/avatar.png`;
    const storageRef = ref(storage, filePath);
    
    // Upload the data URL string directly to Firebase Storage
    await uploadString(storageRef, photoDataUrl, 'data_url');
    const photoURL = await getDownloadURL(storageRef);
    
    await updateProfile(auth.currentUser, { photoURL });
    setUser(auth.currentUser ? { ...auth.currentUser } : null);
  };

  const removeUserProfilePicture = async () => {
    if (!auth || !auth.currentUser) throw new Error("User not authenticated");
    await updateProfile(auth.currentUser, { photoURL: "" });
    setUser(auth.currentUser ? { ...auth.currentUser } : null);
  };


  const value = { 
    user, 
    loading, 
    signup, 
    login, 
    logout,
    updateUserProfile,
    updateUserPassword,
    sendPasswordReset,
    updateUserProfilePicture,
    removeUserProfilePicture,
  };

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
