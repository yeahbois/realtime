'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { LiveKitRoom, useLocalParticipant } from '@livekit/components-react';
import { VideoCanvas } from '@/components/VideoCanvas';
import { Controls } from '@/components/Controls';
import { useMediaPipe } from '@/hooks/useMediaPipe';

export default function Home() {
  const [token, setToken] = useState<string | null>(null);
  const [url, setUrl] = useState<string>(process.env.NEXT_PUBLIC_LIVEKIT_URL || 'ws://localhost:7880');
  const [isConnected, setIsConnected] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const roomRef = useRef<any>(null);

  const startCall = useCallback(async () => {
    const userId = `user_${Math.random().toString(36).substring(7)}`;
    const roomName = 'gemini-live-session';

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      setLocalStream(stream);

      const response = await fetch(`http://localhost:3000/api/token?userId=${userId}&roomName=${roomName}`);
      const data = await response.json();
      setToken(data.token);
      setIsConnected(true);
    } catch (error) {
      console.error('Failed to get token or stream:', error);
    }
  }, []);

  const sendSignal = useCallback((action: string) => {
    if (roomRef.current?.localParticipant) {
        const payload = new TextEncoder().encode(JSON.stringify({ action }));
        roomRef.current.localParticipant.publishData(payload, { reliable: true });
    }
  }, []);

  const stopCall = useCallback(() => {
    sendSignal('MUTE');
    setIsConnected(false);
    setToken(null);
    localStream?.getTracks().forEach(track => track.stop());
    setLocalStream(null);
  }, [localStream, sendSignal]);

  const blockCall = useCallback(() => {
    sendSignal('BLOCK');
    setIsConnected(false);
    setToken(null);
    localStream?.getTracks().forEach(track => track.stop());
    setLocalStream(null);
  }, [localStream, sendSignal]);

  return (
    <main className="flex min-h-screen flex-col items-center p-24 bg-slate-950 text-slate-100">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm flex flex-col gap-8">
        <h1 className="text-4xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
          GEMINI LIVE REPLICA
        </h1>

        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="flex flex-col gap-4">
             <VideoCanvas stream={localStream} />

             <div className="h-24 w-full bg-slate-900/50 rounded-lg border border-slate-800 flex items-center justify-center">
                <span className="text-xs text-slate-600 tracking-widest uppercase">Audio Waveform Visualizer</span>
             </div>
          </div>

          <div className="flex flex-col gap-4">
             <div className="flex-1 bg-slate-900/30 border border-slate-800 rounded-lg p-6">
                <h3 className="text-slate-400 mb-4 uppercase text-xs font-bold">AI Status</h3>
                <div className="flex items-center gap-3">
                    <div className={`h-3 w-3 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`} />
                    <span className="text-lg">{isConnected ? 'Gemini is Live' : 'Offline'}</span>
                </div>
             </div>

             <Controls
                onStart={startCall}
                onStop={stopCall}
                onBlock={blockCall}
                isConnected={isConnected}
             />
          </div>
        </div>

        {token && (
          <LiveKitRoom
            video={true}
            audio={true}
            token={token}
            serverUrl={url}
            onDisconnected={() => setIsConnected(false)}
            className="hidden"
          >
            <LiveKitInternal localStream={localStream} />
          </LiveKitRoom>
        )}
      </div>
    </main>
  );
}

function LiveKitInternal({ localStream }: { localStream: MediaStream | null }) {
    const { localParticipant } = useLocalParticipant();
    const videoRef = useRef<HTMLVideoElement>(null);
    const audioCtxRef = useRef<AudioContext | null>(null);

    useEffect(() => {
        if (videoRef.current && localStream) {
            videoRef.current.srcObject = localStream;
        }

        if (localStream && !audioCtxRef.current) {
            const audioContext = new AudioContext();
            audioCtxRef.current = audioContext;

            audioContext.audioWorklet.addModule('/worklets/rnnoise-processor.js').then(() => {
                const source = audioContext.createMediaStreamSource(localStream);
                const rnnoiseNode = new AudioWorkletNode(audioContext, 'rnnoise-processor');
                source.connect(rnnoiseNode);
                console.log('RNNoise Audio Worklet loaded and connected');
            });
        }

        return () => {
            audioCtxRef.current?.close();
            audioCtxRef.current = null;
        };
    }, [localStream]);

    useMediaPipe(videoRef, localParticipant);

    return <video ref={videoRef} className="hidden" autoPlay muted />;
}
