import styles from '../assets/styles/Skeleton.module.css';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  circle?: boolean;
}

export function Skeleton({
  width = '100%',
  height = '20px',
  borderRadius = '4px',
  className = '',
  circle = false,
}: SkeletonProps) {
  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    borderRadius: circle ? '50%' : typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius,
  };

  return <div className={`${styles.skeleton} ${className}`} style={style} />;
}

// Skeleton for text lines
export function SkeletonText({ lines = 1, width = '100%', height = 16, gap = 8 }: {
  lines?: number;
  width?: string | number;
  height?: number;
  gap?: number;
}) {
  return (
    <div className={styles.skeletonText} style={{ gap: `${gap}px` }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          width={typeof width === 'string' ? width : `${width}px`}
          height={height}
          borderRadius={4}
        />
      ))}
    </div>
  );
}

// Skeleton for cards
export function SkeletonCard({ height = 120 }: { height?: number }) {
  return (
    <div className={styles.skeletonCard}>
      <div className={styles.cardHeader}>
        <Skeleton width={40} height={40} circle />
        <div className={styles.cardTitle}>
          <Skeleton width="60%" height={16} />
          <Skeleton width="40%" height={12} />
        </div>
      </div>
      <Skeleton width="100%" height={height} borderRadius={8} />
    </div>
  );
}

// Skeleton for stats
export function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div className={styles.skeletonStats}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={styles.statCard}>
          <Skeleton width="60%" height={32} />
          <Skeleton width="80%" height={14} />
        </div>
      ))}
    </div>
  );
}

// Skeleton for table rows
export function SkeletonTable({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className={styles.skeletonTable}>
      {/* Header */}
      <div className={styles.tableHeader}>
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} width="100%" height={20} />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className={styles.tableRow}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} width="100%" height={16} />
          ))}
        </div>
      ))}
    </div>
  );
}

// Page loading state with multiple skeleton sections
export function SkeletonPage() {
  return (
    <div className={styles.skeletonPage}>
      {/* Page header */}
      <div className={styles.pageHeader}>
        <Skeleton width="300px" height={32} />
        <Skeleton width="200px" height={16} />
      </div>

      {/* Stats */}
      <SkeletonStats count={4} />

      {/* Content sections */}
      <div className={styles.contentGrid}>
        <SkeletonCard height={200} />
        <SkeletonCard height={200} />
      </div>

      {/* Table */}
      <SkeletonTable rows={5} columns={4} />
    </div>
  );
}

export default Skeleton;
