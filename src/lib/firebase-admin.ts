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

// Usamos getters para evitar errores si los servicios no están inicializados aún
export const adminAuth = getAuth();
export const adminDb = getFirestore();