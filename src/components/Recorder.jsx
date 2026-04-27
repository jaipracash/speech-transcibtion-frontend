import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Trash2, Loader2 } from 'lucide-react';
import { createPortal } from 'react-dom';

const Recorder = ({ targetLang }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [history, setHistory] = useState([]); // [{original, translated}]
  const [partialTranscription, setPartialTranscription] = useState('');
  const [partialTranslation, setPartialTranslation] = useState('');
  const [status, setStatus] = useState('idle');
  const [audioLevel, setAudioLevel] = useState(0);
  
  const socketRef = useRef(null);
  const audioContextRef = useRef(null);
  const processorRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, partialTranscription, partialTranslation]);

  useEffect(() => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ target_lang: targetLang }));
    }
  }, [targetLang]);

  const updateVolume = () => {
    if (analyserRef.current) {
      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(dataArray);
      let values = 0;
      for (let i = 0; i < dataArray.length; i++) {
        values += dataArray[i];
      }
      const average = values / dataArray.length;
      setAudioLevel(average);
      animationFrameRef.current = requestAnimationFrame(updateVolume);
    }
  };

  const clearData = () => {
    setHistory([]);
    setPartialTranscription('');
    setPartialTranslation('');
  };

  const startRecording = async () => {
    try {
      setStatus('connecting');
      const protocol = 'wss:';
      const host = 'jaipracash-speech-transcription-backend.hf.space';
      
      socketRef.current = new WebSocket(`${protocol}//${host}/ws`);

      socketRef.current.onopen = () => {
        socketRef.current.send(JSON.stringify({ target_lang: targetLang }));
        setStatus('recording');
        setIsRecording(true);
      };

      socketRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.error) {
          alert(data.error);
          stopRecording();
          return;
        }

        if (data.is_final) {
          setHistory(prev => [...prev, { original: data.original, translated: data.translated }]);
          setPartialTranscription('');
          setPartialTranslation('');
        } else {
          setPartialTranscription(data.original);
          setPartialTranslation(data.translated || '');
        }
      };

      socketRef.current.onclose = () => {
        setIsRecording(false);
        setStatus('idle');
      };

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      const source = audioContextRef.current.createMediaStreamSource(stream);
      
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);
      updateVolume();

      processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);
      source.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);

      processorRef.current.onaudioprocess = (e) => {
        if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
          const inputData = e.inputBuffer.getChannelData(0);
          const buffer = new Int16Array(inputData.length);
          for (let i = 0; i < inputData.length; i++) {
            buffer[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
          }
          socketRef.current.send(buffer.buffer);
        }
      };

      window.mediaStream = stream;

    } catch (err) {
      console.error('Failed to start recording', err);
      setStatus('error');
      alert(err.message || 'Error accessing microphone');
      setStatus('idle');
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    setStatus('idle');
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (processorRef.current) processorRef.current.disconnect();
    if (analyserRef.current) analyserRef.current.disconnect();
    if (audioContextRef.current) audioContextRef.current.close();
    if (window.mediaStream) window.mediaStream.getTracks().forEach(track => track.stop());
    if (socketRef.current) socketRef.current.close();
    setAudioLevel(0);
  };

  // Portal to move the clear button to the top bar
  const actionsPortal = document.getElementById('recorder-actions');

  return (
    <>
      {actionsPortal && createPortal(
        <button className="action-circle" onClick={clearData} title="Clear Session">
          <Trash2 size={20} />
        </button>,
        actionsPortal
      )}

      <main className="main-content">
        <div className="large-translation" ref={scrollRef}>
          {history.length === 0 && !partialTranscription && !isRecording && (
            <div style={{ color: 'var(--text-muted)', fontSize: '1.25rem', fontWeight: 500, marginTop: '20vh' }}>
              Tap the microphone below to start translating
            </div>
          )}
          {history.map((msg, i) => (
            <div key={i} className="message-pair">
              <div className="original-small">{msg.original}</div>
              <div className="translated-main">{msg.translated}</div>
            </div>
          ))}
          {partialTranscription && (
            <div className="message-pair" style={{ opacity: 0.6 }}>
              <div className="original-small">{partialTranscription}</div>
              <div className="translated-main">{partialTranslation || '...'}</div>
            </div>
          )}
        </div>
      </main>

      {isRecording && (
        <div className="wave-container">
          {[...Array(5)].map((_, i) => {
            // Center (index 2) is 1.0, sides are 0.6 and 0.3
            const scale = 1 - Math.abs(i - 2) * 0.3;
            const height = 4 + (audioLevel * scale * 0.8);
            return (
              <div 
                key={i} 
                className="wave-bar active" 
                style={{ height: `${Math.min(24, height)}px` }}
              />
            );
          })}
        </div>
      )}

      <div className="bottom-controls">
        {!isRecording ? (
          <button 
            className="btn-circle" 
            onClick={startRecording}
            disabled={status === 'connecting'}
          >
            {status === 'connecting' ? <Loader2 className="animate-spin" /> : <Mic size={32} />}
          </button>
        ) : (
          <button className="btn-circle recording" onClick={stopRecording}>
            <Square size={28} fill="white" />
          </button>
        )}
      </div>
    </>
  );
};

export default Recorder;
