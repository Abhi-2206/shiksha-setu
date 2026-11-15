import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { chatApi, aiApi } from '../api';
import './ChatbotPage.css';

const SUGGESTED_QUESTIONS = [
  'What are the eligibility criteria for polytechnic diploma in Rajasthan?',
  'Which government polytechnic colleges are located in Jaipur and Kota?',
  'What are the state reservation categories and fee concessions under DTE?',
  'What documents are mandatory for reporting during DTE counseling?',
  'Can I apply for lateral entry admission to the 2nd year directly?',
];

function ChatbotPage() {
  const { isAuthenticated, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Sessions list & active session
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(() => searchParams.get('session') || null);
  const [messages, setMessages] = useState([]);

  // Input & sending state
  const [inputQuery, setInputQuery] = useState('');
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [selectedLanguage, setSelectedLanguage] = useState('en');

  // Citations / details modal or toggle
  const [expandedCitationId, setExpandedCitationId] = useState(null);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending]);

  // Load user sessions on mount
  useEffect(() => {
    let active = true;

    async function fetchSessions() {
      if (!isAuthenticated) return;
      setLoadingSessions(true);
      try {
        const res = await chatApi.getSessions();
        if (active && res.success && Array.isArray(res.sessions)) {
          setSessions(res.sessions);
          const paramSession = searchParams.get('session');
          if (paramSession) {
            setActiveSessionId(paramSession);
          } else if (res.sessions.length > 0) {
            setActiveSessionId(res.sessions[0].id);
            setSearchParams({ session: res.sessions[0].id });
          }
        }
      } catch (err) {
        console.error('Failed to load sessions:', err);
      } finally {
        if (active) setLoadingSessions(false);
      }
    }

    fetchSessions();
    return () => {
      active = false;
    };
  }, [isAuthenticated, searchParams, setSearchParams]);

  // Load messages whenever activeSessionId changes
  useEffect(() => {
    if (!activeSessionId || !isAuthenticated) {
      return;
    }

    let isMounted = true;
    async function loadActiveMessages() {
      setLoadingMessages(true);
      setError(null);
      try {
        const res = await chatApi.getSessionById(activeSessionId);
        if (isMounted && res.success && res.session) {
          setMessages(res.session.messages || []);
        }
      } catch (err) {
        if (isMounted) setError(err.message || 'Failed to load conversation history.');
      } finally {
        if (isMounted) setLoadingMessages(false);
      }
    }

    loadActiveMessages();
    return () => {
      isMounted = false;
    };
  }, [activeSessionId, isAuthenticated]);

  // Create a brand new session
  const handleCreateNewSession = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    try {
      setError(null);
      const res = await chatApi.createSession('New Admission Inquiry');
      if (res.success && res.session) {
        setSessions((prev) => [res.session, ...prev]);
        setActiveSessionId(res.session.id);
        setSearchParams({ session: res.session.id });
        setMessages([]);
      }
    } catch (err) {
      setError(err.message || 'Could not create new session.');
    }
  };

  // Delete a session
  const handleDeleteSession = async (e, sessionId) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this chat session?')) return;

    try {
      await chatApi.deleteSession(sessionId);
      const remaining = sessions.filter((s) => s.id !== sessionId);
      setSessions(remaining);
      if (activeSessionId === sessionId) {
        if (remaining.length > 0) {
          setActiveSessionId(remaining[0].id);
          setSearchParams({ session: remaining[0].id });
        } else {
          setActiveSessionId(null);
          setSearchParams({});
          setMessages([]);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to delete session.');
    }
  };

  // Switch session
  const handleSelectSession = (sessionId) => {
    if (activeSessionId === sessionId) return;
    setActiveSessionId(sessionId);
    setSearchParams({ session: sessionId });
  };

  // Send message
  const handleSendMessage = async (queryText = inputQuery) => {
    const text = (queryText || '').trim();
    if (!text || sending) return;

    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    setError(null);
    setInputQuery('');

    // Ensure we have an active session
    let targetSessionId = activeSessionId;
    if (!targetSessionId) {
      try {
        const titleSnippet = text.length > 30 ? `${text.substring(0, 30)}...` : text;
        const newSessionRes = await chatApi.createSession(titleSnippet);
        if (newSessionRes.success && newSessionRes.session) {
          targetSessionId = newSessionRes.session.id;
          setActiveSessionId(targetSessionId);
          setSearchParams({ session: targetSessionId });
          setSessions((prev) => [newSessionRes.session, ...prev]);
        }
      } catch (err) {
        setError('Failed to initialize chat session. ' + err.message);
        return;
      }
    }

    // Optimistically append student message
    const tempUserMsg = {
      id: `temp-${Date.now()}`,
      content: text,
      sender: 'STUDENT',
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setSending(true);

    try {
      // Call backend AI endpoint: POST /api/ai/chat
      const response = await aiApi.askChatbot({
        query: text,
        sessionId: targetSessionId,
        language: selectedLanguage,
      });

      if (response.success) {
        const aiMsg = {
          id: `ai-${Date.now()}`,
          content: response.answer,
          sender: 'ASSISTANT',
          metadata: {
            sources: response.sources || [],
            confidence: response.confidence,
          },
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, aiMsg]);
        // Update session in list timestamp
        setSessions((prev) =>
          prev.map((s) => (s.id === targetSessionId ? { ...s, updatedAt: new Date().toISOString() } : s))
        );
      } else {
        throw new Error(response.message || 'AI service did not return a valid response.');
      }
    } catch (err) {
      console.error('Chat error:', err);
      setError(
        err.message?.includes('unavailable')
          ? 'The AI Service is currently warming up or unavailable. Please try again shortly.'
          : err.message || 'Failed to get answer. Please retry.'
      );
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="chatbot-page">
      
      {/* 1. Page Header */}
      <header className="chatbot-header">
        <div className="header-info">
          <span className="chatbot-badge">
            AI Assistant • Department of Technical Education, Rajasthan
          </span>
          <h1 className="chatbot-title">
            ShikshaSetu <span>AI Counselor</span>
          </h1>
          <p className="chatbot-subtitle">
            Get instant, verified answers regarding polytechnic admissions, cutoff trends, 
            reservation categories, and counseling guidelines.
          </p>
        </div>

        <div className="header-controls">
          <div className="language-selector">
            <label htmlFor="langSelect">Language:</label>
            <select
              id="langSelect"
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
            >
              <option value="en">English</option>
              <option value="hi">हिंदी (Hindi)</option>
            </select>
          </div>
          <button 
            type="button" 
            className="btn-new-chat"
            onClick={handleCreateNewSession}
          >
            + New Conversation
          </button>
        </div>
      </header>

      {/* 2. Main Chat Workspace */}
      <div className="chat-layout">
        
        {/* Left Sidebar: Session History */}
        <aside className="chat-sidebar">
          <div className="sidebar-header">
            <span className="sidebar-title">Past Inquiries</span>
            <span className="session-count-badge">{sessions.length}</span>
          </div>

          <div className="sidebar-sessions-list">
            {loadingSessions ? (
              <div className="sidebar-loading">
                <div className="spinner-sm"></div>
                <span>Loading sessions...</span>
              </div>
            ) : sessions.length === 0 ? (
              <div className="sidebar-empty">
                <p>No conversations yet.</p>
                <span>Click "+ New Conversation" to start.</span>
              </div>
            ) : (
              sessions.map((sess) => (
                <div
                  key={sess.id}
                  className={`session-item ${sess.id === activeSessionId ? 'active' : ''}`}
                  onClick={() => handleSelectSession(sess.id)}
                >
                  <div className="session-item-body">
                    <span className="session-title-text">{sess.title || 'Inquiry'}</span>
                    <span className="session-date-text">
                      {new Date(sess.updatedAt || sess.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="session-delete-btn"
                    onClick={(e) => handleDeleteSession(e, sess.id)}
                    title="Delete session"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Center / Right: Chat Conversation Thread */}
        <main className="chat-main">
          
          {/* Active Session Status Bar */}
          <div className="chat-status-bar">
            <div className="status-indicator">
              <span className="status-dot"></span>
              <span className="status-text">
                RAG Engine Online • Connected to DTE Rajasthan Knowledge Base
              </span>
            </div>
            {activeSessionId && (
              <span className="session-active-id">
                Session: {sessions.find((s) => s.id === activeSessionId)?.title || 'Current Chat'}
              </span>
            )}
          </div>

          {/* Messages Area */}
          <div className="chat-messages-container">
            
            {/* Loading existing messages */}
            {loadingMessages && (
              <div className="messages-loading">
                <div className="spinner"></div>
                <p>Retrieving conversation history...</p>
              </div>
            )}

            {/* Empty State / Suggested Questions */}
            {!loadingMessages && messages.length === 0 && (
              <div className="chat-empty-state">
                <div className="empty-state-avatar">🎓</div>
                <h2 className="empty-state-title">How can I assist you with admissions today?</h2>
                <p className="empty-state-desc">
                  I can answer questions regarding Rajasthan polytechnic admissions, 
                  seat reservation rules, cutoff eligibility, and certificate verifications.
                </p>

                <div className="suggested-pills-box">
                  <span className="pills-title">Suggested questions to get started:</span>
                  <div className="pills-grid">
                    {SUGGESTED_QUESTIONS.map((question, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="suggested-pill-btn"
                        onClick={() => handleSendMessage(question)}
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Messages Thread */}
            {!loadingMessages && messages.map((msg, index) => {
              const isStudent = msg.sender === 'STUDENT' || msg.sender === 'user';
              const sources = msg.metadata?.sources || [];

              return (
                <div
                  key={msg.id || index}
                  className={`message-row ${isStudent ? 'student-row' : 'assistant-row'}`}
                >
                  <div className={`message-bubble ${isStudent ? 'student-bubble' : 'assistant-bubble'}`}>
                    
                    {/* Message Header */}
                    <div className="message-header">
                      <span className="sender-name">
                        {isStudent ? (user?.name || 'You') : 'ShikshaSetu AI'}
                      </span>
                      <span className="message-time">
                        {msg.createdAt
                          ? new Date(msg.createdAt).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : ''}
                      </span>
                    </div>

                    {/* Message Body */}
                    <div className="message-content">
                      {msg.content.split('\n').map((paragraph, pIdx) => (
                        <p key={pIdx}>{paragraph}</p>
                      ))}
                    </div>

                    {/* Citations / Sources Panel */}
                    {!isStudent && sources.length > 0 && (
                      <div className="citations-container">
                        <button
                          type="button"
                          className="citation-toggle-btn"
                          onClick={() =>
                            setExpandedCitationId(
                              expandedCitationId === msg.id ? null : msg.id
                            )
                          }
                        >
                          <span>📚 {sources.length} Official Source{sources.length > 1 ? 's' : ''} Cited</span>
                          <span>{expandedCitationId === msg.id ? '▲' : '▼'}</span>
                        </button>

                        {expandedCitationId === msg.id && (
                          <div className="citations-list">
                            {sources.map((src, sIdx) => (
                              <div key={sIdx} className="citation-item">
                                <span className="citation-num">[{sIdx + 1}]</span>
                                <div className="citation-details">
                                  <span className="citation-title">
                                    {src.title || src.source || src.document || 'DTE Official Admission Document'}
                                  </span>
                                  {src.page && (
                                    <span className="citation-meta">Page {src.page}</span>
                                  )}
                                  {src.text && (
                                    <p className="citation-excerpt">"{src.text.substring(0, 160)}..."</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                </div>
              );
            })}

            {/* AI Typing / Generating Indicator */}
            {sending && (
              <div className="message-row assistant-row">
                <div className="message-bubble assistant-bubble">
                  <div className="message-header">
                    <span className="sender-name">ShikshaSetu AI</span>
                    <span className="message-time">Analyzing DTE Guidelines...</span>
                  </div>
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}

            {/* Error Notification with Retry */}
            {error && (
              <div className="chat-error-banner">
                <span>⚠️ {error}</span>
                <button
                  type="button"
                  className="btn-retry-chat"
                  onClick={() => handleSendMessage(inputQuery)}
                >
                  Retry
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Bar */}
          <div className="chat-input-wrapper">
            {!isAuthenticated ? (
              <div className="auth-prompt-bar">
                <span>Please sign in to ask questions and save your counseling inquiry history.</span>
                <Link to="/login" className="btn-primary" style={{ padding: '6px 14px', fontSize: '13px' }}>
                  Sign In
                </Link>
              </div>
            ) : (
              <form
                className="chat-input-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
              >
                <textarea
                  ref={textareaRef}
                  className="chat-textarea"
                  placeholder="Ask any question about Rajasthan polytechnic admissions, cutoffs, or documents..."
                  rows={2}
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={sending}
                />
                <button
                  type="submit"
                  className="chat-send-btn"
                  disabled={!inputQuery.trim() || sending}
                  title="Send question (Enter)"
                >
                  <span>Send</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                </button>
              </form>
            )}
            <div className="input-footer-note">
              Press <kbd>Enter</kbd> to send, <kbd>Shift + Enter</kbd> for a new line. Answers are synthesized from official DTE circulars.
            </div>
          </div>

        </main>
      </div>

    </div>
  );
}

export default ChatbotPage;
