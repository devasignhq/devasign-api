import { db } from "../config/firebase";
import { Timestamp } from "firebase-admin/firestore";

type Comment = {
    id?: string;
    userId: string;
    taskId: string;
    message: string;
    attachments: string[];
    createdAt?: Date;
    updatedAt?: Date;
}

export const commentsCollection = db.collection('comments');

export const createComment = async (data: Comment) => {
    const comment = {
        ...data,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
    };
    
    const docRef = await commentsCollection.add(comment);
    return {
        id: docRef.id,
        ...comment
    };
};

export const updateComment = async (commentId: string, data: Partial<Comment>) => {
    const comment = await commentsCollection.doc(commentId).get();
    
    if (!comment.exists) {
        throw new Error('Comment not found');
    }

    const updateData = {
        ...data,
        updatedAt: Timestamp.now()
    };

    await commentsCollection.doc(commentId).update(updateData);
    
    const updatedComment = await commentsCollection.doc(commentId).get();
    return {
        id: updatedComment.id,
        ...updatedComment.data()
    };
};

export const getTaskComments = async (taskId: string) => {
    const snapshot = await commentsCollection
        .where('taskId', '==', taskId)
        .orderBy('createdAt', 'desc')
        .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};