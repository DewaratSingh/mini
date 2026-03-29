'use client';
import { useState, useEffect, useRef } from 'react';
import './globals.css';

export default function Home() {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [status, setStatus] = useState('Press the microphone to speak');

  const recognitionRef = useRef(null);
  const synthRef = useRef(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onstart = () => {
          setIsListening(true);
          setStatus('Listening...');
        };

        recognitionRef.current.onresult = (event) => {
          const text = event.results[0][0].transcript;
          setTranscript(text);
          setStatus('Processing computation...');
          handleQuery(text);
        };

        recognitionRef.current.onerror = (event) => {
          console.error('Speech recognition error', event.error);
          setIsListening(false);
          setStatus('Error: ' + event.error);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      } else {
        setStatus('Speech recognition not supported in this browser.');
      }

      synthRef.current = window.speechSynthesis;
    }
  }, []);

  const handleQuery = async (text) => {
    try {
      const res = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      const data = await res.json();

      if (data.answer) {
        setResponse(data.answer);
        setStatus('Response ready...');
        speak(data.answer);
      }
    } catch (err) {
      console.error(err);
      setStatus('Error calling backend API');
    }
  };

  const speak = (text) => {
    if (!synthRef.current) return;

    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    const voices = synthRef.current.getVoices();
    const jarvisVoice = voices.find(v => v.name.includes('Google UK English Male') || v.name.includes('Daniel') || v.name.includes('Male')) || voices[0];
    if (jarvisVoice) utterance.voice = jarvisVoice;

    utterance.pitch = 0.9;
    utterance.rate = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      setStatus('Awaiting next command...');
    };
    utterance.onerror = () => setIsSpeaking(false);

    synthRef.current.speak(utterance);
  };

  const toggleListen = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      if (isSpeaking) {
        synthRef.current?.cancel();
        setIsSpeaking(false);
      }
      setTranscript('');
      setResponse('');
      recognitionRef.current?.start();
    }
  };

  return (
    <div className="container">
      <h1 className="title">Jarvis Systems</h1>

      <button
        className={`mic-button ${isListening ? 'listening' : ''}`}
        onClick={toggleListen}
        aria-label="Microphone"
      >
        <svg className="mic-icon" viewBox="0 0 24 24">
          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5-3c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
        </svg>
      </button>

      <div className={`waveform ${isSpeaking ? 'active' : ''}`}>
        <div className="bar"></div>
        <div className="bar"></div>
        <div className="bar"></div>
        <div className="bar"></div>
        <div className="bar"></div>
        <div className="bar"></div>
        <div className="bar"></div>
      </div>

      <div className="status-text">{status}</div>

      {transcript && <div className="query-text">"{transcript}"</div>}

      <div className={`response-box ${response ? 'visible' : ''}`}>
        {response}
      </div>
    </div>
  );
}
