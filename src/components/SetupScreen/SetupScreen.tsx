import React, { useState } from 'react';
import { useGame } from '../../state/GameContext';
import { PLAYER_COLORS, PLAYER_COLOR_NAMES } from '../../state/initialState';
import styles from './SetupScreen.module.css';

export default function SetupScreen() {
  const { dispatch } = useGame();
  const [numPlayers, setNumPlayers] = useState(2);
  const [selectedColors, setSelectedColors] = useState<number[]>([0, 1]);
  const [aiPlayers, setAiPlayers] = useState<boolean[]>([false, false]);

  const handleNumChange = (n: number) => {
    setNumPlayers(n);
    setSelectedColors(Array.from({ length: n }, (_, i) => i));
    setAiPlayers(Array.from({ length: n }, () => false));
  };

  const handleColorChange = (playerIdx: number, colorIdx: number) => {
    const newColors = [...selectedColors];
    newColors[playerIdx] = colorIdx;
    setSelectedColors(newColors);
  };

  const handleStart = () => {
    const players = Array.from({ length: numPlayers }, (_, i) => ({
      name: `玩家${i + 1}`,
      color: PLAYER_COLORS[selectedColors[i]],
      isAI: aiPlayers[i],
    }));
    // 至少一个真人
    if (players.every(p => p.isAI)) return;
    dispatch({ type: 'START_GAME', players });
  };

  const handleLoad = (slot: 1 | 2) => {
    const data = localStorage.getItem(`monopoly_save_${slot}`);
    if (data) {
      try {
        const saved = JSON.parse(data);
        dispatch({ type: 'LOAD_GAME', state: saved });
      } catch { alert('存档损坏，无法读取'); }
    }
  };

  const save1Time = localStorage.getItem('monopoly_save_1_time');
  const save2Time = localStorage.getItem('monopoly_save_2_time');
  const hasSave1 = !!localStorage.getItem('monopoly_save_1');
  const hasSave2 = !!localStorage.getItem('monopoly_save_2');

  const usedColors = new Set(selectedColors);

  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <h1 className={styles.title}>⚽ 足球大富翁</h1>
        <p className={styles.subtitle}>Football Monopoly</p>

        <div className={styles.section}>
          <label className={styles.label}>玩家人数</label>
          <div className={styles.numRow}>
            {[2, 3, 4].map(n => (
              <button
                key={n}
                className={`${styles.numBtn} ${numPlayers === n ? styles.active : ''}`}
                onClick={() => handleNumChange(n)}
              >
                {n} 人
              </button>
            ))}
          </div>
        </div>

        <div className={styles.section}>
          <label className={styles.label}>选择颜色</label>
          {Array.from({ length: numPlayers }, (_, i) => (
            <div key={i} className={styles.colorRow}>
              <span className={styles.playerLabel}>玩家{i + 1}{aiPlayers[i] ? ' 🤖' : ''}</span>
              <div className={styles.colorOptions}>
                {PLAYER_COLORS.map((color, ci) => (
                  <button
                    key={ci}
                    className={`${styles.colorBtn} ${selectedColors[i] === ci ? styles.selected : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => handleColorChange(i, ci)}
                    disabled={usedColors.has(ci) && selectedColors[i] !== ci}
                    title={PLAYER_COLOR_NAMES[ci]}
                  />
                ))}
                <button
                  className={`${styles.numBtn} ${aiPlayers[i] ? styles.active : ''}`}
                  style={{ marginLeft: 8, fontSize: 11 }}
                  onClick={() => {
                    const newAI = [...aiPlayers];
                    newAI[i] = !newAI[i];
                    setAiPlayers(newAI);
                  }}
                >
                  🤖 机器人
                </button>
              </div>
            </div>
          ))}
        </div>

        <button className={styles.startBtn} onClick={handleStart}>
          开始游戏 🎮
        </button>

        {(hasSave1 || hasSave2) && (
          <div className={styles.section}>
            <label className={styles.label}>📂 读取存档</label>
            <div className={styles.numRow}>
              {hasSave1 && (
                <button className={styles.numBtn} onClick={() => handleLoad(1)}>
                  存档1 ({save1Time || ''})
                </button>
              )}
              {hasSave2 && (
                <button className={styles.numBtn} onClick={() => handleLoad(2)}>
                  存档2 ({save2Time || ''})
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
