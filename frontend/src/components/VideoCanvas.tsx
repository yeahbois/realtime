import React, { useRef, useEffect } from 'react';

interface VideoCanvasProps {
  stream: MediaStream | null;
}

export const VideoCanvas: React.FC<VideoCanvasProps> = ({ stream }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden border-2 border-slate-800">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover mirror"
      />
      <div className="absolute top-4 left-4 bg-black/50 px-2 py-1 rounded text-xs text-white">
        LOCAL CAMERA
      </div>
    </div>
  );
};
