import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    : undefined;

if (!getApps().length) {
    if (serviceAccount) {
        initializeApp({
            credential: cert(serviceAccount),
        });
    } else {
        console.warn("FIREBASE_SERVICE_ACCOUNT not found in environment variables. Admin SDK not initialized.");
    }
}

const adminAuth = getAuth();
const adminDb = getFirestore();

export { adminAuth, adminDb };
