import React from 'react';
import { useGame } from '../../state/GameContext';
import { getCellPosition } from '../../data/board';
import Cell from '../Cell/Cell';
import PlayerToken from '../PlayerToken/PlayerToken';
import DiceAnimation from '../DiceAnimation/DiceAnimation';
import styles from './Board.module.css';

export default function Board() {
  const { state } = useGame();
  const { cells, players, instances, clubTrophies } = state;

  // 创建一个 11x11 的映射
  const grid: (number | null)[][] = Array.from({ length: 11 }, () =>
    Array(11).fill(null)
  );

  cells.forEach(cell => {
    const { row, col } = getCellPosition(cell.id);
    grid[row][col] = cell.id;
  });

  // 按格分组玩家
  const playersByCell: Record<number, typeof players> = {};
  players.forEach(p => {
    if (!playersByCell[p.position]) playersByCell[p.position] = [];
    playersByCell[p.position].push(p);
  });

  return (
    <div className={styles.container}>
      <div className={styles.titleArea}>
        <h2 className={styles.gameTitle}>⚽ 足球大富翁</h2>
        <span className={styles.round}>第 {state.turn} 轮</span>
      </div>
      <div className={styles.grid}>
        {grid.map((row, ri) => (
          <div key={ri} className={styles.row}>
            {row.map((cellId, ci) => {
              if (cellId === null) {
                return <div key={`${ri}-${ci}`} className={styles.empty} />;
              }
              return (
                <div key={cellId} className={styles.cellWrapper}>
                  <Cell
                    cell={cells[cellId]}
                    isOwned={state.cellOwners[cellId] !== undefined}
                    ownerColor={
                      state.cellOwners[cellId] !== undefined
                        ? players.find(p => p.id === state.cellOwners[cellId])?.color
                        : undefined
                    }
                    level={state.cellLevels[cellId]}
                    playerCount={instances.filter(i => i.clubId === cellId).length}
                    trophyCount={clubTrophies[cellId] || 0}
                  />
                  {playersByCell[cellId] && (
                    <div className={styles.tokens}>
                      {playersByCell[cellId].map(p => (
                        <PlayerToken key={p.id} player={p} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <DiceAnimation />
    </div>
  );
}
