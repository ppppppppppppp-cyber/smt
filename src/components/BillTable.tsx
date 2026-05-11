import { useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2 } from 'lucide-react';
import { supabase, formatPid } from '@/lib/supabase';

export interface BillItem {
  id: string;
  pid: string;
  particulars: string;
  rate: string;
  qty: string;
  amount: number;
}

interface BillTableProps {
  items: BillItem[];
  setItems: React.Dispatch<React.SetStateAction<BillItem[]>>;
  activeField: { row: number; field: 'pid' | 'particulars' | 'rate' | 'qty' } | null;
  setActiveField: (f: { row: number; field: 'pid' | 'particulars' | 'rate' | 'qty' } | null) => void;
  showChecklist?: boolean;
  checkedItems?: Record<string, boolean>;
  onCheckToggle?: (id: string) => void;
  keypadEnabled?: boolean; // when false behave like normal inputs
}

const BillTable = ({
  items, setItems, activeField, setActiveField,
  showChecklist, checkedItems, onCheckToggle,
  keypadEnabled
}: BillTableProps) => {
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  const prevRowRef = useRef<number | null>(null);

  const isMobileRaw = typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad|iPod/.test(navigator.userAgent);
  const mobileWithKeypad = isMobileRaw && keypadEnabled !== false;

  const setRef = useCallback((key: string) => (el: HTMLInputElement | null) => {
    if (el) inputRefs.current.set(key, el);
    else inputRefs.current.delete(key);
  }, []);

 useEffect(() => {
  if (activeField) {
    const key = `${activeField.row}-${activeField.field}`;
    const el = inputRefs.current.get(key);

    if (el) {
      el.focus();

      // Scroll only if row changed
      if (prevRowRef.current !== activeField.row) {
        setTimeout(() => {
          el.scrollIntoView({
            behavior: "smooth",
            block: "center"
          });
        }, 120);
      }

      prevRowRef.current = activeField.row;
    }
  }
}, [activeField]);

  const updateItem = (index: number, field: keyof BillItem, value: string) => {
    setItems(prev => {
      const updated = [...prev];
      const item = { ...updated[index] };

      if (field === 'pid') {
        item.pid = value;
      } else if (field === 'particulars') {
        item.particulars = value;
      } else if (field === 'rate') {
        item.rate = value;
      } else if (field === 'qty') {
        item.qty = value;
      }

      item.amount = (parseFloat(item.rate) || 0) * (parseFloat(item.qty) || 0);
      updated[index] = item;
      return updated;
    });
  };

  const updateItemPid = async (index: number, value: string) => {
    const formatted = /^\d+$/.test(value) ? formatPid(value) : value;
    const { data } = await supabase.from('inventory').select('name').eq('pid', formatted).maybeSingle();

    setItems(prev => {
      const updated = [...prev];
      const item = { ...updated[index], pid: formatted };

      if (formatted === '0' || formatted.toUpperCase() === '0') {
        item.particulars = 'ITEM';
      } else if (data?.name) {
        item.particulars = data.name;
      }

      item.amount = (parseFloat(item.rate) || 0) * (parseFloat(item.qty) || 0);
      updated[index] = item;
      return updated;
    });
  };

  const addRow = () => {
    const newItem: BillItem = {
      id: crypto.randomUUID(),
      pid: '0',
      particulars: 'ITEM',
      rate: '',
      qty: '',
      amount: 0,
    };
    setItems(prev => [...prev, newItem]);
    setTimeout(() => setActiveField({ row: items.length, field: 'pid' }), 50);
  };

  const deleteRow = (index: number) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent, row: number, field: 'pid' | 'particulars' | 'rate' | 'qty') => {
    const fields: Array<'pid' | 'particulars' | 'rate' | 'qty'> = ['pid', 'particulars', 'rate', 'qty'];
    const currentIndex = fields.indexOf(field);

    if (e.key === 'Enter') {
      e.preventDefault();
      if (field === 'pid') {
        (document.activeElement as HTMLElement)?.blur();
        setTimeout(() => {
          setActiveField({ row, field: 'particulars' });
          setTimeout(() => inputRefs.current.get(`${row}-particulars`)?.focus(), 0);
        }, 150);
      } else if (field === 'particulars') {
        (document.activeElement as HTMLElement)?.blur();
        setTimeout(() => {
          setActiveField({ row, field: 'rate' });
          setTimeout(() => inputRefs.current.get(`${row}-rate`)?.focus(), 0);
        }, 150);
      } else if (field === 'rate') {
        (document.activeElement as HTMLElement)?.blur();
        setTimeout(() => {
          setActiveField({ row, field: 'qty' });
          setTimeout(() => inputRefs.current.get(`${row}-qty`)?.focus(), 0);
        }, 150);
      } else if (field === 'qty') {
        (document.activeElement as HTMLElement)?.blur();
        if (row === items.length - 1) {
          addRow();
        } else {
          setTimeout(() => {
            setActiveField({ row: row + 1, field: 'pid' });
            setTimeout(() => inputRefs.current.get(`${row + 1}-pid`)?.focus(), 0);
          }, 150);
        }
      }
    } else if (e.key === 'ArrowRight' && currentIndex < fields.length - 1) {
      e.preventDefault();
      const nextField = fields[currentIndex + 1];
      setActiveField({ row, field: nextField });
      setTimeout(() => inputRefs.current.get(`${row}-${nextField}`)?.focus(), 0);
    } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
      e.preventDefault();
      const prevField = fields[currentIndex - 1];
      setActiveField({ row, field: prevField });
      setTimeout(() => inputRefs.current.get(`${row}-${prevField}`)?.focus(), 0);
    } else if (e.key === 'ArrowDown' && row < items.length - 1) {
      e.preventDefault();
      setActiveField({ row: row + 1, field });
      setTimeout(() => inputRefs.current.get(`${row + 1}-${field}`)?.focus(), 0);
    } else if (e.key === 'ArrowUp' && row > 0) {
      e.preventDefault();
      setActiveField({ row: row - 1, field });
      setTimeout(() => inputRefs.current.get(`${row - 1}-${field}`)?.focus(), 0);
    }
  };

  const handlePidBlur = (index: number, value: string) => {
    updateItemPid(index, value);
  };

  return (
    <div className="overflow-x-auto">
      <table className="bill-table w-full">
        <thead>
          <tr className="border-b border-border">
            {showChecklist && <th className="w-8">✔</th>}
            <th className="w-10">S.No</th>
            <th className="w-20">PID</th>
            <th>Particulars</th>
            <th className="w-20">Rate</th>
            <th className="w-16">Qty</th>
            <th className="w-20">Amount</th>
            <th className="w-10"></th>
          </tr>
        </thead>
        <tbody>
          <AnimatePresence>
            {items.map((item, i) => (
              <motion.tr
                key={item.id}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className={`border-b border-border/40 ${
                  activeField?.row === i ? 'bg-primary/5' : ''
                }`}
              >
                {showChecklist && (
                  <td>
                    <input
                      type="checkbox"
                      checked={checkedItems?.[item.id] || false}
                      onChange={() => onCheckToggle?.(item.id)}
                      className="w-4 h-4 accent-primary"
                    />
                  </td>
                )}
                <td className="text-muted-foreground text-center">{i + 1}</td>
                <td>
                  <input
                    ref={setRef(`${i}-pid`)}
                    value={item.pid}
                    onChange={e => updateItem(i, 'pid', e.target.value)}
                    onBlur={e => handlePidBlur(i, e.target.value)}
                    onFocus={() => setActiveField({ row: i, field: 'pid' })}
                    onClick={() => setActiveField({ row: i, field: 'pid' })}
                    onKeyDown={e => handleKeyDown(e, i, 'pid')}
                    className="w-full text-center"
                    inputMode={mobileWithKeypad ? 'none' : 'numeric'}
                    readOnly={mobileWithKeypad}
                  />
                </td>
                <td>
                  <input
                    ref={setRef(`${i}-particulars`)}
                    value={item.particulars}
                    onChange={e => updateItem(i, 'particulars', e.target.value)}
                    onFocus={() => setActiveField({ row: i, field: 'particulars' })}
                    onClick={() => setActiveField({ row: i, field: 'particulars' })}
                    onKeyDown={e => handleKeyDown(e, i, 'particulars')}
                    className="w-full"
                    inputMode={mobileWithKeypad ? 'none' : undefined}
                    readOnly={mobileWithKeypad}
                  />
                </td>
                <td>
                  <input
                    ref={setRef(`${i}-rate`)}
                    value={item.rate}
                    onChange={e => updateItem(i, 'rate', e.target.value)}
                    onFocus={() => setActiveField({ row: i, field: 'rate' })}
                    onClick={() => setActiveField({ row: i, field: 'rate' })}
                    onKeyDown={e => handleKeyDown(e, i, 'rate')}
                    className="w-full text-right font-medium"
                    inputMode={mobileWithKeypad ? 'none' : 'decimal'}
                    readOnly={mobileWithKeypad}
                  />
                </td>
                <td>
                  <input
                    ref={setRef(`${i}-qty`)}
                    value={item.qty}
                    onChange={e => updateItem(i, 'qty', e.target.value)}
                    onFocus={() => setActiveField({ row: i, field: 'qty' })}
                    onClick={() => setActiveField({ row: i, field: 'qty' })}
                    onKeyDown={e => handleKeyDown(e, i, 'qty')}
                    className="w-full text-right"
                    inputMode={mobileWithKeypad ? 'none' : 'numeric'}
                    readOnly={mobileWithKeypad}
                  />
                </td>
                <td className="text-right font-semibold text-foreground">
                  {item.amount > 0 ? `₹${item.amount.toFixed(0)}` : ''}
                </td>
                <td>
                  <button
                    onClick={() => deleteRow(i)}
                    className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </motion.tr>
            ))}
          </AnimatePresence>
        </tbody>
      </table>
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={addRow}
        className="mt-2 flex items-center gap-1 text-sm text-primary font-medium px-3 py-2 rounded-lg hover:bg-primary/10 transition-colors"
      >
        <Plus size={16} /> Add Row
      </motion.button>
    </div>
  );
};

export default BillTable;
