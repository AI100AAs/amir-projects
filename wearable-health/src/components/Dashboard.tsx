import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Leaf, Wind, Sun, Volume2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

export default function Dashboard() {
  const { sensorData, historyData } = useAppContext();

  const getStatusClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'good': case 'low': return 'status-good';
      case 'moderate': return 'status-moderate';
      case 'high': case 'unhealthy': return 'status-high';
      case 'critical': return 'status-critical';
      default: return 'status-good';
    }
  };

  return (
    <div 
      style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
    >
      <div className="dashboard-grid">
        <div className="sensor-card">
          <div className="sensor-header">
            <Leaf size={16} color="var(--accent-pollen)" />
            <span>Pollen</span>
          </div>
          <div className="sensor-value">{Math.round(sensorData.pollen.value)}</div>
          <div style={{color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '12px'}}>{sensorData.pollen.unit}</div>
          <div className={`sensor-status ${getStatusClass(sensorData.pollen.status)}`}>
            {sensorData.pollen.status}
          </div>
        </div>

        <div className="sensor-card">
          <div className="sensor-header">
            <Wind size={16} color="var(--accent-aqi)" />
            <span>Air Quality</span>
          </div>
          <div className="sensor-value">{Math.round(sensorData.aqi.value)}</div>
          <div style={{color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '12px'}}>{sensorData.aqi.unit}</div>
          <div className={`sensor-status ${getStatusClass(sensorData.aqi.status)}`}>
            {sensorData.aqi.status}
          </div>
        </div>

        <div className="sensor-card">
          <div className="sensor-header">
            <Sun size={16} color="var(--accent-uv)" />
            <span>UV Index</span>
          </div>
          <div className="sensor-value">{sensorData.uv.value.toFixed(1)}</div>
          <div style={{color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '12px'}}>{sensorData.uv.unit}</div>
          <div className={`sensor-status ${getStatusClass(sensorData.uv.status)}`}>
            {sensorData.uv.status}
          </div>
        </div>

        <div className="sensor-card">
          <div className="sensor-header">
            <Volume2 size={16} color="var(--accent-noise)" />
            <span>Noise</span>
          </div>
          <div className="sensor-value">{Math.round(sensorData.noise.value)}</div>
          <div style={{color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '12px'}}>{sensorData.noise.unit}</div>
          <div className={`sensor-status ${getStatusClass(sensorData.noise.status)}`}>
            {sensorData.noise.status}
          </div>
        </div>
      </div>

      <div className="chart-container">
        <h3 className="chart-title">Air Quality Trend</h3>
        <div style={{ width: '100%', height: 200 }}>
          <ResponsiveContainer>
            <AreaChart data={historyData}>
              <defs>
                <linearGradient id="colorAqi" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent-aqi)" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="var(--accent-aqi)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="time" stroke="#555" fontSize={12} tickMargin={10} />
              <YAxis hide domain={['dataMin - 10', 'dataMax + 10']} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '12px' }}
                itemStyle={{ color: '#fff' }}
              />
              <Area type="monotone" dataKey="aqi" stroke="var(--accent-aqi)" fillOpacity={1} fill="url(#colorAqi)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
