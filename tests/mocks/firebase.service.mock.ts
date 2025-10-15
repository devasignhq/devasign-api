import { Timestamp } from "firebase-admin/firestore";
import { MessageType, Message } from "../../api/models";

/**
 * Mock Firebase Service for testing
 * Provides comprehensive mocks for FirebaseService methods
 */

// Mock data storage
const mockMessages: any[] = [];
const mockTasks: any[] = [];
const mockCollections = new Map<string, any[]>();

// Mock Firestore collections
export const mockMessagesCollection = {
    doc: jest.fn((id?: string) => ({
        id: id || `mock_message_${Date.now()}`,
        get: jest.fn().mockResolvedValue({
            exists: true,
            id: id || `mock_message_${Date.now()}`,
            data: () => mockMessages.find(m => m.id === id) || {}
        }),
        set: jest.fn().mockResolvedValue(undefined),
        update: jest.fn().mockResolvedValue(undefined)
    })),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue({
        docs: mockMessages.map(msg => ({
            id: msg.id,
            data: () => msg
        }))
    })
};

export const mockTasksCollection = {
    doc: jest.fn((id?: string) => ({
        id: id || `mock_task_${Date.now()}`,
        get: jest.fn().mockResolvedValue({
            exists: true,
            id: id || `mock_task_${Date.now()}`,
            data: () => mockTasks.find(t => t.id === id) || {}
        }),
        set: jest.fn().mockResolvedValue(undefined),
        update: jest.fn().mockResolvedValue(undefined)
    }))
};

/**
 * Mock Firebase Service class
 * Simulates Firestore operations with realistic behavior
 */
export class MockFirebaseService {
    /**
     * Mock createMessage method
     * Simulates message creation in Firestore
     */
    static async createMessage({
        userId,
        taskId,
        type = MessageType.GENERAL,
        body,
        metadata = {} as any,
        attachments = []
    }: Message) {
        const messageId = `mock_message_${Date.now()}_${Math.random()}`;
        const timestamp = Timestamp.now();

        const messageData = {
            id: messageId,
            userId,
            taskId,
            type,
            body,
            metadata,
            attachments,
            createdAt: timestamp,
            updatedAt: timestamp
        };

        // Store in mock data
        mockMessages.push(messageData);

        return messageData;
    }

    /**
     * Mock updateMessage method
     * Simulates message updates in Firestore
     */
    static async updateMessage(messageId: string, data: Partial<Message>) {
        const messageIndex = mockMessages.findIndex(m => m.id === messageId);

        if (messageIndex === -1) {
            throw new Error("Message not found");
        }

        const updateData = {
            ...data,
            updatedAt: Timestamp.now()
        };

        // Update mock data
        mockMessages[messageIndex] = {
            ...mockMessages[messageIndex],
            ...updateData
        };

        return {
            id: messageId,
            ...mockMessages[messageIndex]
        };
    }

    /**
     * Mock getTaskMessages method
     * Simulates retrieving messages for a task
     */
    static async getTaskMessages(taskId: string) {
        const taskMessages = mockMessages
            .filter(msg => msg.taskId === taskId)
            .sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);

        return taskMessages.map(msg => ({ id: msg.id, ...msg }));
    }

    /**
     * Mock createTask method
     * Simulates task creation in Firestore
     */
    static async createTask(
        taskId: string,
        creatorId: string,
        contributorId: string
    ) {
        // Check if task already exists
        const existingTask = mockTasks.find(t => t.id === taskId);
        if (existingTask) return existingTask;

        const timestamp = Timestamp.now();

        const taskData = {
            id: taskId,
            creatorId,
            contributorId,
            conversationStatus: "OPEN",
            createdAt: timestamp,
            updatedAt: timestamp
        };

        // Store in mock data
        mockTasks.push(taskData);

        return taskData;
    }

    /**
     * Mock updateTaskStatus method
     * Simulates task status updates in Firestore
     */
    static async updateTaskStatus(taskId: string) {
        const taskIndex = mockTasks.findIndex(t => t.id === taskId);

        if (taskIndex === -1) {
            throw new Error("Task not found in Firebase");
        }

        const updateData = {
            conversationStatus: "CLOSED",
            updatedAt: Timestamp.now()
        };

        // Update mock data
        mockTasks[taskIndex] = {
            ...mockTasks[taskIndex],
            ...updateData
        };

        return updateData;
    }

    /**
     * Utility methods for test setup and cleanup
     */
    static clearMockData() {
        mockMessages.length = 0;
        mockTasks.length = 0;
        mockCollections.clear();
    }

    static getMockMessages() {
        return [...mockMessages];
    }

    static getMockTasks() {
        return [...mockTasks];
    }

    static setMockMessages(messages: any[]) {
        mockMessages.length = 0;
        mockMessages.push(...messages);
    }

    static setMockTasks(tasks: any[]) {
        mockTasks.length = 0;
        mockTasks.push(...tasks);
    }
}

/**
 * Jest mock factory for FirebaseService
 * Creates comprehensive mocks with realistic Firebase response simulation
 */
export const createFirebaseServiceMock = () => {
    return {
        createMessage: jest.fn().mockImplementation(MockFirebaseService.createMessage),
        updateMessage: jest.fn().mockImplementation(MockFirebaseService.updateMessage),
        getTaskMessages: jest.fn().mockImplementation(MockFirebaseService.getTaskMessages),
        createTask: jest.fn().mockImplementation(MockFirebaseService.createTask),
        updateTaskStatus: jest.fn().mockImplementation(MockFirebaseService.updateTaskStatus)
    };
};

