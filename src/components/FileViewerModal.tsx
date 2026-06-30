'use client';

import React from 'react';
import { X } from 'lucide-react';
import { marked } from 'marked';
import styles from './FileViewerModal.module.css';

interface FileViewerModalProps {
  viewingFile: string;
  isFileLoading: boolean;
  fileContent: string;
  onClose: () => void;
}

const FileViewerModal = React.memo(function FileViewerModal({
  viewingFile,
  isFileLoading,
  fileContent,
  onClose,
}: FileViewerModalProps) {
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <header className={styles.modalHeader}>
          <h3>Manual: {viewingFile}</h3>
          <button className={styles.modalClose} onClick={onClose}>
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
  );
});

export default FileViewerModal;
