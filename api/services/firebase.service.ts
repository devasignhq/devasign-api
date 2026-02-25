import { firestoreDB } from "../config/firebase.config";
import { Timestamp } from "firebase-admin/firestore";
import { Message, MessageMetadata, MessageType } from "../models/task.model";

// Firestore collection references for messages and tasks
export const messagesCollection = firestoreDB.collection("messages");
export const tasksCollection = firestoreDB.collection("tasks");
export const activityCollection = firestoreDB.collection("activity");

/** 
 * Activity type for tracking user actions and system events.
 */
type Activity = {
    userId: string;
    metadata?: unknown;
} & ({
    type: "task";
    taskId: string;
} | {
    type: "contributor"
} | {
    type: "installation";
    installationId: string;
    operation: string;
    issueUrl?: string;
    message?: string;
})

/**
 * Service for managing Firebase Firestore operations.
 */
export class FirebaseService {
    /**
     * Create a new message in the Firestore messages collection.
     * @param userId - The ID of the user
     * @param taskId - The ID of the task
     * @param type - The type of the message
     * @param body - The body of the message
     * @param metadata - The metadata of the message
     * @param attachments - The attachments of the message
     * @returns The created message
     */
    static async createMessage({
        userId,
        taskId,
        type = MessageType.GENERAL,
        body,
        metadata = {} as MessageMetadata,
        attachments = []
    }: Message) {
        // Generate a new document reference with auto-generated ID
        const messageRef = messagesCollection.doc();
        const timestamp = Timestamp.now();

        // Prepare message data with all required fields
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

        // Save the message to Firestore
        await messageRef.set(messageData);
        return messageData;
    }

    /**
     * Update an existing message in Firestore.
     * @param messageId - The ID of the message
     * @param data - The data to update
     * @returns The updated message
     */
    static async updateMessage(messageId: string, data: Partial<Message>) {
        // Verify the message exists
        const message = await messagesCollection.doc(messageId).get();

        if (!message.exists) {
            throw new Error("Message not found");
        }

        // Prepare update data with new timestamp
        const updateData = {
            ...data,
            updatedAt: Timestamp.now()
        };

        // Apply the update
        await messagesCollection.doc(messageId).update(updateData);

        // Fetch and return the updated message
        const updatedMessage = await messagesCollection.doc(messageId).get();
        return {
            id: updatedMessage.id,
            ...updatedMessage.data()
        };
    }

    /**
     * Retrieve all messages for a specific task, ordered by creation time.
     * @param taskId - The ID of the task
     * @returns The messages for the task
     */
    static async getTaskMessages(taskId: string) {
        // Query messages for the task, ordered by creation time
        const snapshot = await messagesCollection
            .where("taskId", "==", taskId)
            .orderBy("createdAt", "desc")
            .get();

        // Transform Firestore documents into message objects
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    /**
     * Create a task document in Firestore to enable chat functionality.
     * @param taskId - The ID of the task
     * @param creatorId - The ID of the creator
     * @param contributorId - The ID of the contributor
     * @returns The created task
     */
    static async createTask(
        taskId: string,
        creatorId: string,
        contributorId: string
    ) {
        const taskRef = tasksCollection.doc(taskId);
        const timestamp = Timestamp.now();

        // Prepare task data with conversation participants
        const taskData = {
            id: taskId,
            creatorId,
            contributorId,
            conversationStatus: "OPEN",
            createdAt: timestamp,
            updatedAt: timestamp
        };

        // Create or update the task document
        await taskRef.set(taskData, { merge: true });
        return taskData;
    }

    /**
     * Update the conversation status of a task to closed.
     * @param taskId - The ID of the task
     * @returns The updated task
     */
    static async updateTaskStatus(taskId: string) {
        const taskRef = tasksCollection.doc(taskId);

        // Verify the task exists in Firestore
        const task = await taskRef.get();
        if (!task.exists) {
            throw new Error("Task not found in Firebase");
        }

        // Prepare status update with timestamp
        const updateData = {
            conversationStatus: "CLOSED",
            updatedAt: Timestamp.now()
        };

        // Apply the update
        await taskRef.update(updateData);
        return updateData;
    }

    /**
     * Update the last activity timestamp for a task to trigger live updates.
     * @param activity - The activity to update
     * @returns The updated activity
     */
    static async updateAppActivity(activity: Activity) {
        // Get the reference to the task document
        let taskRef;
        switch (activity.type) {
            case "task":
                taskRef = tasksCollection.doc(activity.taskId);
                break;
            case "installation":
                taskRef = activityCollection.doc(activity.installationId);
                break;
            case "contributor":
                taskRef = activityCollection.doc(activity.userId);
                break;
            default:
                throw new Error("Invalid activity type");
        };
        const lastActivityAt = Timestamp.now();

        // Update the activity document
        await taskRef.set(
            { ...activity, lastActivityAt },
            { merge: true }
        );
    }

    /**
     * Delete an activity from the Firestore collection.
     * @param activity - The activity to delete
     * @returns The deleted activity
     */
    static deleteAppActivity(activity: Partial<Activity>) {
        // Get the reference to the task document
        let taskRef;
        switch (activity.type) {
            case "task":
                taskRef = tasksCollection.doc(activity.taskId!);
                break;
            case "installation":
                taskRef = activityCollection.doc(activity.installationId!);
                break;
            case "contributor":
                taskRef = activityCollection.doc(activity.userId!);
                break;
        };
        // Delete the activity document
        return taskRef!.delete();
    }
}