/**
 * Mock Firestore database configuration
 * Simulates Firebase Admin SDK behavior
 */
export const mockFirestoreDB = {
    collection: jest.fn((collectionName: string) => {
        switch (collectionName) {
        case "messages":
            return mockMessagesCollection;
        case "tasks":
            return mockTasksCollection;
        default:
            return {
                doc: jest.fn(() => ({
                    get: jest.fn().mockResolvedValue({ exists: false }),
                    set: jest.fn().mockResolvedValue(undefined),
                    update: jest.fn().mockResolvedValue(undefined)
                })),
                where: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                get: jest.fn().mockResolvedValue({ docs: [] })
            };
        }
    })
};

/**
 * Mock Timestamp class for Firebase
 * Simulates Firebase Timestamp behavior
 */
export const mockTimestamp = {
    now: jest.fn(() => ({
        seconds: Math.floor(Date.now() / 1000),
        nanoseconds: (Date.now() % 1000) * 1000000,
        toDate: () => new Date(),
        toMillis: () => Date.now()
    })),
    fromDate: jest.fn((date: Date) => ({
        seconds: Math.floor(date.getTime() / 1000),
        nanoseconds: (date.getTime() % 1000) * 1000000,
        toDate: () => date,
        toMillis: () => date.getTime()
    }))
};

/**
 * Simulates Firebase Admin SDK authentication
 */
export const mockFirebaseAuth = {
    verifyIdToken: jest.fn(async (token: string) => {
        // Simulate invalid token
        if (token === "invalid_token" || token === "expired_token") {
            throw new Error("Invalid or expired token");
        }

        // Return mock decoded token
        return {
            uid: "test_user_123",
            email: "test@example.com",
            email_verified: true,
            name: "Test User",
            picture: "https://example.com/avatar.jpg",
            iss: "https://securetoken.google.com/test-project",
            aud: "test-project",
            auth_time: Math.floor(Date.now() / 1000),
            user_id: "test_user_123",
            sub: "test_user_123",
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 3600,
            firebase: {
                identities: {
                    email: ["test@example.com"]
                },
                sign_in_provider: "password"
            }
        };
    })
};

/**
 * Mock Firebase Admin instance
 * Simulates Firebase Admin SDK
 */
export const mockFirebaseAdmin = {
    auth: jest.fn(() => mockFirebaseAuth),
    firestore: jest.fn(() => mockFirestoreDB),
    credential: {
        cert: jest.fn(() => ({}))
    },
    initializeApp: jest.fn()
};

/**
 * Test helper functions for Firebase mocking
 */
export const FirebaseTestHelpers = {
    /**
     * Creates a realistic message object for testing
     */
    createMockMessage: (overrides: Partial<Message> = {}): Message => ({
        userId: "test_user_123",
        taskId: "test_task_456",
        type: MessageType.GENERAL,
        body: "Test message body",
        attachments: [],
        ...overrides
    }),

    /**
     * Creates a realistic task object for testing
     */
    createMockTask: (overrides: any = {}) => ({
        id: "test_task_123",
        creatorId: "creator_456",
        contributorId: "contributor_789",
        conversationStatus: "OPEN",
        createdAt: mockTimestamp.now(),
        updatedAt: mockTimestamp.now(),
        ...overrides
    }),

    /**
     * Creates a mock decoded token for testing
     */
    createMockDecodedToken: (overrides: any = {}) => ({
        uid: "test_user_123",
        email: "test@example.com",
        email_verified: true,
        name: "Test User",
        iss: "https://securetoken.google.com/test-project",
        aud: "test-project",
        auth_time: Math.floor(Date.now() / 1000),
        user_id: "test_user_123",
        sub: "test_user_123",
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        ...overrides
    }),

    /**
     * Sets up Firebase mocks for testing
     */
    setupFirebaseMocks: () => {
        // Mock Firebase Admin SDK
        jest.mock("firebase-admin/firestore", () => ({
            Timestamp: mockTimestamp
        }));

        // Mock Firebase config
        jest.mock("../../api/config/firebase.config", () => ({
            firestoreDB: mockFirestoreDB,
            firebaseAdmin: mockFirebaseAdmin
        }));

        return {
            mockFirestoreDB,
            mockFirebaseAdmin,
            mockFirebaseAuth,
            mockTimestamp,
            mockMessagesCollection,
            mockTasksCollection
        };
    },

    /**
     * Resets all Firebase mocks
     */
    resetFirebaseMocks: () => {
        MockFirebaseService.clearMockData();
        jest.clearAllMocks();
    },

    /**
     * Simulates token verification failure
     */
    simulateAuthFailure: () => {
        mockFirebaseAuth.verifyIdToken.mockRejectedValueOnce(
            new Error("Invalid or expired token")
        );
    },

    /**
     * Simulates successful token verification with custom user
     */
    simulateAuthSuccess: (userData: any = {}) => {
        mockFirebaseAuth.verifyIdToken.mockResolvedValueOnce({
            uid: "test_user_123",
            email: "test@example.com",
            email_verified: true,
            ...userData
        });
    }
};
