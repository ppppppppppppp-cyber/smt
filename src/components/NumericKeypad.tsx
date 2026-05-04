import { motion } from 'framer-motion';

interface NumericKeypadProps {
  onKey: (key: string) => void;
  onDelete: () => void;
  onEnter: () => void;
}

const NumericKeypad = ({ onKey, onDelete, onEnter }: NumericKeypadProps) => {
  const keys = ['7', '8', '9', '4', '5', '6', '1', '2', '3', 'del', '0', 'ent'];

  const provideFeedback = () => {
  if (navigator.vibrate) {
    navigator.vibrate(30);
  } else {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const gainNode = audioContext.createGain();
      gainNode.connect(audioContext.destination);

      // Layer 1: short high-frequency tone (the "tap" part)
      const osc = audioContext.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, audioContext.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.03);
      osc.connect(gainNode);

      // Layer 2: noise burst (the "click" texture)
      const bufferSize = audioContext.sampleRate * 0.04; // 40ms
      const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.2));
      }
      const noise = audioContext.createBufferSource();
      noise.buffer = buffer;

      const noiseGain = audioContext.createGain();
      noiseGain.gain.setValueAtTime(0.05, audioContext.currentTime);
      noise.connect(noiseGain);
      noiseGain.connect(audioContext.destination);

      // Envelope: quick attack, fast decay
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.005);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.05);

      osc.start(audioContext.currentTime);
      osc.stop(audioContext.currentTime + 0.05);
      noise.start(audioContext.currentTime);
      noise.stop(audioContext.currentTime + 0.02);

    } catch (error) {
      console.log('Audio feedback not available');
    }
  }
};

  return (
    <div className="grid grid-cols-3 gap-2 p-3 max-w-xs mx-auto">
      {keys.map((key) => (
        <motion.button
          key={key}
          whileTap={{ scale: 0.92 }}
          whileHover={{ scale: 1.02 }}
          className={
            key === 'ent'
              ? 'keypad-btn-gold font-bold'
              : key === 'del'
              ? 'keypad-btn text-destructive font-bold'
              : 'keypad-btn'
          }
          onClick={() => {
            provideFeedback();
            if (key === 'del') onDelete();
            else if (key === 'ent') onEnter();
            else onKey(key);
          }}
        >
          {key === 'del' ? '⌫' : key === 'ent' ? '↵' : key}
        </motion.button>
      ))}
    </div>
  );
};

export default NumericKeypad;
