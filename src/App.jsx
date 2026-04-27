import React, { useState } from 'react';
import { Languages, Globe } from 'lucide-react';
import Recorder from './components/Recorder';

function App() {
  const [targetLang, setTargetLang] = useState('ta');
  
  const languages = [
    { code: 'de', name: 'German', native: 'Deutsch' },
    { code: 'en', name: 'English', native: 'English' },
    { code: 'es', name: 'Spanish', native: 'Español' },
    { code: 'fr', name: 'French', native: 'Français' },
    { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
    { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
    { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
    { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
    { code: 'te', name: 'Telugu', native: 'తెలుగు' },
  ].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="app-container">
      <div className="top-bar">
        <div id="recorder-actions"></div>
        
        <div className="action-circle">
          <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#000000' }}>
            {languages.find(l => l.code === targetLang)?.native.charAt(0)}
          </span>
          <select 
            value={targetLang} 
            onChange={(e) => setTargetLang(e.target.value)}
          >
            {languages.map(lang => (
              <option key={lang.code} value={lang.code}>{lang.native} ({lang.name})</option>
            ))}
          </select>
        </div>
      </div>

      <Recorder targetLang={targetLang} />
    </div>
  );
}

export default App;
