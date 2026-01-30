"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

interface AuthContextType {
    user: User | null;
    loading: boolean;
    googleAccessToken: string | null;
    tokenExpiresAt: number | null;
    signInWithGoogle: () => Promise<void>;
    logOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
    const [tokenExpiresAt, setTokenExpiresAt] = useState<number | null>(null);

    useEffect(() => {
        // Recover token from storage if available
        const storedToken = localStorage.getItem("google_access_token");
        const storedExpiry = localStorage.getItem("google_token_expiry");

        if (storedToken && storedExpiry) {
            const expiryTime = parseInt(storedExpiry, 10);
            // Check if token is still valid (with 5 min buffer)
            if (Date.now() < expiryTime - 5 * 60 * 1000) {
                setGoogleAccessToken(storedToken);
                setTokenExpiresAt(expiryTime);
            } else {
                // Token expired, clear it
                localStorage.removeItem("google_access_token");
                localStorage.removeItem("google_token_expiry");
            }
        }

        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const signInWithGoogle = async () => {
        try {
            const provider = new GoogleAuthProvider();
            // Request read-only access to Calendar (more secure)
            provider.addScope('https://www.googleapis.com/auth/calendar.readonly');

            // Force Google to show consent screen again to ensure calendar permissions are requested
            provider.setCustomParameters({
                prompt: 'consent'
            });

            const result = await signInWithPopup(auth, provider);
            const credential = GoogleAuthProvider.credentialFromResult(result);
            const token = credential?.accessToken;

            if (token) {
                // Google OAuth tokens typically expire in 1 hour
                const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour from now

                setGoogleAccessToken(token);
                setTokenExpiresAt(expiresAt);
                localStorage.setItem("google_access_token", token);
                localStorage.setItem("google_token_expiry", expiresAt.toString());

                console.log("Google Calendar access granted. Token expires at:", new Date(expiresAt).toLocaleString());
            }
        } catch (error) {
            console.error("Error signing in with Google", error);
        }
    };

    const logOut = async () => {
        try {
            await signOut(auth);
            setGoogleAccessToken(null);
            setTokenExpiresAt(null);
            localStorage.removeItem("google_access_token");
            localStorage.removeItem("google_token_expiry");
        } catch (error) {
            console.error("Error signing out", error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, googleAccessToken, tokenExpiresAt, signInWithGoogle, logOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
