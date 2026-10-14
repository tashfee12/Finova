
import { useState } from "react";
import api from "../services/api";
import "./AIChat.css";

export default function AIChat() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hi! 👋 I'm your Personal Finance AI Assistant. I can help you understand your spending, track budgets.",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const suggestions = [
    ,
  ];

  async function handleSubmit(e) {
    e.preventDefault();

    const questionText = question.trim();

    if (!questionText || loading) return;

    setMessages((prev) => [
      ...prev,
      { role: "user", text: questionText },
    ]);

    setQuestion("");
    setLoading(true);
    setError("");

    try {
      const response = await api.post("/api/ai/chat", {
        question: questionText,
      });

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: response.data.answer || "I couldn't generate an answer.",
        },
      ]);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not connect to the AI assistant. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="ai-page">
      <div className="ai-container">
        <header className="ai-header">
          <div className="ai-logo">✦</div>

          <div>
            <h1>Finova AI Assistant</h1>

            <div className="ai-status">
              <span className="ai-status-dot" />
              Ready to help
            </div>
          </div>
        </header>

        <section className="ai-chat-card">
          <div className="ai-chat-topbar">
            <h2>💬 Finance conversation</h2>
          </div>

          <div className="ai-messages" aria-live="polite">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`ai-message ${message.role}`}
              >
                {message.role === "assistant" && (
                  <div className="ai-avatar">✦</div>
                )}

                <div className="ai-bubble">{message.text}</div>
              </div>
            ))}

            {loading && (
              <div className="ai-message assistant">
                <div className="ai-avatar">✦</div>
                <div className="ai-bubble ai-loading">
                  Analyzing your question...
                </div>
              </div>
            )}
          </div>

          <div className="ai-suggestions">

            <div className="ai-suggestion-list">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className="ai-suggestion"
                  onClick={() => setQuestion(suggestion)}
                  disabled={loading}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          <div className="ai-input-area">
            <form className="ai-form" onSubmit={handleSubmit}>
              <input
                className="ai-input"
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask anything about your finances..."
                aria-label="Your finance question"
                disabled={loading}
              />

              <button
                className="ai-send-button"
                type="submit"
                disabled={loading || !question.trim()}
              >
                Send <span>➤</span>
              </button>
            </form>

            {error && (
              <p className="ai-error" role="alert">
                {error}
              </p>
            )}

            <p className="ai-disclaimer">
              
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
