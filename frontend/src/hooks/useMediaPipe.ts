import { useEffect, useRef, useState } from 'react';

import { LocalParticipant } from 'livekit-client';

export const useMediaPipe = (videoRef: React.RefObject<HTMLVideoElement>, participant?: LocalParticipant) => {
  const [userIsMovingMouth, setUserIsMovingMouth] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Establish WebSocket connection to vision-processor
    wsRef.current = new WebSocket('ws://localhost:8000/ws/video-features');

    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setUserIsMovingMouth(data.user_is_moving_mouth);

      // Forward the signal to the LiveKit server via Data Channel
      if (participant) {
        const payload = JSON.stringify({
          type: 'lip_tracking',
          isMoving: data.user_is_moving_mouth
        });
        participant.publishData(new TextEncoder().encode(payload), { reliable: true });
      }
    };

    return () => {
      wsRef.current?.close();
    };
  }, [participant]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (videoRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0);
          const imageData = canvas.toDataURL('image/jpeg', 0.5);
          wsRef.current.send(JSON.stringify({ image: imageData }));
        }
      }
    }, 100); // 10 FPS for vision processing

    return () => clearInterval(interval);
  }, [videoRef]);

  return { userIsMovingMouth };
};
