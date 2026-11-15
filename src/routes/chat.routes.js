const express = require("express");
const authenticateToken = require("../middleware/auth.middleware");
const chatService = require("../services/chat.service");

const router = express.Router();

// -------------------------------------------------------------
// 1. CREATE CHAT SESSION
// Endpoint: POST /api/chat/sessions
// -------------------------------------------------------------
router.post("/sessions", authenticateToken, async (req, res, next) => {
  try {
    const { title } = req.body;
    const session = await chatService.createSession(
      req.user.id,
      req.user,
      title || "New Conversation"
    );

    return res.status(201).json({
      success: true,
      message: "Chat session created successfully",
      session,
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// 2. LIST LOGGED-IN STUDENT'S CHAT SESSIONS
// Endpoint: GET /api/chat/sessions
// -------------------------------------------------------------
router.get("/sessions", authenticateToken, async (req, res, next) => {
  try {
    const sessions = await chatService.listUserSessions(req.user.id, req.user);

    return res.status(200).json({
      success: true,
      sessions,
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// 3. GET SESSION DETAILS AND MESSAGES
// Endpoint: GET /api/chat/sessions/:id
// Enforces ownership (student can only access their own session)
// -------------------------------------------------------------
router.get("/sessions/:id", authenticateToken, async (req, res, next) => {
  try {
    const sessionId = req.params.id;
    const session = await chatService.getSession(sessionId, req.user);

    return res.status(200).json({
      success: true,
      session,
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// 4. APPEND A MESSAGE TO A SESSION
// Endpoint: POST /api/chat/sessions/:id/messages
// -------------------------------------------------------------
router.post("/sessions/:id/messages", authenticateToken, async (req, res, next) => {
  try {
    const sessionId = req.params.id;
    const { content, senderType = "STUDENT", sources = null } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message content cannot be empty",
      });
    }

    const message = await chatService.addMessage(sessionId, req.user, {
      content: content.trim(),
      senderType: senderType || "STUDENT",
      sources: sources || null,
    });

    return res.status(201).json({
      success: true,
      message,
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// 5. DELETE A CHAT SESSION
// Endpoint: DELETE /api/chat/sessions/:id
// -------------------------------------------------------------
router.delete("/sessions/:id", authenticateToken, async (req, res, next) => {
  try {
    const sessionId = req.params.id;
    await chatService.deleteSession(sessionId, req.user);

    return res.status(200).json({
      success: true,
      message: "Chat session deleted successfully",
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
