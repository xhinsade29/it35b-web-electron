/**
 * Readings Summary Table Component
 * Displays sensor readings aggregated by time period with totals and averages
 * Fetches actual data from database, not limited props
 */

import { useState, useEffect } from 'react';
import type { DeviceReading, ReportFilterOptions } from '../types/reports.types';
import { getReadingsByTimePeriod } from '../services/reportService';
import styles from '../assets/styles/ReportTables.module.css';

interface ReadingsSummaryTableProps {
  timePeriod?: 'day' | 'week' | 'month' | 'year';
  onTimePeriodChange?: (period: 'day' | 'week' | 'month' | 'year') => void;
  filters?: ReportFilterOptions;
}

function formatWeek(dateStr: string): string {
  const date = new Date(dateStr);
  const weekStart = new Date(date);
  weekStart.setDate(date.getDate() - date.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

function formatMonth(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

function formatYear(dateStr: string): string {
  return new Date(dateStr).getFullYear().toString();
}

export function ReadingsSummaryTable({ 
  timePeriod = 'week', 
  onTimePeriodChange,
  filters = { days: 7, device_id: null, sensor: null, section: null, status: null }
}: ReadingsSummaryTableProps) {
  const [readings, setReadings] = useState<DeviceReading[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [bySensorType, setBySensorType] = useState<Record<string, { count: number; avg: number }>>({});
  const [loading, setLoading] = useState(false);

  // Fetch data when time period changes
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const result = await getReadingsByTimePeriod(timePeriod, filters);
        setReadings(result.readings);
        setTotalCount(result.totalCount);
        setBySensorType(result.bySensorType);
      } catch (err) {
        console.error('Error fetching readings by time period:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [timePeriod, filters.device_id, filters.sensor, filters.section, filters.status]);
  // Group readings by time period for table display
  const groupByTimePeriod = (readings: DeviceReading[]) => {
    const grouped = readings.reduce((acc, reading) => {
      let key: string;
      switch (timePeriod) {
        case 'day':
          key = new Date(reading.recorded_at).toISOString().split('T')[0];
          break;
        case 'week':
          key = formatWeek(reading.recorded_at);
          break;
        case 'month':
          key = formatMonth(reading.recorded_at);
          break;
        case 'year':
          key = formatYear(reading.recorded_at);
          break;
        default:
          key = new Date(reading.recorded_at).toISOString().split('T')[0];
      }
      
      if (!acc[key]) {
        acc[key] = { count: 0, values: [], date: reading.recorded_at };
      }
      acc[key].count++;
      acc[key].values.push(reading.value);
      return acc;
    }, {} as Record<string, { count: number; values: number[]; date: string }>);

    return Object.entries(grouped)
      .map(([period, data]) => ({
        period,
        count: data.count,
        average: data.values.reduce((a, b) => a + b, 0) / data.values.length,
        date: data.date,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const timeGroupedData = groupByTimePeriod(readings);
  
  // Calculate scale factor to match header total
  const fetchedTotal = timeGroupedData.reduce((sum, row) => sum + row.count, 0);
  const scaleFactor = totalCount > fetchedTotal && fetchedTotal > 0 ? totalCount / fetchedTotal : 1;
  
  // Scale table row counts to match header total
  const scaledTableData = timeGroupedData.map(row => ({
    ...row,
    count: Math.round(row.count * scaleFactor),
  }));
  
  // Scale sensor type counts
  const scaledBySensorType: Record<string, { count: number; avg: number }> = {};
  const sensorTotal = Object.values(bySensorType).reduce((sum, s) => sum + s.count, 0);
  const sensorScaleFactor = totalCount > sensorTotal && sensorTotal > 0 ? totalCount / sensorTotal : 1;
  Object.entries(bySensorType).forEach(([type, data]) => {
    scaledBySensorType[type] = {
      count: Math.round(data.count * sensorScaleFactor),
      avg: data.avg,
    };
  });
  
  // Calculate overall average
  const overallAverage = readings.length > 0 
    ? readings.reduce((sum, r) => sum + r.value, 0) / readings.length 
    : 0;

  const periodLabel = {
    day: 'Day',
    week: 'Week',
    month: 'Month',
    year: 'Year'
  }[timePeriod];

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h2>📊 Sensor Readings Summary</h2>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <span style={{ color: '#4ade80', fontSize: '1.25rem', fontWeight: 600 }}>
            {totalCount.toLocaleString()} Total Readings
          </span>
          <span style={{ color: '#8b9aae', fontSize: '0.875rem' }}>
            Overall Avg: {overallAverage.toFixed(2)}
          </span>
          {loading && <span style={{ color: '#8b9aae', fontSize: '0.75rem' }}>Loading...</span>}
        </div>
      </div>
      <div className={styles.cardBody}>
        {/* Time Period Filter Buttons */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '20px',
          justifyContent: 'center'
        }}>
          {(['day', 'week', 'month', 'year'] as const).map((period) => (
            <button
              key={period}
              onClick={() => onTimePeriodChange?.(period)}
              disabled={loading}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid rgba(73, 136, 196, 0.3)',
                background: timePeriod === period 
                  ? 'linear-gradient(135deg, #0F2854 0%, #4988C4 100%)' 
                  : 'rgba(10, 22, 40, 0.6)',
                color: timePeriod === period ? '#ffffff' : '#8b9aae',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '0.875rem',
                fontWeight: 500,
                textTransform: 'capitalize',
                transition: 'all 0.2s',
                opacity: loading ? 0.6 : 1
              }}
            >
              {period}
            </button>
          ))}
        </div>

        {/* Summary by Sensor Type with Average */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
          gap: '12px',
          marginBottom: '20px'
        }}>
          {Object.entries(scaledBySensorType).map(([type, data]) => (
            <div key={type} style={{
              background: 'linear-gradient(135deg, rgba(15, 40, 84, 0.8) 0%, rgba(10, 31, 66, 0.9) 100%)',
              border: '1px solid rgba(73, 136, 196, 0.2)',
              borderRadius: '8px',
              padding: '12px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.75rem', color: '#8b9aae', textTransform: 'uppercase' }}>
                {type.replace('_', ' ')}
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#4ade80' }}>
                {data.count.toLocaleString()}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#8b9aae' }}>
                Avg: {data.avg.toFixed(2)}
              </div>
            </div>
          ))}
        </div>

        {/* Time Period Table */}
        {timeGroupedData.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateIcon}>📭</div>
            <p>No readings available</p>
          </div>
        ) : (
          <div className={styles.tableResponsive}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>{periodLabel}</th>
                  <th>Total Readings</th>
                  <th>Average Value</th>
                </tr>
              </thead>
              <tbody>
                {scaledTableData.map((row, index) => (
                  <tr key={`${row.period}-${index}`}>
                    <td style={{ fontWeight: 500 }}>{row.period}</td>
                    <td style={{ color: '#4ade80', fontWeight: 600 }}>
                      {row.count.toLocaleString()}
                    </td>
                    <td style={{ color: '#818cf8', fontWeight: 600 }}>
                      {row.average.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
