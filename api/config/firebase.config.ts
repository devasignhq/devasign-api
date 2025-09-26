import * as admin from "firebase-admin";
import { ServiceAccount } from "firebase-admin";

const serviceAccount: ServiceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.toString().replace(/\\n/g, "\n")
};

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

export const firebaseAdmin = admin;
export const firestoreDB = admin.firestore();
