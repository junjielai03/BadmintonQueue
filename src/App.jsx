import { useEffect } from 'react';
import { BoardContext } from './BoardContext.js';
import { useBoard } from './hooks/useBoard.js';
import AuthView from './components/AuthView.jsx';
import Board from './components/Board.jsx';

export default function App({ sb }) {
  const board = useBoard(sb);
  const { booted, dialog, sel, setSel, closeDialog } = board;

  // Escape closes the open dialog first, then the header menu, then clears the selection.
  // A drag cancels itself earlier (capture phase).
  useEffect(() => {
    const onKey = e => {
      if (e.key !== 'Escape') return;
      if (dialog) { closeDialog(); return; }
      const menu = document.querySelector('#app .top-actions[open]');
      if (menu) { menu.open = false; menu.querySelector('summary').focus(); return; }
      if (sel) setSel(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [dialog, sel, closeDialog, setSel]);

  if (!booted) return null;
  return (
    <BoardContext.Provider value={board}>
      {board.S?.me ? <Board /> : <AuthView sb={sb} />}
    </BoardContext.Provider>
  );
}
