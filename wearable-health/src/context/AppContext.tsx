import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type SensorData = {
  pollen: { value: number; unit: string; status: string };
  aqi: { value: number; unit: string; status: string };
  uv: { value: number; unit: string; status: string };
  noise: { value: number; unit: string; status: string };
};

type Settings = {
  pollenSensitivity: number;
  aqiSensitivity: number;
  noiseSensitivity: number;
};

type AppContextType = {
  sensorData: SensorData;
  settings: Settings;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
  historyData: any[];
  theme: 'dark' | 'light';
  setTheme: React.Dispatch<React.SetStateAction<'dark' | 'light'>>;
};

const defaultSensorData: SensorData = {
  pollen: { value: 45, unit: 'grains/m³', status: 'Moderate' },
  aqi: { value: 42, unit: 'AQI', status: 'Good' },
  uv: { value: 4.2, unit: 'Index', status: 'Moderate' },
  noise: { value: 65, unit: 'dB', status: 'Good' }
};

const defaultSettings: Settings = {
  pollenSensitivity: 50, // 0 to 100
  aqiSensitivity: 50,
  noiseSensitivity: 50,
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [sensorData, setSensorData] = useState<SensorData>(defaultSensorData);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    // Generate some initial history
    const initialHistory = Array.from({ length: 12 }).map((_, i) => ({
      time: `${i * 2}:00`,
      pollen: Math.max(10, 50 + Math.sin(i) * 30),
      aqi: Math.max(20, 60 + Math.cos(i) * 20),
      noise: Math.max(40, 65 + Math.sin(i * 2) * 15),
    }));
    setHistoryData(initialHistory);

    const interval = setInterval(() => {
      setSensorData(prev => {
        const newData = {
          pollen: { ...prev.pollen, value: Math.max(0, prev.pollen.value + (Math.random() * 10 - 3)) },
          aqi: { ...prev.aqi, value: Math.max(0, prev.aqi.value + (Math.random() * 10 - 5)) },
          uv: { ...prev.uv, value: Math.max(0, prev.uv.value + (Math.random() * 2 - 1)) },
          noise: { ...prev.noise, value: Math.max(40, prev.noise.value + (Math.random() * 15 - 7.5)) },
        };
        
        // Thresholds adjusted by sensitivity
        const pollenThreshold = 80 - (settings.pollenSensitivity - 50) * 0.5;
        const aqiThreshold = 100 - (settings.aqiSensitivity - 50) * 0.5;
        const noiseThreshold = 85 - (settings.noiseSensitivity - 50) * 0.5;

        if (newData.pollen.value > pollenThreshold) newData.pollen.status = 'High';
        else if (newData.pollen.value > pollenThreshold / 2) newData.pollen.status = 'Moderate';
        else newData.pollen.status = 'Good';

        if (newData.aqi.value > aqiThreshold) newData.aqi.status = 'Unhealthy';
        else if (newData.aqi.value > aqiThreshold / 2) newData.aqi.status = 'Moderate';
        else newData.aqi.status = 'Good';

        if (newData.uv.value > 7) newData.uv.status = 'High';
        else if (newData.uv.value > 3) newData.uv.status = 'Moderate';
        else newData.uv.status = 'Low';

        if (newData.noise.value > noiseThreshold) newData.noise.status = 'Critical';
        else if (newData.noise.value > noiseThreshold - 15) newData.noise.status = 'High';
        else newData.noise.status = 'Good';

        return newData;
      });

      // Update history
      setHistoryData(prev => {
        const newHistory = [...prev.slice(1), {
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          pollen: sensorData.pollen.value,
          aqi: sensorData.aqi.value,
          noise: sensorData.noise.value,
        }];
        return newHistory;
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [settings]);

  return (
    <AppContext.Provider value={{ sensorData, settings, setSettings, historyData, theme, setTheme }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
};
