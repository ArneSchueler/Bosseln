import { useState, useRef } from 'react';
import { Mic, Square, Check, Play, UserPlus } from 'lucide-react';
import { useStore } from '../store/useStore';
import { supabase } from '../lib/supabase';

export default function PlayerRegistration() {
  const [name, setName] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  const addPlayer = useStore((state) => state.addPlayer);
  const setMyPlayerId = useStore((state) => state.setMyPlayerId);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Could not access microphone.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      // Stop all tracks to release microphone
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const playAudio = () => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play();
    }
  };

  const handleJoin = async () => {
    if (!name.trim()) {
      alert('Please enter your name.');
      return;
    }
    
    const newId = crypto.randomUUID();
    let finalAudioUrl = audioUrl || undefined;

    if (audioBlob) {
      const fileName = `${newId}.webm`;
      const { data, error } = await supabase.storage.from('audio').upload(fileName, audioBlob);
      if (!error && data) {
        const { data: publicUrlData } = supabase.storage.from('audio').getPublicUrl(fileName);
        finalAudioUrl = publicUrlData.publicUrl;
      } else {
        console.error("Audio upload failed:", error);
      }
    }

    await addPlayer({
      id: newId,
      name: name.trim(),
      audioBlob: audioBlob,
      audioUrl: finalAudioUrl,
    });
    setMyPlayerId(newId);
    
    // Reset form
    setName('');
    setAudioBlob(null);
    setAudioUrl(null);
    alert('Joined successfully!');
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <UserPlus className="w-5 h-5 text-green-600" />
        Join Game
      </h2>
      
      <div className="space-y-4">
        <div>
          <label htmlFor="playerName" className="block text-sm font-medium text-slate-700 mb-1">
            Your Name
          </label>
          <input
            id="playerName"
            type="text"
            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors text-lg"
            placeholder="e.g. Arne"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div>
          <span className="block text-sm font-medium text-slate-700 mb-2">
            Record a cheer (optional)
          </span>
          
          <div className="flex items-center gap-3">
            {!isRecording && !audioBlob && (
              <button
                onClick={startRecording}
                className="flex-1 flex items-center justify-center gap-2 bg-red-50 text-red-600 px-4 py-3 rounded-lg font-medium border border-red-200 hover:bg-red-100 transition-colors"
              >
                <Mic className="w-5 h-5" />
                Record
              </button>
            )}
            
            {isRecording && (
              <button
                onClick={stopRecording}
                className="flex-1 flex items-center justify-center gap-2 bg-red-500 text-white px-4 py-3 rounded-lg font-medium animate-pulse hover:bg-red-600 transition-colors"
              >
                <Square className="w-5 h-5" />
                Stop
              </button>
            )}

            {audioBlob && !isRecording && (
              <div className="flex-1 flex gap-2">
                <button
                  onClick={playAudio}
                  className="flex-1 flex items-center justify-center gap-2 bg-slate-100 text-slate-700 px-4 py-3 rounded-lg font-medium hover:bg-slate-200 transition-colors"
                >
                  <Play className="w-5 h-5" />
                  Listen
                </button>
                <button
                  onClick={() => {
                    setAudioBlob(null);
                    setAudioUrl(null);
                  }}
                  className="flex items-center justify-center px-4 py-3 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200 hover:text-red-500 transition-colors"
                >
                  Retry
                </button>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={handleJoin}
          className="w-full flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-4 rounded-lg font-bold text-lg hover:bg-green-700 transition-colors mt-6 shadow-sm"
        >
          <Check className="w-6 h-6" />
          Join Now
        </button>
      </div>
    </div>
  );
}