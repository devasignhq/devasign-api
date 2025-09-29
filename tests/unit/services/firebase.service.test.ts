import { Message, MessageType } from "../../../api/models/general.model";
import { Timestamp } from "firebase-admin/firestore";

// Mock Firebase Admin SDK first
jest.mock("firebase-admin/firestore", () => ({
    Timestamp: {
        now: jest.fn(() => ({
            seconds: Math.floor(Date.now() / 1000),
            nanoseconds: (Date.now() % 1000) * 1000000,
            toDate: () => new Date(),
            toMillis: () => Date.now()
        }))
    }
}));

// Create mock Firestore DB
const mockMessagesCollection = {
    doc: jest.fn((id?: string) => ({
        id: id || `mock_message_${Date.now()}`,
        get: jest.fn().mockResolvedValue({
            exists: true,
            id: id || `mock_message_${Date.now()}`,
            data: () => ({})
        }),
        set: jest.fn().mockResolvedValue(undefined),
        update: jest.fn().mockResolvedValue(undefined)
    })),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue({
        docs: []
    })
};

const mockTasksCollection = {
    doc: jest.fn((id?: string) => ({
        id: id || `mock_task_${Date.now()}`,
        get: jest.fn().mockResolvedValue({
            exists: true,
            id: id || `mock_task_${Date.now()}`,
            data: () => ({})
        }),
        set: jest.fn().mockResolvedValue(undefined),
        update: jest.fn().mockResolvedValue(undefined)
    }))
};

