import React from 'react';
import { useAppContext } from '../context/AppContext';

export default function Settings() {
  const { settings, setSettings } = useAppContext();

  return (
    <div className="settings-section">
      <div className="setting-item">
        <div className="setting-header">
          <span style={{ fontWeight: 600 }}>Pollen Sensitivity</span>
          <span style={{ color: 'var(--accent-pollen)' }}>{settings.pollenSensitivity}%</span>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Higher sensitivity means earlier alerts for lower pollen counts.
        </p>
        <input 
          type="range" 
          min="0" max="100" 
          value={settings.pollenSensitivity}
          onChange={(e) => setSettings(s => ({...s, pollenSensitivity: parseInt(e.target.value)}))}
          style={{ accentColor: 'var(--accent-pollen)' }}
        />
      </div>

      <div className="setting-item">
        <div className="setting-header">
          <span style={{ fontWeight: 600 }}>Air Quality Sensitivity</span>
          <span style={{ color: 'var(--accent-aqi)' }}>{settings.aqiSensitivity}%</span>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Adjust if you have asthma or are sensitive to poor air quality.
        </p>
        <input 
          type="range" 
          min="0" max="100" 
          value={settings.aqiSensitivity}
          onChange={(e) => setSettings(s => ({...s, aqiSensitivity: parseInt(e.target.value)}))}
          style={{ accentColor: 'var(--accent-aqi)' }}
        />
      </div>

      <div className="setting-item">
        <div className="setting-header">
          <span style={{ fontWeight: 600 }}>Noise Sensitivity</span>
          <span style={{ color: 'var(--accent-noise)' }}>{settings.noiseSensitivity}%</span>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Adjust if you are neurodivergent or sensitive to loud sounds.
        </p>
        <input 
          type="range" 
          min="0" max="100" 
          value={settings.noiseSensitivity}
          onChange={(e) => setSettings(s => ({...s, noiseSensitivity: parseInt(e.target.value)}))}
          style={{ accentColor: 'var(--accent-noise)' }}
        />
      </div>
    </div>
  );
}
