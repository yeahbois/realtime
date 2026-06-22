import React from 'react';
import { Mic, MicOff, Square, Ban, Play } from 'lucide-react';

interface ControlsProps {
  onStart: () => void;
  onStop: () => void;
  onBlock: () => void;
  isConnected: boolean;
}

export const Controls: React.FC<ControlsProps> = ({ onStart, onStop, onBlock, isConnected }) => {
  return (
    <div className="flex gap-4 p-4 bg-slate-900/50 rounded-xl border border-slate-800">
      {!isConnected ? (
        <button
          onClick={onStart}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full font-medium transition-colors"
        >
          <Play size={20} /> START CALL
        </button>
      ) : (
        <>
          <button
            onClick={onStop}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded-full font-medium transition-colors"
          >
            <Square size={20} /> STOP / MUTE
          </button>
          <button
            onClick={onBlock}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-full font-medium transition-colors"
          >
            <Ban size={20} /> BLOCK / TERMINATE
          </button>
        </>
      )}
    </div>
  );
};
