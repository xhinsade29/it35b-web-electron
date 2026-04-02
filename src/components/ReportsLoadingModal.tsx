/**
 * Reports Loading Modal Component
 * Shows loading progress with actual fetched data
 */

import styles from '../assets/styles/Reports.module.css';

interface ReportsLoadingModalProps {
  message?: string;
  progress?: number;
}

export function ReportsLoadingModal({
  message = 'Fetching Reports Data...',
  progress = 0,
}: ReportsLoadingModalProps) {
  return (
    <div className={styles.loadingOverlay}>
      <div className={styles.loadingModal}>
        <div className={styles.loadingSpinner}>
          <div className={styles.spinner}></div>
          <p className={styles.loadingText}>{message}</p>
        </div>

        <div className={styles.loadingProgress}>
          <div className={styles.progressBar}>
            <div 
              className={styles.progressFill} 
              style={{ width: `${progress}%`, animation: 'none' }}
            ></div>
          </div>
          <p className={styles.loadingStatus}>{progress}% Complete</p>
        </div>
      </div>
    </div>
  );
}
