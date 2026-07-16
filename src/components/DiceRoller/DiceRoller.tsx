import React, { useEffect, useRef, useState } from 'react';
import { useGame } from '../../state/GameContext';
import { BOARD_CELLS } from '../../data/board';
import SavePanel from '../SavePanel/SavePanel';
import styles from './DiceRoller.module.css';

const DICE_FACES: Record<number, string> = {
  1: '⚀', 2: '⚁', 3: '⚂', 4: '⚃', 5: '⚄', 6: '⚅',
};

export default function ActionBar() {
  const { state, dispatch } = useGame();
  const { phase, currentPlayerIndex, players, diceValue, pendingAction, challengeState, transferBidState, matchState } = state;

  // ===== 机器人自动操作 =====
  const [botPicked, setBotPicked] = useState<string | null>(null);
  const botTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isBot = players[currentPlayerIndex]?.isAI && !players[currentPlayerIndex]?.isBankrupt && phase === 'playing';
  const botColor = players[currentPlayerIndex]?.color || '#f0c060';

  // ===== 比赛结果/空阵判定 1.5s 全员自动推进 =====
  useEffect(() => {
    const isReveal = pendingAction?.type === 'match_reveal';
    const isAutoResolve = pendingAction?.type === 'post_move' && pendingAction.options[0]?.action === 'CONFIRM_MATCH_RESULT';
    if (!isReveal && !isAutoResolve) return;
    const t = setTimeout(() => dispatch({ type: 'CONFIRM_MATCH_RESULT' }), 1500);
    return () => clearTimeout(t);
  }, [pendingAction?.type, pendingAction?.message]);

  // ===== 机器人自动操作 =====
  useEffect(() => {
    if (!isBot) { setBotPicked(null); return; }

    // 比赛选人
    if (matchState?.phase === 'picking') {
      const side = matchState.homePick ? 'away' : 'home';
      const isHomeBot = players[matchState.homePlayerId]?.isAI;
      const isAwayBot = players[matchState.awayPlayerId]?.isAI;
      const shouldAct = (side === 'home' && isHomeBot) || (side === 'away' && isAwayBot);
      if (!shouldAct) { setBotPicked(null); return; }
      const squad = side === 'home' ? matchState.homeSquad : matchState.awaySquad;
      const used = side === 'home' ? matchState.homeUsed : matchState.awayUsed;
      const avail = squad.filter((uid: string) => !used.includes(uid));
      if (avail.length === 0) { setBotPicked(null); return; }
      const pick = avail[Math.floor(Math.random() * avail.length)];
      botTimer.current = setTimeout(() => {
        dispatch({ type: 'PICK_MATCH_PLAYER', instanceUid: pick, side });
        setBotPicked(null);
      }, 2000);
      return;
    }

    if (!pendingAction || pendingAction.options.length === 0) { setBotPicked(null); return; }
    const enabled = pendingAction.options.filter((o: { disabled?: boolean }) => !o.disabled);
    const pick = enabled.length > 0 ? enabled : pendingAction.options;
    const chosen = pick[Math.floor(Math.random() * pick.length)];

    setBotPicked(chosen.action);
    botTimer.current = setTimeout(() => {
      const act = chosen.action;
      if (act === 'END_TURN') dispatch({ type: 'END_TURN' });
      else if (act === 'ROLL_DICE') dispatch({ type: 'START_DICE_ANIMATION' });
      else if (act === 'OK') dispatch({ type: 'CHOOSE_ACTION', action: 'OK' });
      else dispatch({ type: 'CHOOSE_ACTION', action: act, cellId: pendingAction?.cellId });
      setBotPicked(null);
    }, 2000);

    return () => { if (botTimer.current) clearTimeout(botTimer.current); };
  }, [isBot, pendingAction?.type, pendingAction?.message, matchState?.phase, matchState?.round, matchState?.homePick, matchState?.awayPick]);

  // ===== 正常渲染 =====
  if (phase !== 'playing') return null;
  const displayPlayerId = (() => {
    if (transferBidState?.phase === 'bidding') return transferBidState.bidders[transferBidState.bidderIndex];
    if (transferBidState?.phase === 'assign') return transferBidState.currentBidderId ?? currentPlayerIndex;
    if (pendingAction?.type === 'assign_player' && pendingAction.instanceUid) {
      const inst = state.instances.find(i => i.uid === pendingAction.instanceUid);
      if (inst) return inst.ownerId;
    }
    return currentPlayerIndex;
  })();
  const player = players[displayPlayerId];
  if (!player || player.isBankrupt) return null;

  // 比赛中无按钮时显示提示
  if (!pendingAction && matchState) {
    return (
      <div className={styles.container}>
        <SavePanel />
        <div className={styles.currentPlayer}>
          <span className={styles.dot} style={{ backgroundColor: player.color }} />
          <span className={styles.name}>{player.name}</span>
        </div>
        <span className={styles.actionPrompt}>⚔️ 比赛进行中，请在对战面板操作</span>
      </div>
    );
  }

  const handleAction = (action: string, cellId?: number) => {
    if (action === 'END_TURN') { dispatch({ type: 'END_TURN' }); return; }
    dispatch({ type: 'CHOOSE_ACTION', action, cellId: cellId ?? pendingAction?.cellId });
  };

  const isSimpleStep = pendingAction?.type === 'post_move' && pendingAction.options.length === 1;

  // 挑战 UI
  if (challengeState && (pendingAction?.type === 'challenge_roll' || pendingAction?.type === 'confirm_pay')) {
    const cell = BOARD_CELLS[challengeState.cellId];
    const owner = players[state.cellOwners[challengeState.cellId]];
    return (
      <div className={styles.container}>
        <SavePanel />
        <div className={styles.currentPlayer}>
          <span className={styles.dot} style={{ backgroundColor: player.color }} />
          <span className={styles.name}>{player.name}</span>
        </div>
        <div className={styles.challengeBox}>
          <div className={styles.challengeRow}>
            <span className={styles.challengeLabel}>⚔️ {cell?.name ?? '?'} 挑战</span>
            <span className={styles.vsLabel}>地主: {owner?.name}</span>
          </div>
          <div className={styles.diceRow}>
            <span className={styles.rollBox}>{player.name}: <strong>{challengeState.challengerRoll ?? '?'}</strong></span>
            <span className={styles.vsText}>VS</span>
            <span className={styles.rollBox}>{owner?.name}: <strong>{challengeState.ownerRoll ?? '?'}</strong></span>
          </div>
          {challengeState.ownerRoll !== null && <span className={styles.resultMsg}>{pendingAction.message}</span>}
          <button className={styles.actionBtn} onClick={() => handleAction(pendingAction.options[0].action, pendingAction.cellId)}>
            {pendingAction.options[0].label}
          </button>
        </div>
      </div>
    );
  }

  // 正常人类 UI
  return (
    <div className={styles.container}>
      <SavePanel />
      {isBot && <span className={styles.botThinking} style={{ borderColor: botColor }}>思考中...</span>}
      <div className={styles.currentPlayer}>
        <span className={styles.dot} style={{ backgroundColor: player.color }} />
        <span className={styles.name}>{player.name}{isBot ? ' 🤖' : ''}</span>
      </div>
      {diceValue && !state.diceAnimating && (
        <div className={styles.diceDisplay}>
          <span className={styles.diceFace}>{DICE_FACES[diceValue]}</span>
          <span className={styles.diceNum}>{diceValue}</span>
        </div>
      )}
      {isSimpleStep && (() => {
        const act = pendingAction!.options[0].action;
        return (
          <>
            <span className={styles.actionPrompt}>{pendingAction!.message}</span>
            <button className={styles.actionBtn} disabled={isBot} onClick={() => {
              if (act === 'END_TURN') dispatch({ type: 'END_TURN' });
              else if (act === 'ROLL_DICE') dispatch({ type: 'START_DICE_ANIMATION' });
              else if (act.startsWith('MOVE:')) dispatch({ type: 'MOVE_PLAYER', steps: parseInt(act.split(':')[1]) });
              else if (act === 'OK') dispatch({ type: 'CHOOSE_ACTION', action: 'OK' });
              else dispatch({ type: 'CHOOSE_ACTION', action: act, cellId: pendingAction?.cellId });
            }} style={isBot && botPicked === act ? { outline: `3px solid ${botColor}`, outlineOffset: '2px' } : undefined}>{pendingAction!.options[0].label}</button>
          </>
        );
      })()}
      {pendingAction && !isSimpleStep && pendingAction.type !== 'challenge_roll' && (
        <div className={styles.actionGroup}>
          <span className={styles.actionPrompt}>{pendingAction.message}</span>
          <div className={styles.actionBtns}>
            {pendingAction.options.map((opt: { label: string; action: string; disabled?: boolean }, i: number) => (
              <button key={i} disabled={isBot || opt.disabled === true} onClick={() => handleAction(opt.action, pendingAction.cellId)}
                className={opt.label.includes('不买') || opt.label.includes('暂不') || opt.label.includes('不贷款') || opt.label.includes('不飞了') || opt.label.includes('不跟价') || opt.label.includes('不卖') || opt.label.includes('路过') || opt.label.includes('确定') || opt.label.includes('知道了') ? styles.secondaryBtn : styles.primaryBtn}
                style={isBot && botPicked === opt.action ? { outline: `3px solid ${botColor}`, outlineOffset: '2px' } : undefined}
              >{opt.label}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
