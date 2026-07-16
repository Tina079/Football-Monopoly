import React from 'react';
import { Player } from '../../types';
import styles from './PlayerToken.module.css';

interface Props {
  player: Player;
}

export default function PlayerToken({ player }: Props) {
  return (
    <div
      className={styles.token}
      style={{ backgroundColor: player.color }}
      title={player.name}
    >
      {player.id + 1}
    </div>
  );
}
