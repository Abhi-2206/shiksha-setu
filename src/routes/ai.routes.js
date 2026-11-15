const express = require("express");
const authenticateToken = require("../middleware/auth.middleware");
const aiProxyService = require("../services/aiProxy.service");
const chatService = require("../services/chat.service");

const router = express.Router();

// -------------------------------------------------------------
// 1. AI RAG CHATBOT ENDPOINT
// Endpoint: POST /api/ai/chat
// Communicates with FastAPI server-side, saves chat history
// -------------------------------------------------------------
router.post("/chat", authenticateToken, async (req, res, next) => {
  try {
    const { question, top_k = 5, sessionId = null } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({
        success: false,
        message: "Question is required and cannot be empty",
      });
    }

    let activeSession = null;

    // If sessionId provided, verify ownership and save student's question
    if (sessionId) {
      activeSession = await chatService.getSession(sessionId, req.user);
      await chatService.addMessage(activeSession.id, req.user, {
        content: question.trim(),
        senderType: "STUDENT",
      });
    }

    // Call FastAPI AI Service
    const aiResult = await aiProxyService.askChatbot({
      question: question.trim(),
      top_k: top_k || 5,
    });

    // If session exists or was requested, save AI assistant answer with citations
    if (activeSession && aiResult.answer) {
      await chatService.addMessage(activeSession.id, req.user, {
        content: aiResult.answer,
        senderType: "ASSISTANT",
        sources: aiResult.sources || null,
      });
    }

    return res.status(200).json({
      success: true,
      answer: aiResult.answer,
      sources: aiResult.sources || [],
      sessionId: activeSession ? activeSession.id : null,
      status: aiResult.status || "success",
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// 2. COLLEGE RECOMMENDATION ENDPOINT
// Endpoint: POST /api/ai/recommend-colleges
// -------------------------------------------------------------
router.post("/recommend-colleges", authenticateToken, async (req, res, next) => {
  try {
    const { rank, category, preferred_course, preferred_location, top_k = 10 } = req.body;

    if (!rank || parseInt(rank, 10) <= 0) {
      return res.status(400).json({
        success: false,
        message: "rank is required and must be a positive integer",
      });
    }

    if (!category || !category.trim()) {
      return res.status(400).json({
        success: false,
        message: "category is required",
      });
    }

    const recommendations = await aiProxyService.recommendColleges({
      rank,
      category,
      preferred_course,
      preferred_location,
      top_k,
    });

    return res.status(200).json({
      success: true,
      ...recommendations,
    });
  } catch (error) {
    next(error);
  }
});

// -------------------------------------------------------------
// 3. CUTOFF PREDICTION ENDPOINT
// Endpoint: POST /api/ai/predict-cutoff
// -------------------------------------------------------------
router.post("/predict-cutoff", authenticateToken, async (req, res, next) => {
  try {
    const { college_id, course_name, category } = req.body;

    if (!college_id || !college_id.trim()) {
      return res.status(400).json({
        success: false,
        message: "college_id is required",
      });
    }

    if (!course_name || !course_name.trim()) {
      return res.status(400).json({
        success: false,
        message: "course_name is required",
      });
    }

    if (!category || !category.trim()) {
      return res.status(400).json({
        success: false,
        message: "category is required",
      });
    }

    const prediction = await aiProxyService.predictCutoff({
      college_id,
      course_name,
      category,
    });

    return res.status(200).json({
      success: true,
      ...prediction,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
