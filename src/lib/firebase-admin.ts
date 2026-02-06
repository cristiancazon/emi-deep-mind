import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    : undefined;

// Solo inicializamos si existe la cuenta Y la llave parece una llave RSA real
const isValidKey = serviceAccount?.private_key && serviceAccount.private_key.includes("BEGIN PRIVATE KEY");

if (!getApps().length) {
    if (serviceAccount && isValidKey) {
        try {
            initializeApp({
                credential: cert(serviceAccount),
            });
        } catch (error) {
            console.error("Error inicializando Firebase Admin:", error);
        }
    } else {
        console.warn("Firebase Admin bypass: Llave no válida o ausente (esto es normal durante el build).");
    }
}

// Safe export logic for build time or runtime bypass
let adminAuth: import("firebase-admin/auth").Auth;
let adminDb: import("firebase-admin/firestore").Firestore;

if (getApps().length > 0) {
    adminAuth = getAuth();
    adminDb = getFirestore();
} else {
    // Si no se pudo inicializar (ej: build con dummy key), exportamos mocks para que no falle el import
    console.warn("⚠️ Firebase Admin NO inicializado. Usando mocks seguros.");
    adminAuth = {} as any;
    adminDb = {} as any;
}

export { adminAuth, adminDb };