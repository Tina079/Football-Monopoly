import React from 'react';
import { useGame } from '../../state/GameContext';
import styles from './SavePanel.module.css';

export default function SavePanel() {
  const { state, dispatch } = useGame();
  if (state.phase !== 'playing') return null;

  const handleSave = (slot: 1 | 2) => {
    const data = JSON.stringify(state);
    localStorage.setItem(`monopoly_save_${slot}`, data);
    const now = new Date().toLocaleString('zh-CN');
    localStorage.setItem(`monopoly_save_${slot}_time`, now);
    alert(`存档 ${slot} 已保存 (${now})`);
  };

  const save1Time = localStorage.getItem('monopoly_save_1_time');
  const save2Time = localStorage.getItem('monopoly_save_2_time');

  return (
    <div className={styles.panel}>
      <button className={styles.saveBtn} onClick={() => handleSave(1)} title={save1Time || ''}>
        💾 存档1
      </button>
      <button className={styles.saveBtn} onClick={() => handleSave(2)} title={save2Time || ''}>
        💾 存档2
      </button>
      <button className={styles.saveBtn} onClick={() => dispatch({ type: 'RESET_GAME' })}>
        🏠 主菜单
      </button>
    </div>
  );
}
