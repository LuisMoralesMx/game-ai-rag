'use client';

import React, { useState } from 'react';
import { GAMES } from '@/constants/games';
import { ChatMessage } from '@/types';
import LeftSidebar from '@/components/LeftSidebar';
import ChatConsole from '@/components/ChatConsole';
import RetrievalInspector from '@/components/RetrievalInspector';
import FileViewerModal from '@/components/FileViewerModal';
import styles from './page.module.css';

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

  return (
    <div className={styles.container}>
      <LeftSidebar
        games={GAMES}
        selectedGameId={selectedGameId}
        onGameSelect={handleGameSelect}
        activeGame={activeGame}
        retrievedChunks={retrievedChunks}
        onViewFile={handleViewFile}
      />

      <ChatConsole
        activeGame={activeGame}
        chatHistory={chatHistory}
        query={query}
        isLoading={isLoading}
        onQueryChange={setQuery}
        onClearChat={handleClearChat}
        onSubmit={handleSubmit}
      />

      <RetrievalInspector
        minSimilarity={minSimilarity}
        onMinSimilarityChange={setMinSimilarity}
        retrievedChunks={retrievedChunks}
      />

      {viewingFile && (
        <FileViewerModal
          viewingFile={viewingFile}
          isFileLoading={isFileLoading}
          fileContent={fileContent}
          onClose={() => setViewingFile(null)}
        />
      )}
    </div>
  );
}
