import { motion } from 'framer-motion';

interface NumericKeypadProps {
  onKey: (key: string) => void;
  onDelete: () => void;
  onEnter: () => void;
}

const NumericKeypad = ({ onKey, onDelete, onEnter }: NumericKeypadProps) => {
  const keys = ['7', '8', '9', '4', '5', '6', '1', '2', '3', 'del', '0', 'ent'];

  const provideFeedback = () => {
    // Try vibration first (works on Android and some browsers)
    if (navigator.vibrate) {
      navigator.vibrate(50);
    } else {
      // Fallback: play iPhone-like tab sound for iOS and other devices
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const bufferSize = audioContext.sampleRate * 0.1; // 100ms buffer
        const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        // Generate a click sound similar to iPhone keyboard tap
        for (let i = 0; i < bufferSize; i++) {
          // Create a short impulse with exponential decay
          const t = i / audioContext.sampleRate;
          data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 50) * 0.3; // White noise with decay
        }
        
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination);
        source.start();
      } catch (error) {
        // If audio fails, just continue without feedback
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
