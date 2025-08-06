import { firestoreDB } from "../config/firebase.config";
import { Timestamp } from "firebase-admin/firestore";
import { Message, MessageType } from "../models/general.model";
import { TaskStatus } from "../generated/client";

export const messagesCollection = firestoreDB.collection('messages');
export const tasksCollection = firestoreDB.collection('tasks');

export class FirebaseService {
    static async createMessage({
        userId,
        taskId,
        type = MessageType.GENERAL,
        body,
        metadata = {} as any,
        attachments = []
    }: Message) {
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
    }

    static async updateMessage(messageId: string, data: Partial<Message>) {
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
    }

    static async getTaskMessages(taskId: string) {
        const snapshot = await messagesCollection
            .where('taskId', '==', taskId)
            .orderBy('createdAt', 'desc')
            .get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    static async createTask(
        taskId: string,
        creatorId: string,
        contributorId: string
    ) {
        const taskRef = tasksCollection.doc(taskId);

        // Check if task already exists
        const existingTask = await taskRef.get();
        if (existingTask.exists) return;

        const timestamp = Timestamp.now();

        const taskData = {
            id: taskId,
            creatorId,
            contributorId,
            conversationStatus: "OPEN",
            createdAt: timestamp,
            updatedAt: timestamp
        };

        await taskRef.set(taskData);
        return taskData;
    }

    static async updateTaskStatus(taskId: string) {
        const taskRef = tasksCollection.doc(taskId);

        // Check if task exists
        const task = await taskRef.get();
        if (!task.exists) {
            throw new Error('Task not found in Firebase');
        }

        const updateData = {
            conversationStatus: "CLOSED",
            updatedAt: Timestamp.now()
        };

        await taskRef.update(updateData);
        return updateData;
    }
}