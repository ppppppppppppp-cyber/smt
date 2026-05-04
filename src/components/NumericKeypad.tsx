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
      // Fallback: play a short beep sound for iOS and other devices
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime); // 800Hz beep
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime); // Low volume
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
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
