import { db } from "../config/firebase";
import { Timestamp } from "firebase-admin/firestore";
import { Comment, CommentType } from "../types/general";

export const commentsCollection = db.collection('comments');

export const createComment = async ({
    userId,
    taskId,
    type = CommentType.GENERAL,
    message,
    metadata = {},
    attachments = []
}: Comment) => {
    const commentRef = commentsCollection.doc();
    const timestamp = new Date().toISOString();

    const commentData = {
        id: commentRef.id,
        userId,
        taskId,
        type,
        message,
        metadata,
        attachments,
        createdAt: timestamp,
        updatedAt: timestamp
    };

    await commentRef.set(commentData);
    return commentData;
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