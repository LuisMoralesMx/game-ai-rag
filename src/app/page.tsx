'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Flame, 
  HelpCircle, 
  Trash2, 
  Send, 
  BookOpen, 
  Sliders, 
  Layers, 
  FileText, 
  X, 
  Compass, 
  ChevronRight,
  Gamepad2
} from 'lucide-react';
import { marked } from 'marked';
import styles from './page.module.css';

interface GameData {
  id: string;
  name: string;
  desc: string;
  files: string[];
}

const GAMES: GameData[] = [
  {
    id: 'elden_ring',
    name: 'Elden Ring',
    desc: 'The shattered Lands Between',
    files: ['elden_ring.md'],
  },
  {
    id: 'hollow_knight',
    name: 'Hollow Knight',
    desc: 'The ruined depths of Hallownest',
    files: ['hollow_knight.md'],
  },
  {
    id: 'cyberpunk_2077',
    name: 'Cyberpunk 2077',
    desc: 'Megacorps & gangs of Night City',
    files: ['cyberpunk_2077.md'],
  },
  {
    id: 'expedition_33',
    name: 'Expedition 33',
    desc: 'Sandfall turn-based French RPG',
    files: ['expedition_33.md'],
  }
];

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  metadata?: {
    fileName: string;
    heading: string;
    text: string;
    similarity: number;
  }[];
}

