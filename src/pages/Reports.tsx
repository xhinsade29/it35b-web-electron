import { useDashboardSync } from '../hooks/useDashboardSync';
import { ThresholdCharts } from '../components/ThresholdCharts';
import styles from '../components/Sidebar.module.css';

export function ReportsPage() {
  const [{ data }] = useDashboardSync(30000);

  const sectionConditions = data?.section_conditions || {
    upstream: {},
    midstream: {},
    downstream: {},
  };

  return (
    <div className={styles.mainContent} style={{ padding: '2rem' }}>
      <h1>Reports</h1>
      <p>Particles analysis and data reports</p>
      
      {/* Sensor Threshold Analytics */}
      <div style={{ marginBottom: '2rem' }}>
        <ThresholdCharts sectionConditions={sectionConditions} />
      </div>

      <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#f5f5f5', borderRadius: '8px' }}>
        <h2>Generated Reports</h2>
        <p>This page will contain water quality reports and analysis.</p>
      </div>
    </div>
  );
}
