import admin, { ServiceAccount } from "firebase-admin";
import { Env } from "../utils/env.js";

const serviceAccount: ServiceAccount = {
    projectId: Env.firebaseProjectId(),
    clientEmail: Env.firebaseClientEmail(),
    privateKey: Env.firebasePrivateKey()?.toString().replace(/\\n/g, "\n")
};

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

export const firebaseAdmin = admin;
export const firestoreDB = admin.firestore();
