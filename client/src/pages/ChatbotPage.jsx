import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { apiBase } from '../api';
import './ChatbotPage.css';

const DEFAULT_SUGGESTIONS = [
  'What are the eligibility criteria for polytechnic diploma admission in Rajasthan?',
  'Which government polytechnic colleges offer Computer Science in Jaipur or Jodhpur?',
  'What documents and certificates are required during counseling verification?',
  'What are the reservation rules and fee relaxation policies for technical students?',
];

let globalMsgCounter = 0;
function createMessageId(prefix) {
  globalMsgCounter += 1;
  return `${prefix}-${globalMsgCounter}`;
}

export default function ChatbotPage() {
  const { user, token, isAuthenticated } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto-scroll to bottom whenever new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Adjust textarea height dynamically
  const handleTextareaChange = (e) => {
    setInputValue(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  // Submit question to Express -> FastAPI RAG AI Service
  const handleSendMessage = async (textToSend) => {
    const query = (textToSend || inputValue).trim();
    if (!query || loading) return;

    setErrorBanner(null);

    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const userMsg = {
      id: createMessageId('user'),
      senderType: 'USER',
      text: query,
      createdAt: timeString,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    setLoading(true);

    try {
      const response = await fetch(`${apiBase}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          question: query,
          top_k: 5,
          sessionId: sessionId || null,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        const errorText = data.message || `AI service error (Status ${response.status})`;
        throw new Error(errorText);
      }

      if (data.sessionId && !sessionId) {
        setSessionId(data.sessionId);
      }

      const assistantMsg = {
        id: createMessageId('assistant'),
        senderType: 'ASSISTANT',
        text: data.answer || 'I could not generate an answer based on available DTE documents.',
        sources: Array.isArray(data.sources) ? data.sources : [],
        createdAt: timeString,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsgText = err.message || 'AI service request failed. Please check that the service is running.';
      setErrorBanner(errorMsgText);

      const errorAssistantMsg = {
        id: createMessageId('err'),
        senderType: 'ASSISTANT',
        text: `⚠️ ${errorMsgText}`,
        sources: [],
        isError: true,
        createdAt: timeString,
      };
      setMessages((prev) => [...prev, errorAssistantMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setErrorBanner(null);
    setSessionId(null);
  };

  return (
    <div className="chatbot-page">
      {/* Header */}
      <div className="chatbot-header">
        <div className="chatbot-header-left">
          <div className="chatbot-icon-badge">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              <circle cx="9" cy="10" r="1" />
              <circle cx="15" cy="10" r="1" />
            </svg>
          </div>
          <div>
            <h1 className="chatbot-title">
              Shiksha<span>Setu</span> AI Assistant
            </h1>
            <p className="chatbot-subtitle">
              Official AI Student Assistance for the Department of Technical Education, Rajasthan
            </p>
          </div>
        </div>

        {messages.length > 0 && (
          <div className="chatbot-header-actions">
            <button
              type="button"
              className="btn-clear-chat"
              onClick={handleClearChat}
              title="Start a new conversation"
            >
              <span>🗑️</span>
              <span>Clear Chat</span>
            </button>
          </div>
        )}
      </div>

      {/* Main Chat Container */}
      <div className="chatbot-container">
        
        {/* Messages List */}
        <div className="chatbot-messages">
          {messages.length === 0 ? (
            /* Welcome / Empty Screen */
            <div className="chatbot-welcome">
              <div className="chatbot-welcome-icon">🎓</div>
              <h2 className="chatbot-welcome-title">Welcome to ShikshaSetu AI Assistance</h2>
              <p className="chatbot-welcome-desc">
                Ask any question regarding polytechnic admissions, branch allocations,
                reservation criteria, college locations, and semester guidelines across Rajasthan.
                Answers are grounded directly in official DTE documents.
              </p>

              <div className="chatbot-suggestions-title">Frequently Asked Questions</div>
              <div className="chatbot-suggestions-grid">
                {DEFAULT_SUGGESTIONS.map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    className="chatbot-suggestion-btn"
                    disabled={!isAuthenticated || loading}
                    onClick={() => handleSendMessage(suggestion)}
                  >
                    <span>{suggestion}</span>
                    <span>→</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Message Bubbles */
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`chat-message-row ${msg.senderType === 'USER' ? 'user' : 'assistant'}`}
              >
                <div className={`chat-avatar ${msg.senderType === 'USER' ? 'user' : 'assistant'}`}>
                  {msg.senderType === 'USER'
                    ? (user?.name ? user.name.charAt(0).toUpperCase() : 'U')
                    : '🏛️'}
                </div>

                <div className="chat-bubble">
                  <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>

                  {/* Document Sources / Citations */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="chat-sources">
                      <div className="chat-sources-header">
                        <span>📚</span>
                        <span>Verified Citations ({msg.sources.length})</span>
                      </div>
                      <div className="chat-sources-list">
                        {msg.sources.map((src, i) => (
                          <div key={i} className="chat-source-item">
                            <strong>{src.title || src.document_id || 'Official Document'}</strong>
                            {src.page && <span> • Page {src.page}</span>}
                            {src.section && <span> • Section: {src.section}</span>}
                            {src.snippet && (
                              <p style={{ marginTop: '4px', fontStyle: 'italic', fontSize: '11px', color: '#666' }}>
                                "{src.snippet.slice(0, 160)}..."
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <span className="chat-time">{msg.createdAt}</span>
                </div>
              </div>
            ))
          )}

          {/* Typing Indicator */}
          {loading && (
            <div className="chat-message-row assistant">
              <div className="chat-avatar assistant">🏛️</div>
              <div className="chat-bubble">
                <div className="chat-typing-indicator">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Global Error Alert Banner if any */}
        {errorBanner && (
          <div className="chat-error-banner">
            <span>⚠️</span>
            <span>{errorBanner}</span>
          </div>
        )}

        {/* Input Bar or Auth Prompt */}
        {!isAuthenticated ? (
          <div className="chat-auth-banner">
            <span>
              🔒 <strong>Authentication Required:</strong> Please sign in to ask questions and receive grounded guidance from the AI Assistant.
            </span>
            <Link to="/login" className="chat-auth-btn">
              Sign In to Chat
            </Link>
          </div>
        ) : (
          <div className="chatbot-input-bar">
            <form
              className="chatbot-input-form"
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
            >
              <textarea
                ref={textareaRef}
                className="chatbot-textarea"
                placeholder="Ask about polytechnic admissions, college cutoffs, eligibility... (Press Enter to send)"
                value={inputValue}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                rows={1}
                disabled={loading}
              />
              <button
                type="submit"
                className="chatbot-send-btn"
                disabled={loading || !inputValue.trim()}
              >
                {loading ? 'Thinking...' : 'Send'}
              </button>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}
