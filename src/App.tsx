import React, { useState } from 'react';
import { useGame } from './state/GameContext';
import SetupScreen from './components/SetupScreen/SetupScreen';
import Board from './components/Board/Board';
import StatsPanel from './components/StatsPanel/StatsPanel';
import DiceRoller from './components/DiceRoller/DiceRoller';
import MatchPanel from './components/MatchPanel/MatchPanel';
import LeaguePanel from './components/LeaguePanel/LeaguePanel';
import ErrorBoundary from './components/ErrorBoundary';
import PostGameReport from './components/PostGameReport/PostGameReport';
import styles from './App.module.css';

export default function App() {
  const { state, dispatch } = useGame();
  const [showReport, setShowReport] = useState(false);

  if (state.phase === 'setup') {
    return <SetupScreen />;
  }

  return (
    <div className={styles.app}>
      <LeaguePanel />
      <div className={styles.main}>
        <Board />
        <DiceRoller />
      </div>
      <StatsPanel />
      <MatchPanel />

      {/* 胜利画面 */}
      {!showReport && state.phase === 'finished' && state.winner !== null && (
        <div className={styles.winOverlay}>
          <div className={styles.winCard}>
            <h1 className={styles.winTitle}>🏆</h1>
            <h2 className={styles.winName}>{state.players[state.winner].name} 获胜！</h2>
            <p className={styles.winMsg}>{state.pendingAction?.message}</p>
            <button className={styles.resetBtn} onClick={() => setShowReport(true)}>赛后报告</button>
            <button className={styles.resetBtnSecondary} onClick={() => dispatch({ type: 'RESET_GAME' })}>再来一局</button>
          </div>
        </div>
      )}

      {showReport && (
        <ErrorBoundary>
          <PostGameReport state={state} onClose={() => setShowReport(false)} />
        </ErrorBoundary>
      )}
    </div>
  );
}
