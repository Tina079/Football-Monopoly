import React from 'react';
import { Cell as CellType, LEAGUE_COLORS } from '../../types';
import styles from './Cell.module.css';

interface Props {
  cell: CellType;
  isOwned: boolean;
  ownerColor?: string;
  level?: number;
  playerCount?: number;
  trophyCount?: number;
}

const ICONS: Record<string, string> = {
  start: '🏁',
  bank: '🏦',
  jail: '🔒',
  airport: '✈️',
  transfer: '🔄',
  street: '⚽',
  random: '🎲',
  windfall: '🍀',
  blank: '',
};

export default function Cell({ cell, isOwned, ownerColor, level, playerCount, trophyCount }: Props) {
  const isCorner = ['start', 'bank', 'jail', 'airport'].includes(cell.type);

  let bgColor = 'var(--cell-bg)';
  if (cell.league) {
    bgColor = LEAGUE_COLORS[cell.league];
  } else if (cell.type === 'sponsor') {
    bgColor = '#2c2c2c';
  } else if (isCorner) {
    bgColor = '#1a3a4a';
  } else if (cell.type === 'transfer') {
    bgColor = '#6b3fa0';
  } else if (cell.type === 'street') {
    bgColor = '#555';
  } else if (cell.type === 'random') {
    bgColor = '#b8860b';
  } else if (cell.type === 'windfall') {
    bgColor = '#b8860b';
  } else if (cell.type === 'blank') {
    bgColor = '#1e1e2e';
  }

  const icon = ICONS[cell.type] || '';

  return (
    <div
      className={`${styles.cell} ${isCorner ? styles.corner : ''}`}
      style={{ backgroundColor: bgColor }}
      title={cell.name}
    >
      {/* 拥有者标记 */}
      {isOwned && ownerColor && (
        <div className={styles.ownerBar} style={{ backgroundColor: ownerColor }} />
      )}

      {/* 联赛色条 (俱乐部格子) */}
      {cell.league && !isOwned && (
        <div className={styles.leagueBar} style={{ backgroundColor: LEAGUE_COLORS[cell.league] }} />
      )}

      {/* 格子编号 */}
      <span className={styles.cellId}>{cell.id}</span>

      {/* 内容 */}
      <div className={styles.content}>
        {icon && <span className={styles.icon}>{icon}</span>}
        <span className={`${styles.name} ${isCorner ? styles.cornerName : ''}`}>
          {cell.name}
        </span>
        {/* 俱乐部已购买：显示星级；未购买/赞助商：显示价格 */}
        {cell.type === 'club' && isOwned && level ? (
          <span className={styles.stars}>
            {'★'.repeat(level)}
            {playerCount && playerCount > 0 ? '👤'.repeat(playerCount) : ''}
            {trophyCount && trophyCount > 0 ? '🏆'.repeat(Math.min(trophyCount, 3)) : ''}
          </span>
        ) : cell.price !== undefined ? (
          <span className={styles.price}>
            {`${cell.price}kw`}
          </span>
        ) : null}
      </div>
    </div>
  );
}
