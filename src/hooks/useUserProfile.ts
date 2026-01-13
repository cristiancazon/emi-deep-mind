import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

export interface UserProfile {
    language: string;
    location: string;
    tags: string[];
}

const DEFAULT_PROFILE: UserProfile = {
    language: 'es',
    location: '',
    tags: []
};

export function useUserProfile() {
    const { user } = useAuth();
    const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Ref to hold the latest profile state for the debounced save function
    const profileRef = useRef(profile);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

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

    // Handle updates
    const updateProfile = useCallback((updates: Partial<UserProfile>) => {
        setProfile((prev) => {
            const newProfile = { ...prev, ...updates };
            profileRef.current = newProfile; // Update ref immediately

            // Trigger debounced save
            if (user) {
                setSaving(true);
                if (timeoutRef.current) clearTimeout(timeoutRef.current);

                timeoutRef.current = setTimeout(async () => {
                    try {
                        const profileDocRef = doc(db, 'users', user.uid, 'config', 'profile');
                        await setDoc(profileDocRef, newProfile, { merge: true });
                        setSaving(false);
                    } catch (error) {
                        console.error("Error saving profile:", error);
                        setSaving(false);
                    }
                }, 1000); // 1.5s debounce
            }

            return newProfile;
        });
    }, [user]);

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
        addTag,
        removeTag
    };
}
