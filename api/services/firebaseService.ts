import { db } from "../config/firebase";
import { Timestamp } from "firebase-admin/firestore";
import { Message, MessageType } from "../types/general";

export const messagesCollection = db.collection('messages');

export const createMessage = async ({
    userId,
    taskId,
    type = MessageType.GENERAL,
    body,
    metadata = {} as any,
    attachments = []
}: Message) => {
    const messageRef = messagesCollection.doc();
    const timestamp = Timestamp.now();

    const messageData = {
        id: messageRef.id,
        userId,
        taskId,
        type,
        body,
        metadata,
        attachments,
        createdAt: timestamp,
        updatedAt: timestamp
    };

    await messageRef.set(messageData);
    return messageData;
};

export const updateMessage = async (messageId: string, data: Partial<Message>) => {
    const message = await messagesCollection.doc(messageId).get();
    
    if (!message.exists) {
        throw new Error('Message not found');
    }

    const updateData = {
        ...data,
        updatedAt: Timestamp.now()
    };

    await messagesCollection.doc(messageId).update(updateData);
    
    const updatedMessage = await messagesCollection.doc(messageId).get();
    return {
        id: updatedMessage.id,
        ...updatedMessage.data()
    };
};

export const getTaskMessages = async (taskId: string) => {
    const snapshot = await messagesCollection
        .where('taskId', '==', taskId)
        .orderBy('createdAt', 'desc')
        .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};