const mockFirestoreDB = {
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

// Mock Firebase config
jest.mock("../../../api/config/firebase.config", () => ({
    firestoreDB: mockFirestoreDB
}));

// Import FirebaseService after mocking
import { FirebaseService } from "../../../api/services/firebase.service";

describe("FirebaseService", () => {
    beforeEach(() => {
        // Reset all mocks before each test
        jest.clearAllMocks();
    });

    describe("createMessage", () => {
        it("should create a message with all required fields", async () => {
            // Arrange
            const messageData: Message = {
                userId: "user123",
                taskId: "task456",
                type: MessageType.GENERAL,
                body: "Test message body",
                metadata: { requestedTimeline: 7, timelineType: "DAYS" as any },
                attachments: ["file1.txt", "file2.pdf"]
            };

            // Act
            const result = await FirebaseService.createMessage(messageData);

            // Assert
            expect(result).toBeDefined();
            expect(result.id).toBeDefined();
            expect(result.userId).toBe(messageData.userId);
            expect(result.taskId).toBe(messageData.taskId);
            expect(result.type).toBe(messageData.type);
            expect(result.body).toBe(messageData.body);
            expect(result.metadata).toEqual(messageData.metadata);
            expect(result.attachments).toEqual(messageData.attachments);
            expect(result.createdAt).toBeDefined();
            expect(result.updatedAt).toBeDefined();
        });
        it("should create a message with default values when optional fields are not provided", async () => {
            // Arrange
            const messageData: Message = {
                userId: "user123",
                taskId: "task456",
                body: "Test message body",
                attachments: []
            };

            // Act
            const result = await FirebaseService.createMessage(messageData);

            // Assert
            expect(result.type).toBe(MessageType.GENERAL);
            expect(result.metadata).toEqual({});
            expect(result.attachments).toEqual([]);
        });

        it("should call Firestore collection and document methods correctly", async () => {
            // Arrange
            const messageData: Message = {
                userId: "user123",
                taskId: "task456",
                body: "Test message body",
                attachments: []
            };

            // Act
            await FirebaseService.createMessage(messageData);

            // Assert
            expect(mockFirestoreDB.collection).toHaveBeenCalledWith("messages");
            expect(mockMessagesCollection.doc).toHaveBeenCalled();
        });
    });

    describe("updateMessage", () => {
        it("should update an existing message successfully", async () => {
            // Arrange
            const messageId = "message123";
            const updateData: Partial<Message> = {
                body: "Updated message body",
                metadata: { requestedTimeline: 14, timelineType: "DAYS" as any }
            };

            // Mock existing message
            const mockDoc = {
                exists: true,
                id: messageId,
                data: () => ({
                    userId: "user123",
                    taskId: "task456",
                    body: "Original body",
                    type: MessageType.GENERAL
                })
            };

            mockMessagesCollection.doc = jest.fn().mockReturnValue({
                get: jest.fn().mockResolvedValue(mockDoc),
                update: jest.fn().mockResolvedValue(undefined)
            });

            // Act
            const result = await FirebaseService.updateMessage(messageId, updateData);

            // Assert
            expect(result).toBeDefined();
            expect(result.id).toBe(messageId);
            expect(mockMessagesCollection.doc).toHaveBeenCalledWith(messageId);
        });

        it("should throw error when message does not exist", async () => {
            // Arrange
            const messageId = "nonexistent123";
            const updateData: Partial<Message> = {
                body: "Updated body"
            };

            // Mock non-existent message
            mockMessagesCollection.doc = jest.fn().mockReturnValue({
                get: jest.fn().mockResolvedValue({ exists: false })
            });

            // Act & Assert
            await expect(FirebaseService.updateMessage(messageId, updateData))
                .rejects.toThrow("Message not found");
        });

        it("should update the updatedAt timestamp", async () => {
            // Arrange
            const messageId = "message123";
            const updateData: Partial<Message> = { body: "Updated body" };

            const mockUpdate = jest.fn();
            mockMessagesCollection.doc = jest.fn().mockReturnValue({
                get: jest.fn().mockResolvedValue({ exists: true }),
                update: mockUpdate
            });

            // Act
            await FirebaseService.updateMessage(messageId, updateData);

            // Assert
            expect(mockUpdate).toHaveBeenCalledWith(
                expect.objectContaining({
                    body: "Updated body",
                    updatedAt: expect.any(Object)
                })
            );
        });
    });
    describe("getTaskMessages", () => {
        it("should retrieve messages for a specific task", async () => {
            // Arrange
            const taskId = "task456";
            const mockMessages = [
                { id: "msg1", taskId, body: "Message 1", createdAt: { seconds: 1000 } },
                { id: "msg2", taskId, body: "Message 2", createdAt: { seconds: 2000 } }
            ];

            mockMessagesCollection.where = jest.fn().mockReturnThis();
            mockMessagesCollection.orderBy = jest.fn().mockReturnThis();
            mockMessagesCollection.get = jest.fn().mockResolvedValue({
                docs: mockMessages.map(msg => ({
                    id: msg.id,
                    data: () => msg
                }))
            });

            // Act
            const result = await FirebaseService.getTaskMessages(taskId);

            // Assert
            expect(result).toHaveLength(2);
            expect(result[0].id).toBe("msg1");
            expect(result[1].id).toBe("msg2");
            expect(mockMessagesCollection.where).toHaveBeenCalledWith("taskId", "==", taskId);
            expect(mockMessagesCollection.orderBy).toHaveBeenCalledWith("createdAt", "desc");
        });

        it("should return empty array when no messages found for task", async () => {
            // Arrange
            const taskId = "nonexistent_task";

            mockMessagesCollection.where = jest.fn().mockReturnThis();
            mockMessagesCollection.orderBy = jest.fn().mockReturnThis();
            mockMessagesCollection.get = jest.fn().mockResolvedValue({ docs: [] });

            // Act
            const result = await FirebaseService.getTaskMessages(taskId);

            // Assert
            expect(result).toEqual([]);
        });

        it("should order messages by createdAt in descending order", async () => {
            // Arrange
            const taskId = "task456";

            // Act
            await FirebaseService.getTaskMessages(taskId);

            // Assert
            expect(mockMessagesCollection.orderBy).toHaveBeenCalledWith("createdAt", "desc");
        });
    });

    describe("createTask", () => {
        it("should create a new task successfully", async () => {
            // Arrange
            const taskId = "task123";
            const creatorId = "creator456";
            const contributorId = "contributor789";

            // Mock non-existent task
            const mockTaskRef = {
                get: jest.fn().mockResolvedValue({ exists: false }),
                set: jest.fn().mockResolvedValue(undefined)
            };
            mockTasksCollection.doc = jest.fn().mockReturnValue(mockTaskRef);

            // Act
            const result = await FirebaseService.createTask(taskId, creatorId, contributorId);

            // Assert
            expect(result).toBeDefined();
            expect(result!.id).toBe(taskId);
            expect(result!.creatorId).toBe(creatorId);
            expect(result!.contributorId).toBe(contributorId);
            expect(result!.conversationStatus).toBe("OPEN");
            expect(result!.createdAt).toBeDefined();
            expect(result!.updatedAt).toBeDefined();
            expect(mockTaskRef.set).toHaveBeenCalled();
        });

        it("should return early if task already exists", async () => {
            // Arrange
            const taskId = "existing_task";
            const creatorId = "creator456";
            const contributorId = "contributor789";

            // Mock existing task
            const mockTaskRef = {
                get: jest.fn().mockResolvedValue({ exists: true }),
                set: jest.fn()
            };
            mockTasksCollection.doc = jest.fn().mockReturnValue(mockTaskRef);

            // Act
            const result = await FirebaseService.createTask(taskId, creatorId, contributorId);

            // Assert
            expect(result).toBeUndefined();
            expect(mockTaskRef.set).not.toHaveBeenCalled();
        });

        it("should set correct task data structure", async () => {
            // Arrange
            const taskId = "task123";
            const creatorId = "creator456";
            const contributorId = "contributor789";

            const mockTaskRef = {
                get: jest.fn().mockResolvedValue({ exists: false }),
                set: jest.fn().mockResolvedValue(undefined)
            };
            mockTasksCollection.doc = jest.fn().mockReturnValue(mockTaskRef);

            // Act
            await FirebaseService.createTask(taskId, creatorId, contributorId);

            // Assert
            expect(mockTaskRef.set).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: taskId,
                    creatorId,
                    contributorId,
                    conversationStatus: "OPEN",
                    createdAt: expect.any(Object),
                    updatedAt: expect.any(Object)
                })
            );
        });
    });

    describe("updateTaskStatus", () => {
        it("should update task status to CLOSED successfully", async () => {
            // Arrange
            const taskId = "task123";

            // Mock existing task
            const mockTaskRef = {
                get: jest.fn().mockResolvedValue({ exists: true }),
                update: jest.fn().mockResolvedValue(undefined)
            };
            mockTasksCollection.doc = jest.fn().mockReturnValue(mockTaskRef);

            // Act
            const result = await FirebaseService.updateTaskStatus(taskId);

            // Assert
            expect(result).toBeDefined();
            expect(result.conversationStatus).toBe("CLOSED");
            expect(result.updatedAt).toBeDefined();
            expect(mockTaskRef.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    conversationStatus: "CLOSED",
                    updatedAt: expect.any(Object)
                })
            );
        });

        it("should throw error when task does not exist", async () => {
            // Arrange
            const taskId = "nonexistent_task";

            // Mock non-existent task
            const mockTaskRef = {
                get: jest.fn().mockResolvedValue({ exists: false })
            };
            mockTasksCollection.doc = jest.fn().mockReturnValue(mockTaskRef);

            // Act & Assert
            await expect(FirebaseService.updateTaskStatus(taskId))
                .rejects.toThrow("Task not found in Firebase");
        });

        it("should call correct Firestore methods", async () => {
            // Arrange
            const taskId = "task123";

            const mockTaskRef = {
                get: jest.fn().mockResolvedValue({ exists: true }),
                update: jest.fn().mockResolvedValue(undefined)
            };
            mockTasksCollection.doc = jest.fn().mockReturnValue(mockTaskRef);

            // Act
            await FirebaseService.updateTaskStatus(taskId);

            // Assert
            expect(mockTasksCollection.doc).toHaveBeenCalledWith(taskId);
            expect(mockTaskRef.get).toHaveBeenCalled();
            expect(mockTaskRef.update).toHaveBeenCalled();
        });
    });

    describe("Error Handling", () => {
        it("should handle Firestore connection errors in createMessage", async () => {
            // Arrange
            const messageData: Message = {
                userId: "user123",
                taskId: "task456",
                body: "Test message",
                attachments: []
            };

            mockMessagesCollection.doc = jest.fn().mockReturnValue({
                set: jest.fn().mockRejectedValue(new Error("Firestore connection error"))
            });

            // Act & Assert
            await expect(FirebaseService.createMessage(messageData))
                .rejects.toThrow("Firestore connection error");
        });
        
        it("should handle Firestore errors in getTaskMessages", async () => {
            // Arrange
            const taskId = "task456";

            mockMessagesCollection.where = jest.fn().mockReturnThis();
            mockMessagesCollection.orderBy = jest.fn().mockReturnThis();
            mockMessagesCollection.get = jest.fn().mockRejectedValue(new Error("Query failed"));

            // Act & Assert
            await expect(FirebaseService.getTaskMessages(taskId))
                .rejects.toThrow("Query failed");
        });

        it("should handle Firestore errors in createTask", async () => {
            // Arrange
            const taskId = "task123";
            const creatorId = "creator456";
            const contributorId = "contributor789";

            const mockTaskRef = {
                get: jest.fn().mockResolvedValue({ exists: false }),
                set: jest.fn().mockRejectedValue(new Error("Task creation failed"))
            };
            mockTasksCollection.doc = jest.fn().mockReturnValue(mockTaskRef);

            // Act & Assert
            await expect(FirebaseService.createTask(taskId, creatorId, contributorId))
                .rejects.toThrow("Task creation failed");
        });
    });

    describe("Firestore Dependencies Verification", () => {
        it("should verify messagesCollection is called for message operations", async () => {
            // Arrange
            const messageData: Message = {
                userId: "user123",
                taskId: "task456",
                body: "Test message",
                attachments: []
            };

            // Act
            await FirebaseService.createMessage(messageData);

            // Assert
            expect(mockFirestoreDB.collection).toHaveBeenCalledWith("messages");
        });

        it("should verify tasksCollection is called for task operations", async () => {
            // Arrange
            const taskId = "task123";
            const creatorId = "creator456";
            const contributorId = "contributor789";

            const mockTaskRef = {
                get: jest.fn().mockResolvedValue({ exists: false }),
                set: jest.fn().mockResolvedValue(undefined)
            };
            mockTasksCollection.doc = jest.fn().mockReturnValue(mockTaskRef);

            // Act
            await FirebaseService.createTask(taskId, creatorId, contributorId);

            // Assert
            expect(mockFirestoreDB.collection).toHaveBeenCalledWith("tasks");
        });

        it("should verify Timestamp.now() is called for timestamp fields", async () => {
            // Arrange
            const messageData: Message = {
                userId: "user123",
                taskId: "task456",
                body: "Test message",
                attachments: []
            };

            const timestampSpy = jest.spyOn(Timestamp, "now");

            // Act
            await FirebaseService.createMessage(messageData);

            // Assert
            expect(timestampSpy).toHaveBeenCalled();
        });
    });
});
