import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

export interface AgentConfig {
    name: string;
    tone: 'friendly' | 'professional' | 'concise' | 'enthusiastic';
    customInstructions: string;
}

export interface UserProfile {
    language: string;
    location: string;
    tags: string[];
    agentConfig: AgentConfig; // New field
}

const DEFAULT_PROFILE: UserProfile = {
    language: 'es',
    location: '',
    tags: [],
    agentConfig: {
        name: 'Emi',
        tone: 'friendly',
        customInstructions: ''
    }
};

export function useUserProfile() {
    const { user } = useAuth();
    const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);


    // Initial Load
    useEffect(() => {
        if (!user) {
            setProfile(DEFAULT_PROFILE);
            setLoading(false);
            return;
        }

        const profileDocRef = doc(db, 'users', user.uid, 'config', 'profile');

        const unsubscribe = onSnapshot(profileDocRef, (docSnap) => {
            if (docSnap.exists()) {
                // Merge with default to ensure all fields exist
                setProfile({ ...DEFAULT_PROFILE, ...docSnap.data() } as UserProfile);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    // Handle updates (Local state only)
    const updateProfile = useCallback((updates: Partial<UserProfile>) => {
        setProfile((prev) => ({ ...prev, ...updates }));
    }, []);

    // Manual Save
    const saveProfile = async () => {
        if (!user) return;
        setSaving(true);
        try {
            const profileDocRef = doc(db, 'users', user.uid, 'config', 'profile');
            await setDoc(profileDocRef, profile, { merge: true });
        } catch (error) {
            console.error("Error saving profile:", error);
        } finally {
            setSaving(false);
        }
    };

    const addTag = (tag: string) => {
        if (!profile.tags.includes(tag)) {
            updateProfile({ tags: [...profile.tags, tag] });
        }
    };

    const removeTag = (tagToRemove: string) => {
        updateProfile({ tags: profile.tags.filter(t => t !== tagToRemove) });
    };

    return {
        profile,
        loading,
        saving,
        updateProfile,
        saveProfile,
        addTag,
        removeTag
    };
}
