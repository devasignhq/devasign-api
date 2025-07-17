import { Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';
import { ServiceAccount } from 'firebase-admin';

const serviceAccount: ServiceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.toString().replace(/\\n/g, '\n'),
}

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

export const validateUser = async (req: Request, res: Response, next: NextFunction) => {
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        const idToken = req.headers.authorization.split('Bearer ')[1];
    
        try {
            const decodedToken = await admin.auth().verifyIdToken(idToken);
            
            // Add user info to request
            req.body = { 
                ...req.body, 
                currentUser: decodedToken,
                userId: decodedToken.uid
            };
            
            next();
        } catch (error: any) {
            return res.status(401).json({ 
                error: "Authentication failed",
                details: error.message 
            });
        }
    } else {
        return res.status(401).json({ error: "No authorization token sent" });
    }
}

export const db = admin.firestore();