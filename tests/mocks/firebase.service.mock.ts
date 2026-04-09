import { vi } from "vitest";
import { MessageType, Message } from "../../api/models/task.model.js";

/**
 * Provides comprehensive mocks for FirebaseService methods
 */


/**
 * Simulates Firebase Admin SDK behavior
 */
const hoisted = vi.hoisted(() => {
    const mockMessages: any[] = [];
    const mockTasks: any[] = [];

    const messagesCol = {
        doc: vi.fn((id?: string) => ({
            id: id || `mock_message_${Date.now()}`,
            get: vi.fn().mockResolvedValue({
                exists: true,
                id: id || `mock_message_${Date.now()}`,
                data: () => mockMessages.find(m => m.id === id) || {}
            }),
            set: vi.fn().mockResolvedValue(undefined),
            update: vi.fn().mockResolvedValue(undefined)
        })),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue({
            docs: mockMessages.map(msg => ({
                id: msg.id,
                data: () => msg
            }))
        })
    };

    const tasksCol = {
        doc: vi.fn((id?: string) => ({
            id: id || `mock_task_${Date.now()}`,
            get: vi.fn().mockResolvedValue({
                exists: true,
                id: id || `mock_task_${Date.now()}`,
                data: () => mockTasks.find(t => t.id === id) || {}
            }),
            set: vi.fn().mockResolvedValue(undefined),
            update: vi.fn().mockResolvedValue(undefined)
        }))
    };

    const firestoreDB = {
        collection: vi.fn((collectionName: string) => {
            switch (collectionName) {
                case "messages":
                    return messagesCol;
                case "tasks":
                    return tasksCol;
                default:
                    return {
                        doc: vi.fn(() => ({
                            get: vi.fn().mockResolvedValue({ exists: false }),
                            set: vi.fn().mockResolvedValue(undefined),
                            update: vi.fn().mockResolvedValue(undefined)
                        })),
                        where: vi.fn().mockReturnThis(),
                        orderBy: vi.fn().mockReturnThis(),
                        get: vi.fn().mockResolvedValue({ docs: [] })
                    };
            }
        })
    };

    const timestamp = {
        now: vi.fn(() => ({
            seconds: Math.floor(Date.now() / 1000),
            nanoseconds: (Date.now() % 1000) * 1000000,
            toDate: () => new Date(),
            toMillis: () => Date.now()
        })),
        fromDate: vi.fn((date: Date) => ({
            seconds: Math.floor(date.getTime() / 1000),
            nanoseconds: (date.getTime() % 1000) * 1000000,
            toDate: () => date,
            toMillis: () => date.getTime()
        }))
    };

    const firebaseAuth = {
        verifyIdToken: vi.fn((token: string, overrides?: any) => {
            if (token === "invalid_token" || token === "expired_token" || !token) {
                throw new Error("Invalid or expired token");
            }
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
                },
                ...overrides
            };
        })
    };

    const firebaseAdmin = {
        auth: () => firebaseAuth,
        firestore: () => firestoreDB,
        credential: {
            cert: () => vi.fn()
        }
    };

    class serviceMock {
        static async createMessage({ userId, taskId, type, body, metadata = {}, attachments = [] }: any) {
            const messageId = `mock_message_${Date.now()}_${Math.random()}`;
            const ts = timestamp.now();
            const messageData = { id: messageId, userId, taskId, type, body, metadata, attachments, createdAt: ts, updatedAt: ts };
            mockMessages.push(messageData);
            return messageData;
        }
        static async updateMessage(messageId: string, data: any) {
            const index = mockMessages.findIndex(m => m.id === messageId);
            if (index === -1) throw new Error("Message not found");
            const updateData = { ...data, updatedAt: timestamp.now() };
            mockMessages[index] = { ...mockMessages[index], ...updateData };
            return { id: messageId, ...mockMessages[index] };
        }
        static async getTaskMessages(taskId: string) {
            return mockMessages.filter(msg => msg.taskId === taskId)
                .sort((a, b) => b.createdAt.seconds - a.createdAt.seconds)
                .map(msg => ({ id: msg.id, ...msg }));
        }
        static async createTask(taskId: string, creatorId: string, contributorId: string) {
            const existingTask = mockTasks.find(t => t.id === taskId);
            if (existingTask) return existingTask;
            const ts = timestamp.now();
            const taskData = { id: taskId, creatorId, contributorId, conversationStatus: "OPEN", createdAt: ts, updatedAt: ts };
            mockTasks.push(taskData);
            return taskData;
        }
        static async updateTaskStatus(taskId: string) {
            const index = mockTasks.findIndex(t => t.id === taskId);
            if (index === -1) throw new Error("Task not found in Firebase");
            const updateData = { conversationStatus: "CLOSED", updatedAt: timestamp.now() };
            mockTasks[index] = { ...mockTasks[index], ...updateData };
            return updateData;
        }
        static clearMockData() {
            mockMessages.length = 0;
            mockTasks.length = 0;
        }
        static getMockMessages() { return [...mockMessages]; }
        static getMockTasks() { return [...mockTasks]; }
        static setMockMessages(messages: any[]) { mockMessages.length = 0; mockMessages.push(...messages); }
        static setMockTasks(tasks: any[]) { mockTasks.length = 0; mockTasks.push(...tasks); }
    }

    const createServiceMock = () => ({
        createMessage: vi.fn().mockImplementation(serviceMock.createMessage),
        updateMessage: vi.fn().mockImplementation(serviceMock.updateMessage),
        getTaskMessages: vi.fn().mockImplementation(serviceMock.getTaskMessages),
        createTask: vi.fn().mockImplementation(serviceMock.createTask),
        updateTaskStatus: vi.fn().mockImplementation(serviceMock.updateTaskStatus)
    });

    return {
        mockMessagesCollection: messagesCol,
        mockTasksCollection: tasksCol,
        mockFirestoreDB: firestoreDB,
        mockTimestamp: timestamp,
        mockFirebaseAuth: firebaseAuth,
        mockFirebaseAdmin: firebaseAdmin,
        MockFirebaseService: serviceMock,
        createFirebaseServiceMock: createServiceMock
    };
});

export const {
    mockMessagesCollection,
    mockTasksCollection,
    mockFirestoreDB,
    mockTimestamp,
    mockFirebaseAuth,
    mockFirebaseAdmin,
    MockFirebaseService,
    createFirebaseServiceMock
} = hoisted;

// Mock Firebase Admin SDK
vi.mock("firebase-admin/firestore", () => ({
    Timestamp: mockTimestamp
}));

// Mock Firebase config
vi.mock("../../api/config/firebase.config.js", () => ({
    firestoreDB: mockFirestoreDB,
    firebaseAdmin: mockFirebaseAdmin
}));

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
        vi.mock("firebase-admin/firestore", () => ({
            Timestamp: mockTimestamp
        }));

        // Mock Firebase config
        vi.mock("../../api/config/firebase.config.js", () => ({
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
        vi.clearAllMocks();
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
