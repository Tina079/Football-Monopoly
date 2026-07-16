import React from 'react';
import { useGame } from '../../state/GameContext';
import { ALL_PLAYERS } from '../../data/players';
import { LEVEL_TOURNAMENTS } from '../../types';
import { BOARD_CELLS } from '../../data/board';
import styles from './MatchPanel.module.css';

export default function MatchPanel() {
  const { state, dispatch } = useGame();
  const { matchState, pendingAction, instances, players } = state;

  if (!matchState) return null;

  const homeCell = BOARD_CELLS[matchState.homeClubId];
  const awayCell = BOARD_CELLS[matchState.awayClubId];
  const homePlayer = players[matchState.homePlayerId];
  const awayPlayer = players[matchState.awayPlayerId];

  const getAvailablePlayers = (side: 'home' | 'away') => {
    const squad = side === 'home' ? matchState.homeSquad : matchState.awaySquad;
    const used = side === 'home' ? matchState.homeUsed : matchState.awayUsed;
    // 金球决胜时允许已出场球员
    if (matchState.isGoldenGoal) return squad;
    return squad.filter(uid => !used.includes(uid));
  };

  const handlePick = (uid: string, side: 'home' | 'away') => {
    dispatch({ type: 'PICK_MATCH_PLAYER', instanceUid: uid, side });
  };

  const handleConfirm = () => {
    if (!pendingAction) return;
    const act = pendingAction.options[0].action;
    if (act === 'CONFIRM_MATCH_RESULT') {
      dispatch({ type: 'CONFIRM_MATCH_RESULT' });
    } else if (act === 'OPEN_MATCH') {
      dispatch({ type: 'CHOOSE_ACTION', action: 'OPEN_MATCH' });
    } else if (act === 'ROLL_MATCH_DICE') {
      dispatch({ type: 'ROLL_MATCH_DICE' });
    }
  };

  const getPlayerInfo = (uid: string) => {
    const inst = instances.find(i => i.uid === uid);
    if (!inst) return null;
    const card = ALL_PLAYERS.find(c => c.id === inst.cardId);
    if (!card) return null;
    const effectiveAttrs = card.attrs.map((v, i) => v + (inst.growth[i] || 0));
    return { card, effectiveAttrs, inst };
  };

  const isPicking = matchState.phase === 'picking';
  const isReveal = matchState.phase === 'reveal' || matchState.phase === 'round_result';
  const lastRound = matchState.rounds[matchState.rounds.length - 1];

  return (
    <div className={styles.overlay}>
      <div className={styles.panel}>
        <div className={styles.header}>
          <div className={styles.forfeitRow}>
            <button className={styles.forfeitBtn} onClick={() => dispatch({ type: 'FORFEIT_MATCH', side: 'home' })}>
              🏳️ {homePlayer?.name} 投降
            </button>
            <button className={styles.forfeitBtn} onClick={() => dispatch({ type: 'FORFEIT_MATCH', side: 'away' })}>
              🏳️ {awayPlayer?.name} 投降
            </button>
          </div>
          <h2 className={styles.title}>
            ⚔️ {LEVEL_TOURNAMENTS[matchState.level]} · {matchState.isGoldenGoal ? '金球决胜' : `第${matchState.round}/${matchState.maxRounds}轮`}
          </h2>
          <div className={styles.scoreboard}>
            <span className={styles.homeScore} style={{ color: homePlayer?.color }}>
              {homeCell?.name} {matchState.homeScore}
            </span>
            <span className={styles.vs}>:</span>
            <span className={styles.awayScore} style={{ color: awayPlayer?.color }}>
              {matchState.awayScore} {awayCell?.name}
            </span>
          </div>
        </div>

        <div className={styles.arena}>
          {/* 主队 */}
          <div className={styles.side}>
            <h3 className={styles.sideName} style={{ color: homePlayer?.color }}>
              🏠 {homeCell?.name}（{homePlayer?.name}）
            </h3>
            <div className={styles.squad}>
              {isPicking && getAvailablePlayers('home').map(uid => {
                const info = getPlayerInfo(uid);
                if (!info) return null;
                const { card, effectiveAttrs, inst } = info;
                return (
                  <button
                    key={uid}
                    className={`${styles.playerBtn} ${matchState.homePick === uid ? styles.selected : ''}`}
                    onClick={() => handlePick(uid, 'home')}
                  >
                    <span className={styles.playerName}>{card.name}</span>
                    <span className={styles.playerAttrs}>
                      {card.isGK ? `OVR ${card.ovr + (inst.growth[0] || 0)}` : effectiveAttrs.join('/')}
                    </span>
                  </button>
                );
              })}
              {isReveal && lastRound && (() => {
                const info = getPlayerInfo(lastRound.homeUid);
                if (!info) return null;
                return (
                  <div className={`${styles.revealCard} ${lastRound.winner === 'home' ? styles.winner : ''}`}>
                    <span className={styles.revealName}>{info.card.name}</span>
                    <span className={styles.revealVal}>
                      {lastRound.attrIndex !== undefined ? lastRound.homeVal : '?'}
                    </span>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* 中间：骰子/结果 */}
          <div className={styles.center}>
            {isReveal && lastRound && (
              <div className={styles.diceResult}>
                <span className={styles.diceIcon}>
                  {['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][lastRound.diceValue] || '🎲'}
                </span>
                <span className={styles.attrLabel}>
                  {['速度', '射门', '传球', '盘带', '防守', '身体'][lastRound.attrIndex]}
                </span>
                <span className={styles.winnerLabel}>
                  {lastRound.winner === 'home' ? '主队胜' : lastRound.winner === 'away' ? '客队胜' : '平'}
                </span>
              </div>
            )}
          </div>

          {/* 客队 */}
          <div className={styles.side}>
            <h3 className={styles.sideName} style={{ color: awayPlayer?.color }}>
              ✈️ {awayCell?.name}（{awayPlayer?.name}）
            </h3>
            <div className={styles.squad}>
              {isPicking && getAvailablePlayers('away').map(uid => {
                const info = getPlayerInfo(uid);
                if (!info) return null;
                const { card, effectiveAttrs, inst } = info;
                return (
                  <button
                    key={uid}
                    className={`${styles.playerBtn} ${matchState.awayPick === uid ? styles.selected : ''}`}
                    onClick={() => handlePick(uid, 'away')}
                  >
                    <span className={styles.playerName}>{card.name}</span>
                    <span className={styles.playerAttrs}>
                      {card.isGK ? `OVR ${card.ovr + (inst.growth[0] || 0)}` : effectiveAttrs.join('/')}
                    </span>
                  </button>
                );
              })}
              {isReveal && lastRound && (() => {
                const info = getPlayerInfo(lastRound.awayUid);
                if (!info) return null;
                return (
                  <div className={`${styles.revealCard} ${lastRound.winner === 'away' ? styles.winner : ''}`}>
                    <span className={styles.revealName}>{info.card.name}</span>
                    <span className={styles.revealVal}>
                      {lastRound.attrIndex !== undefined ? lastRound.awayVal : '?'}
                    </span>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* 操作按钮：对比分状态始终可见 */}
        <div className={styles.actions}>
          {pendingAction && (pendingAction.type === 'match_pick' || pendingAction.type === 'match_reveal' || (pendingAction.type === 'post_move' && pendingAction.options[0]?.action === 'CONFIRM_MATCH_RESULT')) ? (
            <button className={styles.confirmBtn} onClick={handleConfirm}>
              {pendingAction.options[0]?.label || '确定'}
            </button>
          ) : isPicking ? (
            <span className={styles.waiting}>👆 请在上方点击球员卡片选择出场球员</span>
          ) : null}
        </div>

        {/* 赛果滚动 */}
        <div className={styles.roundLog}>
          {matchState.rounds.map((r, i) => {
            const hCard = ALL_PLAYERS.find(c => c.id === r.homeCardId);
            const aCard = ALL_PLAYERS.find(c => c.id === r.awayCardId);
            return (
              <span key={i} className={styles.roundItem}>
                R{i + 1}: {hCard?.name ?? '?'}({r.homeVal}) vs {aCard?.name ?? '?'}({r.awayVal}) — {r.winner === 'home' ? '主' : r.winner === 'away' ? '客' : '平'}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
