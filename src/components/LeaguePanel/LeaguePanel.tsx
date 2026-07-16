import React from 'react';
import { useGame } from '../../state/GameContext';
import { LEVEL_TOURNAMENTS } from '../../types';
import { TOURNAMENT_PRIZES } from '../../data/players';
import { BOARD_CELLS } from '../../data/board';
import styles from './LeaguePanel.module.css';

export default function LeaguePanel() {
  const { state } = useGame();
  const { leagueTables, players } = state;

  if (state.phase !== 'playing') return null;

  return (
    <div className={styles.panel}>
      <h3 className={styles.heading}>🏆 联赛积分榜</h3>
      {[1, 2, 3, 4, 5].map(level => {
        const t = leagueTables[level];
        if (!t) return null;
        const sorted = [...t.entries].sort((a, b) => b.points - a.points);
        return (
          <div key={level} className={styles.table}>
            <div className={styles.tableHeader}>
              <span className={styles.tableName}>{LEVEL_TOURNAMENTS[level]}</span>
              <span className={styles.progress}>
                {t.matchesPlayed}/{t.matchesNeeded} 场 · 🥇{TOURNAMENT_PRIZES[level]}kw
              </span>
            </div>
            <div className={styles.entries}>
              {sorted.map((e, i) => {
                const cell = BOARD_CELLS[e.clubId];
                const owner = players[e.ownerId];
                return (
                  <div key={e.clubId} className={styles.entry}>
                    <span className={styles.rank}>{i + 1}</span>
                    <span className={styles.clubName} style={{ color: owner?.color }}>
                      {cell?.name ?? '?'}
                    </span>
                    <span className={styles.stats}>{e.points}分 · {e.matches}场</span>
                  </div>
                );
              })}
              {sorted.length === 0 && (
                <span className={styles.empty}>暂无比赛</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
