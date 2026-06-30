'use client';

import React, { useRef, useEffect } from 'react';
import { Trash2, Compass, Send } from 'lucide-react';
import { marked } from 'marked';
import { GameData, ChatMessage } from '@/types';
import styles from './ChatConsole.module.css';

interface ChatConsoleProps {
  activeGame: GameData;
  chatHistory: ChatMessage[];
  query: string;
  isLoading: boolean;
  onQueryChange: (query: string) => void;
  onClearChat: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export default function ChatConsole({
  activeGame,
  chatHistory,
  query,
  isLoading,
  onQueryChange,
  onClearChat,
  onSubmit,
}: ChatConsoleProps) {
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to the bottom on new message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isLoading]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e);
    }
  };

  return (
    <main className={styles.chatContainer}>
      <header className={styles.chatHeader}>
        <div className={styles.chatHeaderInfo}>
          <h2>{activeGame.name} Assistant</h2>
          <div className={styles.chatHeaderStatus}>
            <span className={styles.statusIndicator}></span>
            <span>Scope: {activeGame.files.join(', ')}</span>
          </div>
        </div>
        <button className={styles.clearButton} onClick={onClearChat}>
          <Trash2 size={14} />
          <span>Clear Chat</span>
        </button>
      </header>

      {/* Messages view */}
      <div className={styles.chatLog}>
        {chatHistory.length === 0 ? (
          <div className={styles.welcomeState}>
            <Compass size={48} className={styles.welcomeIcon} />
            <h3>Game AI RAG Explorer</h3>
            <p>
              Select a game guidebook from the left panel and start asking strategy questions.
              Our RAG pipeline will scan the local markdown documents, search for matches using
              Gemini vector embeddings, and stream an accurate response citing its source files.
            </p>
          </div>
        ) : (
          chatHistory.map((message) => (
            <div
              key={message.id}
              className={`${styles.messageRow} ${message.role === 'user' ? styles.messageRowUser : styles.messageRowAssistant}`}
            >
              <div
                className={`${styles.messageBubble} ${message.role === 'user' ? styles.messageBubbleUser : styles.messageBubbleAssistant}`}
              >
                <div
                  className={styles.messageContent}
                  dangerouslySetInnerHTML={{ __html: marked.parse(message.content || '...') }}
                />
              </div>
            </div>
          ))
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input panel */}
      <div className={styles.chatInputArea}>
        <form onSubmit={onSubmit} className={styles.inputWrapper}>
          <textarea
            className={styles.textInput}
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask anything about ${activeGame.name}...`}
            rows={1}
            disabled={isLoading}
          />
          <button
            type="submit"
            className={styles.sendButton}
            disabled={isLoading || !query.trim()}
          >
            <Send size={18} />
          </button>
        </form>
        <p className={styles.inputHint}>
          Press Enter to submit, Shift + Enter for a new line.
        </p>
      </div>
    </main>
  );
}
