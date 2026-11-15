const express = require("express");
const prisma = require("../lib/prisma");
const authenticateToken = require("../middleware/auth.middleware");
const aiProxyService = require("../services/aiProxy.service");
const chatService = require("../services/chat.service");

const router = express.Router();

const VALID_CATEGORIES = new Set([
  "GEN",
  "GENERAL",
  "OBC",
  "SC",
  "ST",
  "EWS",
  "MBC",
  "TFWS",
  "PWD",
]);

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
    const { college_id, college_name, course_name, branch, category } = req.body;

    const course = (course_name || branch || "").trim();
    if (!course) {
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

    const upperCategory = category.trim().toUpperCase();
    if (!VALID_CATEGORIES.has(upperCategory)) {
      return res.status(400).json({
        success: false,
        message: `Invalid category '${category}'. Allowed categories: ${Array.from(VALID_CATEGORIES).join(", ")}`,
      });
    }

    // Convert GENERAL alias to standard GEN code
    const normalizedCategory = upperCategory === "GENERAL" ? "GEN" : upperCategory;

    const rawCollegeId = (college_id || "").trim();
    const rawCollegeName = (college_name || "").trim();

    if (!rawCollegeId && !rawCollegeName) {
      return res.status(400).json({
        success: false,
        message: "college_id is required",
      });
    }

    let resolvedCollegeId = "";

    // 1. If college_id is provided, check if it matches a registered college code or numeric ID
    if (rawCollegeId) {
      const numId = parseInt(rawCollegeId, 10);
      const matched = await prisma.college.findFirst({
        where: {
          OR: [
            { code: { equals: rawCollegeId, mode: "insensitive" } },
            ...(isNaN(numId) ? [] : [{ id: numId }]),
            { name: { equals: rawCollegeId, mode: "insensitive" } },
          ],
        },
      });
      if (matched) {
        resolvedCollegeId = matched.code;
      }
    }

    // 2. If unresolved and college_name is provided, lookup by registered college name
    if (!resolvedCollegeId && rawCollegeName) {
      const matched = await prisma.college.findFirst({
        where: {
          OR: [
            { code: { equals: rawCollegeName, mode: "insensitive" } },
            { name: { equals: rawCollegeName, mode: "insensitive" } },
            { name: { contains: rawCollegeName, mode: "insensitive" } },
          ],
        },
      });
      if (matched) {
        resolvedCollegeId = matched.code;
      }
    }

    // 3. Reject if the college cannot be resolved reliably to a registered college
    if (!resolvedCollegeId) {
      return res.status(400).json({
        success: false,
        message: `Unable to resolve college '${rawCollegeName || rawCollegeId}'. Please select a registered college.`,
      });
    }

    const prediction = await aiProxyService.predictCutoff({
      college_id: resolvedCollegeId,
      course_name: course,
      category: normalizedCategory,
    });

    return res.status(200).json({
      success: true,
      prediction,
      ...prediction,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
