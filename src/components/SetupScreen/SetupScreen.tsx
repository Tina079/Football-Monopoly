import React, { useState } from 'react';
import { useGame } from '../../state/GameContext';
import { PLAYER_COLORS, PLAYER_COLOR_NAMES } from '../../state/initialState';
import RulesScreen from '../RulesScreen/RulesScreen';
import styles from './SetupScreen.module.css';

export default function SetupScreen() {
  const { dispatch } = useGame();
  const [showRules, setShowRules] = useState(false);
  const [numPlayers, setNumPlayers] = useState(2);
  const [selectedColors, setSelectedColors] = useState<number[]>([0, 1]);
  const [aiPlayers, setAiPlayers] = useState<boolean[]>([false, false]);
  const [names, setNames] = useState<string[]>(['', '']);

  const handleNumChange = (n: number) => {
    setNumPlayers(n);
    setSelectedColors(Array.from({ length: n }, (_, i) => i));
    setAiPlayers(Array.from({ length: n }, () => false));
    setNames(Array.from({ length: n }, () => ''));
  };

  const handleColorChange = (playerIdx: number, colorIdx: number) => {
    const newColors = [...selectedColors];
    newColors[playerIdx] = colorIdx;
    setSelectedColors(newColors);
  };

  const handleStart = () => {
    const players = Array.from({ length: numPlayers }, (_, i) => ({
      name: names[i]?.trim() || `玩家${i + 1}`,
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
              <input
                type="text"
                className={styles.nameInput}
                placeholder={`玩家${i + 1}`}
                value={names[i] || ''}
                onChange={(e) => { const n = [...names]; n[i] = e.target.value; setNames(n); }}
                maxLength={10}
              />
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

        <button className={styles.rulesBtn} onClick={() => setShowRules(true)}>
          📖 游戏规则
        </button>
        <a
          className={styles.ghLink}
          href="https://github.com/Tina079/Football-Monopoly"
          target="_blank"
          rel="noopener noreferrer"
        >
          <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
          GitHub
        </a>

      </div>
      {showRules && <RulesScreen onClose={() => setShowRules(false)} />}
    </div>
  );
}
