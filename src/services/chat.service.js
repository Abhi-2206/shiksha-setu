const prisma = require("../lib/prisma");

/**
 * Service for ChatSession and ChatMessage operations.
 * Enforces ownership access rules:
 * - Students can only create, view, message, and delete their OWN chat sessions.
 * - Cross-user session access by ID tampering is rejected with 403 Forbidden.
 * - Administrators can inspect sessions for moderation/audit if needed.
 */
class ChatService {
  /**
   * Creates a new chat session for a student.
   */
  async createSession(targetUserId, requestingUser, title = "New Conversation") {
    if (!requestingUser) {
      const error = new Error("Authentication required");
      error.statusCode = 401;
      throw error;
    }

    const isSelf = requestingUser.id === targetUserId;
    const isAdmin = requestingUser.role === "ADMIN";

    if (!isSelf && !isAdmin) {
      const error = new Error("Forbidden: Cannot create chat session on behalf of another user");
      error.statusCode = 403;
      throw error;
    }

    return await prisma.chatSession.create({
      data: {
        userId: targetUserId,
        title: title || "New Conversation",
      },
      include: {
        messages: true,
      },
    });
  }

  /**
   * Retrieves a chat session with its messages.
   * Enforces that requesting user is either the session owner or an ADMIN.
   */
  async getSession(sessionId, requestingUser) {
    if (!requestingUser) {
      const error = new Error("Authentication required");
      error.statusCode = 401;
      throw error;
    }

    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!session) {
      const error = new Error("Chat session not found");
      error.statusCode = 404;
      throw error;
    }

    const isSelf = requestingUser.id === session.userId;
    const isAdmin = requestingUser.role === "ADMIN";

    if (!isSelf && !isAdmin) {
      const error = new Error("Forbidden: You do not own this chat session");
      error.statusCode = 403;
      throw error;
    }

    return session;
  }

  /**
   * Lists chat sessions owned by a user.
   */
  async listUserSessions(targetUserId, requestingUser) {
    if (!requestingUser) {
      const error = new Error("Authentication required");
      error.statusCode = 401;
      throw error;
    }

    const isSelf = requestingUser.id === targetUserId;
    const isAdmin = requestingUser.role === "ADMIN";

    if (!isSelf && !isAdmin) {
      const error = new Error("Forbidden: You cannot view another user's chat history");
      error.statusCode = 403;
      throw error;
    }

    return await prisma.chatSession.findMany({
      where: { userId: targetUserId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { messages: true },
        },
      },
    });
  }

  /**
   * Appends a message to a chat session.
   * Validates session ownership before allowing the message to be added.
   */
  async addMessage(sessionId, requestingUser, { content, senderType = "STUDENT", sources = null }) {
    if (!requestingUser) {
      const error = new Error("Authentication required");
      error.statusCode = 401;
      throw error;
    }

    // Verify session ownership
    const session = await this.getSession(sessionId, requestingUser);

    if (!content || !content.trim()) {
      const error = new Error("Message content cannot be empty");
      error.statusCode = 400;
      throw error;
    }

    return await prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        senderType: senderType || "STUDENT",
        content: content.trim(),
        sources: sources || undefined,
      },
    });
  }

  /**
   * Deletes a chat session and cascades all messages.
   */
  async deleteSession(sessionId, requestingUser) {
    if (!requestingUser) {
      const error = new Error("Authentication required");
      error.statusCode = 401;
      throw error;
    }

    // Verify session ownership
    const session = await this.getSession(sessionId, requestingUser);

    return await prisma.chatSession.delete({
      where: { id: session.id },
    });
  }
}

module.exports = new ChatService();
