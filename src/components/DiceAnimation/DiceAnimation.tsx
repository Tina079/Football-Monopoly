import React, { useEffect, useState } from 'react';
import { useGame } from '../../state/GameContext';
import styles from './DiceAnimation.module.css';

const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

export default function DiceAnimation() {
  const { state, dispatch } = useGame();
  const { diceAnimating, diceValue } = state;
  const [frame, setFrame] = useState(0);

  // Phase 1: spinning for 2s
  const isSpinning = diceAnimating && diceValue === null;
  // Phase 2: showing result for 1s
  const isShowingResult = diceAnimating && diceValue !== null;

  useEffect(() => {
    if (!isSpinning) return;

    const interval = setInterval(() => {
      setFrame(f => (f + 1) % 6);
    }, 120);

    const timeout = setTimeout(() => {
      clearInterval(interval);
      dispatch({ type: 'ROLL_DICE' });
    }, 1000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [isSpinning, dispatch]);

  // Result stays until user clicks "前进" — no auto-dismiss

  if (!diceAnimating) return null;

  return (
    <div className={styles.overlay}>
      <div className={`${styles.diceBox} ${isSpinning ? styles.spinning : styles.result}`}>
        <span className={styles.diceFace}>
          {isSpinning ? DICE_FACES[frame] : (diceValue ? DICE_FACES[diceValue - 1] : '🎲')}
        </span>
        {isShowingResult && diceValue && (
          <span className={styles.diceNum}>{diceValue}</span>
        )}
      </div>
    </div>
  );
}
