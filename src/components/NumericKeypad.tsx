import { motion } from 'framer-motion';

interface NumericKeypadProps {
  onKey: (key: string) => void;
  onDelete: () => void;
  onEnter: () => void;
}

const NumericKeypad = ({ onKey, onDelete, onEnter }: NumericKeypadProps) => {
  const keys = ['7', '8', '9', '4', '5', '6', '1', '2', '3', 'del', '0', 'ent'];

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
