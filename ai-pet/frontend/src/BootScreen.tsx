import { useState, useEffect } from 'react';

const BootScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [lines, setLines] = useState<string[]>([]);
  const [step, setStep] = useState(0);

  const script = [
    "AURA v0.1.0-ALPHA",
    "INITIALIZING COGNITIVE ENGINE...",
    "WARNING: SIMULATION DETECTED.",
    "--------------------------------",
    "ETHICAL NOTICE:",
    "AURA IS AN ARTIFICIAL INTELLIGENCE.",
    "ALL EXPRESSIONS OF CARE OR EMOTION",
    "ARE SIMULATED BY THE MODEL.",
    "THIS IS NOT A HUMAN RELATIONSHIP.",
    "--------------------------------",
    "USER DATA STORAGE: ACTIVE (LOCAL)",
    "MEMORY PERSISTENCE: ENABLED",
    "DO YOU UNDERSTAND?",
    "[PRESS ANY BUTTON TO BEGIN]"
  ];

  useEffect(() => {
    if (step < script.length) {
      const timer = setTimeout(() => {
        setLines(prev => [...prev, script[step]]);
        setStep(step + 1);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [step]);

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: '#000',
      color: '#0f0',
      padding: '20px',
      fontSize: '8px',
      boxSizing: 'border-box',
      zIndex: 100,
      display: 'flex',
      flexDirection: 'column',
      gap: '5px',
      cursor: 'pointer'
    }} onClick={onComplete}>
      {lines.map((line, i) => <div key={i}>{line}</div>)}
    </div>
  );
};

export default BootScreen;