export default function Home() {
  const [selectedGameId, setSelectedGameId] = useState<string>('elden_ring');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [query, setQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [minSimilarity, setMinSimilarity] = useState<number>(0.4);
  const [retrievedChunks, setRetrievedChunks] = useState<ChatMessage['metadata']>([]);
  
  // File viewer modal state
  const [viewingFile, setViewingFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [isFileLoading, setIsFileLoading] = useState<boolean>(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to the bottom on new message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isLoading]);

  const activeGame = GAMES.find(g => g.id === selectedGameId) || GAMES[0];

  const handleGameSelect = (gameId: string) => {
    setSelectedGameId(gameId);
    setChatHistory([]);
    setRetrievedChunks([]);
  };

  const handleViewFile = async (fileName: string) => {
    setViewingFile(fileName);
    setIsFileLoading(true);
    setFileContent('');

    try {
      const res = await fetch(`/api/files?file=${encodeURIComponent(fileName)}`);
      const data = await res.json();
      if (res.ok) {
        setFileContent(data.content);
      } else {
        setFileContent(`Error loading file: ${data.error}`);
      }
    } catch (e) {
      setFileContent(`Error loading file: Could not connect to API.`);
    } finally {
      setIsFileLoading(false);
    }
  };

  const handleClearChat = () => {
    setChatHistory([]);
    setRetrievedChunks([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Math.random().toString(36).substring(7),
      role: 'user',
      content: query.trim(),
    };

    setChatHistory(prev => [...prev, userMessage]);
    setQuery('');
    setIsLoading(true);

    const botMessageId = Math.random().toString(36).substring(7);
    const botMessage: ChatMessage = {
      id: botMessageId,
      role: 'assistant',
      content: '',
    };
    
    setChatHistory(prev => [...prev, botMessage]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: userMessage.content,
          gameId: selectedGameId,
          minSimilarity,
          history: chatHistory
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned status code: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('ReadableStream not supported by response');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let buffer = '';
      let isFirstChunk = true;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        
        if (value) {
          const chunkStr = decoder.decode(value, { stream: !done });
          buffer += chunkStr;

          // Extract metadata if it's the first line in the stream
          if (isFirstChunk && buffer.includes('\n\n')) {
            const boundaryIndex = buffer.indexOf('\n\n');
            const firstLine = buffer.substring(0, boundaryIndex);
            
            if (firstLine.startsWith('METADATA:')) {
              const metadataJson = firstLine.substring('METADATA:'.length);
              try {
                const parsedMetadata = JSON.parse(metadataJson);
                setRetrievedChunks(parsedMetadata);
                // Attach metadata to the bot message
                setChatHistory(prev => prev.map(msg => 
                  msg.id === botMessageId ? { ...msg, metadata: parsedMetadata } : msg
                ));
              } catch (e) {
                console.error("Error parsing context metadata:", e);
              }
              // Strip metadata header from actual output text buffer
              buffer = buffer.substring(boundaryIndex + 2);
            }
            isFirstChunk = false;
          }

          // Update message text stream
          if (!isFirstChunk) {
            setChatHistory(prev => prev.map(msg => 
              msg.id === botMessageId ? { ...msg, content: buffer } : msg
            ));
          }
        }
      }

    } catch (error: any) {
      console.error("Error generating answer:", error);
      setChatHistory(prev => prev.map(msg => 
        msg.id === botMessageId 
          ? { ...msg, content: `⚠️ Failed to fetch response. Make sure GEMINI_API_KEY is configured in your \`.env.local\` file.\n\nError details: ${error.message}` } 
          : msg
      ));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className={styles.container}>
      {/* LEFT SIDEBAR: Games & File Explorer */}
      <aside className={styles.sidebarLeft}>
        <div className={styles.brand}>
          <h1>LoreKeeper</h1>
          <p>AI Strategy RAG Console</p>
        </div>

        <h3 className={styles.sectionTitle}>Select Strategy Guide</h3>
        <div className={styles.gameList}>
          {GAMES.map(game => (
            <button
              key={game.id}
              className={`${styles.gameCard} ${selectedGameId === game.id ? styles.gameCardActive : ''}`}
              onClick={() => handleGameSelect(game.id)}
            >
              <div className={styles.gameIcon}>
                <Gamepad2 size={16} />
              </div>
              <div className={styles.gameInfo}>
                <span className={styles.gameName}>{game.name}</span>
                <span className={styles.gameDesc}>{game.desc}</span>
              </div>
            </button>
          ))}
        </div>

        <div className={styles.fileListContainer}>
          <h3 className={styles.sectionTitle}>Reference Documents</h3>
          <div className={styles.fileList}>
            {activeGame.files.map(file => {
              // Check if this file was retrieved in the current/last chat response
              const isRetrieved = retrievedChunks?.some(chunk => chunk.fileName === file);
              return (
                <button
                  key={file}
                  className={`${styles.fileItem} ${isRetrieved ? styles.fileHighlight : ''}`}
                  onClick={() => handleViewFile(file)}
                >
                  <FileText size={14} className={styles.fileIcon} />
                  <span>{file}</span>
                  {isRetrieved && <span style={{ marginLeft: 'auto', fontSize: '0.65rem', color: 'var(--accent-primary)', fontWeight: 'bold' }}>CITED</span>}
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      {/* MIDDLE COLUMN: Chat Console */}
      <main className={styles.chatContainer}>
        <header className={styles.chatHeader}>
          <div className={styles.chatHeaderInfo}>
            <h2>{activeGame.name} Assistant</h2>
            <div className={styles.chatHeaderStatus}>
              <span className={styles.statusIndicator}></span>
              <span>Scope: {activeGame.files.join(', ')}</span>
            </div>
          </div>
          <button className={styles.clearButton} onClick={handleClearChat}>
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
          <form onSubmit={handleSubmit} className={styles.inputWrapper}>
            <textarea
              className={styles.textInput}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
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

      {/* RIGHT SIDEBAR: Retrieval Inspector */}
      <aside className={styles.sidebarRight}>
        <div className={styles.inspectorHeader}>
          <h2>
            <Sliders size={18} />
            <span>Retrieval Inspector</span>
          </h2>
          <p>Real-time vector search inspection</p>
        </div>

        <div className={styles.inspectorControls}>
          <div className={styles.controlGroup}>
            <div className={styles.controlLabel}>
              <span>Similarity Threshold</span>
              <span className={styles.sliderValue}>&ge; {minSimilarity.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.20"
              max="0.80"
              step="0.05"
              value={minSimilarity}
              onChange={(e) => setMinSimilarity(parseFloat(e.target.value))}
              className={styles.slider}
            />
          </div>
        </div>

        <div className={styles.chunkList}>
          <div className={styles.controlLabel}>
            <span>Retrieved Chunks ({retrievedChunks?.length || 0})</span>
          </div>

          {!retrievedChunks || retrievedChunks.length === 0 ? (
            <div className={styles.noRetrievals}>
              <Layers size={32} className={styles.noRetrievalsIcon} />
              <p>No chunks retrieved yet.</p>
              <p style={{ fontSize: '0.75rem', marginTop: '4px' }}>Send a message to run the vector retrieval query.</p>
            </div>
          ) : (
            retrievedChunks.map((chunk, index) => (
              <div key={index} className={styles.chunkCard}>
                <div className={styles.chunkMeta}>
                  <span className={styles.chunkTitle}>{chunk.heading}</span>
                  <span className={styles.chunkScore}>{chunk.similarity.toFixed(4)}</span>
                </div>
                <div className={styles.chunkFile}>
                  <BookOpen size={10} />
                  <span>{chunk.fileName}</span>
                </div>
                <div className={styles.chunkText}>
                  {chunk.text}
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* MODAL FOR RAW FILE VIEWER */}
      {viewingFile && (
        <div className={styles.modalOverlay} onClick={() => setViewingFile(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <header className={styles.modalHeader}>
              <h3>Manual: {viewingFile}</h3>
              <button className={styles.modalClose} onClick={() => setViewingFile(null)}>
                <X size={18} />
              </button>
            </header>
            <div className={styles.modalBody}>
              {isFileLoading ? (
                <p>Loading document contents...</p>
              ) : (
                <div dangerouslySetInnerHTML={{ __html: marked.parse(fileContent) }} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
