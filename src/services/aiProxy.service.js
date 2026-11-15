/**
 * Service for communicating server-side with the Python FastAPI AI Service.
 * Protects upstream secrets, validates payloads, enforces request timeouts,
 * and standardizes error responses.
 */

const DEFAULT_AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";
const DEFAULT_TIMEOUT_MS = 15000;

class AIProxyService {
  constructor(baseUrl = DEFAULT_AI_SERVICE_URL, timeoutMs = DEFAULT_TIMEOUT_MS) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.timeoutMs = timeoutMs;
  }

  /**
   * Helper to perform timeout-guarded HTTP fetch to the AI service
   */
  async _postToAI(endpoint, payload) {
    const url = `${this.baseUrl}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseBody = await response.json().catch(() => null);

      if (!response.ok) {
        const error = new Error(
          (responseBody && (responseBody.detail || responseBody.message)) ||
          `AI service responded with HTTP ${response.status}`
        );
        error.statusCode = response.status >= 500 ? 503 : response.status;
        error.details = responseBody;
        throw error;
      }

      return responseBody;
    } catch (err) {
      clearTimeout(timeoutId);

      if (err.name === "AbortError") {
        const timeoutError = new Error("AI service request timed out. Please try again.");
        timeoutError.statusCode = 504;
        throw timeoutError;
      }

      if (err.code === "ECONNREFUSED" || err.message?.includes("fetch failed")) {
        const connError = new Error("AI service is currently unavailable. Please verify the AI service is running.");
        connError.statusCode = 503;
        throw connError;
      }

      throw err;
    }
  }

  /**
   * Forwards query to RAG Chatbot (/chat)
   */
  async askChatbot({ question, top_k = 5 }) {
    if (!question || !question.trim()) {
      const error = new Error("Question cannot be empty or whitespace only");
      error.statusCode = 400;
      throw error;
    }

    return await this._postToAI("/chat", {
      question: question.trim(),
      top_k: parseInt(top_k, 10) || 5,
    });
  }

  /**
   * Forwards merit rank and criteria to /recommend-colleges
   */
  async recommendColleges({ rank, category, preferred_course, preferred_location, top_k = 10 }) {
    if (!rank || parseInt(rank, 10) <= 0) {
      const error = new Error("rank must be a positive integer");
      error.statusCode = 400;
      throw error;
    }

    if (!category || !category.trim()) {
      const error = new Error("category is required");
      error.statusCode = 400;
      throw error;
    }

    return await this._postToAI("/recommend-colleges", {
      rank: parseInt(rank, 10),
      category: category.trim().toUpperCase(),
      preferred_course: preferred_course ? preferred_course.trim() : null,
      preferred_location: preferred_location ? preferred_location.trim() : null,
      top_k: parseInt(top_k, 10) || 10,
    });
  }

  /**
   * Forwards college and course details to /predict-cutoff
   */
  async predictCutoff({ college_id, course_name, category }) {
    if (!college_id || !college_id.trim()) {
      const error = new Error("college_id is required");
      error.statusCode = 400;
      throw error;
    }

    if (!course_name || !course_name.trim()) {
      const error = new Error("course_name is required");
      error.statusCode = 400;
      throw error;
    }

    if (!category || !category.trim()) {
      const error = new Error("category is required");
      error.statusCode = 400;
      throw error;
    }

    return await this._postToAI("/predict-cutoff", {
      college_id: college_id.trim(),
      course_name: course_name.trim(),
      category: category.trim().toUpperCase(),
    });
  }
}

module.exports = new AIProxyService();
