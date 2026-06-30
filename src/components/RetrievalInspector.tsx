'use client';

import React from 'react';
import { Sliders, BookOpen, Layers } from 'lucide-react';
import { ChatMessage } from '@/types';
import styles from './RetrievalInspector.module.css';

interface RetrievalInspectorProps {
  minSimilarity: number;
  onMinSimilarityChange: (value: number) => void;
  retrievedChunks: ChatMessage['metadata'];
}

export default function RetrievalInspector({
  minSimilarity,
  onMinSimilarityChange,
  retrievedChunks,
}: RetrievalInspectorProps) {
  return (
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
            onChange={(e) => onMinSimilarityChange(parseFloat(e.target.value))}
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
            <p style={{ fontSize: '0.75rem', marginTop: '4px' }}>
              Send a message to run the vector retrieval query.
            </p>
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
  );
}
