'use client';

import React from 'react';
import { Gamepad2, FileText } from 'lucide-react';
import { GameData, ChatMessage } from '@/types';
import styles from './LeftSidebar.module.css';

interface LeftSidebarProps {
  games: GameData[];
  selectedGameId: string;
  onGameSelect: (gameId: string) => void;
  activeGame: GameData;
  retrievedChunks: ChatMessage['metadata'];
  onViewFile: (fileName: string) => void;
}

const LeftSidebar = React.memo(function LeftSidebar({
  games,
  selectedGameId,
  onGameSelect,
  activeGame,
  retrievedChunks,
  onViewFile,
}: LeftSidebarProps) {
  return (
    <aside className={styles.sidebarLeft}>
      <div className={styles.brand}>
        <h1>LoreKeeper</h1>
        <p>AI Strategy RAG Console</p>
      </div>

      <h3 className={styles.sectionTitle}>Select Strategy Guide</h3>
      <div className={styles.gameList}>
        {games.map(game => (
          <button
            key={game.id}
            className={`${styles.gameCard} ${selectedGameId === game.id ? styles.gameCardActive : ''}`}
            onClick={() => onGameSelect(game.id)}
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
                onClick={() => onViewFile(file)}
              >
                <FileText size={14} className={styles.fileIcon} />
                <span>{file}</span>
                {isRetrieved && (
                  <span style={{ marginLeft: 'auto', fontSize: '0.65rem', color: 'var(--accent-primary)', fontWeight: 'bold' }}>
                    CITED
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
});

export default LeftSidebar;
