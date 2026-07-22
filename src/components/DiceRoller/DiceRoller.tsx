import React, { useEffect, useRef, useState } from 'react';
import { useGame } from '../../state/GameContext';
import { ALL_PLAYERS } from '../../data/players';
import SavePanel from '../SavePanel/SavePanel';
import styles from './DiceRoller.module.css';

const DICE_FACES: Record<number, string> = {
  1: '⚀', 2: '⚁', 3: '⚂', 4: '⚃', 5: '⚄', 6: '⚅',
};

export default function ActionBar() {
  const { state, dispatch } = useGame();
  const { phase, currentPlayerIndex, players, diceValue, pendingAction, transferBidState, matchState } = state;

  // ===== 机器人自动操作 =====
  const [botPicked, setBotPicked] = useState<string | null>(null);
  const botTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 操作权归属：pendingAction.playerId 优先（巅峰对决切换控制权等场景）
  const botCheckId = (() => {
    if (pendingAction?.playerId !== undefined) return pendingAction.playerId;
    if (transferBidState?.phase === 'bidding') return transferBidState.bidders[transferBidState.bidderIndex];
    if (pendingAction?.type === 'assign_player' && pendingAction.instanceUid) {
      const inst = state.instances.find(i => i.uid === pendingAction.instanceUid);
      if (inst) return inst.ownerId;
    }
    return currentPlayerIndex;
  })();
  const isBot = players[botCheckId]?.isAI && !players[botCheckId]?.isBankrupt && phase === 'playing';
  const botColor = players[currentPlayerIndex]?.color || '#f0c060';

  // ===== 比赛机器人选人（独立于 isBot，不绑定当前回合玩家） =====
  useEffect(() => {
    if (!matchState || matchState.phase !== 'picking') return;
    const isHomeBot = players[matchState.homePlayerId]?.isAI;
    const isAwayBot = players[matchState.awayPlayerId]?.isAI;

    // 双方都是机器人且都没选 → 同时立刻选
    if (isHomeBot && isAwayBot && !matchState.homePick && !matchState.awayPick) {
      const homeAvail = matchState.homeSquad.filter((uid: string) => !matchState.homeUsed.includes(uid));
      const awayAvail = matchState.awaySquad.filter((uid: string) => !matchState.awayUsed.includes(uid));
      if (homeAvail.length > 0 && awayAvail.length > 0) {
        dispatch({ type: 'PICK_MATCH_PLAYER', instanceUid: homeAvail[Math.floor(Math.random() * homeAvail.length)], side: 'home' });
        dispatch({ type: 'PICK_MATCH_PLAYER', instanceUid: awayAvail[Math.floor(Math.random() * awayAvail.length)], side: 'away' });
      }
      return;
    }

    // 主队机器人且未选 → 立刻选
    if (isHomeBot && !matchState.homePick) {
      const avail = matchState.homeSquad.filter((uid: string) => !matchState.homeUsed.includes(uid));
      if (avail.length > 0) {
        dispatch({ type: 'PICK_MATCH_PLAYER', instanceUid: avail[Math.floor(Math.random() * avail.length)], side: 'home' });
      }
      return;
    }

    // 客队机器人且主队已选且客队未选 → 立刻选
    if (isAwayBot && matchState.homePick && !matchState.awayPick) {
      const avail = matchState.awaySquad.filter((uid: string) => !matchState.awayUsed.includes(uid));
      if (avail.length > 0) {
        dispatch({ type: 'PICK_MATCH_PLAYER', instanceUid: avail[Math.floor(Math.random() * avail.length)], side: 'away' });
      }
    }
  }, [matchState?.phase, matchState?.homePick, matchState?.awayPick, matchState?.round, players]);

  // ===== 机器人vs机器人：自动确认选人（双方选完后 2s） =====
  useEffect(() => {
    if (pendingAction?.type !== 'match_pick') return;
    if (!matchState) return;
    const isHomeBot = players[matchState.homePlayerId]?.isAI;
    const isAwayBot = players[matchState.awayPlayerId]?.isAI;
    if (!isHomeBot || !isAwayBot) return;
    const t = setTimeout(() => {
      // 防止投降/结束后仍然触发
      if (!matchState || matchState.phase !== 'picking') return;
      dispatch({ type: 'ROLL_MATCH_DICE' });
    }, 2000);
    return () => clearTimeout(t);
  }, [pendingAction?.type, pendingAction?.message]);

  // ===== 比赛结果 1.5s 自动推进（仅双方都是机器人时） =====
  useEffect(() => {
    const isReveal = pendingAction?.type === 'match_reveal';
    const isAutoResolve = pendingAction?.type === 'post_move' && pendingAction.options[0]?.action === 'CONFIRM_MATCH_RESULT';
    if (!isReveal && !isAutoResolve) return;
    if (!matchState) return;
    const isHomeBot = players[matchState.homePlayerId]?.isAI;
    const isAwayBot = players[matchState.awayPlayerId]?.isAI;
    if (!isHomeBot || !isAwayBot) return;
    const t = setTimeout(() => {
      if (!matchState) return;
      dispatch({ type: 'CONFIRM_MATCH_RESULT' });
    }, 1500);
    return () => clearTimeout(t);
  }, [pendingAction?.type, pendingAction?.message, matchState, players]);

  // ===== 银行操作计数器 =====
  const bankOpCount = useRef(0);
  if (pendingAction?.type !== 'loan') { bankOpCount.current = 0; }

  // ===== 机器人自动操作（非比赛场景） =====
  const botPlayer = players[botCheckId];
  useEffect(() => {
    if (!isBot) { setBotPicked(null); return; }

    // 比赛确认类操作由专用 useEffect 处理（match_pick / match_reveal），主循环不插手
    if (pendingAction?.type === 'match_pick' || pendingAction?.type === 'match_reveal') { setBotPicked(null); return; }

    if (!pendingAction || pendingAction.options.length === 0) { setBotPicked(null); return; }
    const enabled = pendingAction.options.filter((o: { disabled?: boolean }) => !o.disabled);
    let pick = enabled.length > 0 ? enabled : pendingAction.options;

    // 智能选择：优先理性操作
    const p = botPlayer;
    if (p && pendingAction?.type === 'loan') {
      bankOpCount.current++;
      const leave = pick.find((o: { action: string }) => o.action === 'DECLINE_LOAN');
      if (bankOpCount.current > 3) {
        if (leave) pick = [leave];
      } else {
        if (p.cash > 10 || p.savings > 10) {
          const noLoan = pick.filter((o: { action: string }) => !o.action.startsWith('TAKE_LOAN'));
          if (noLoan.length > 0) pick = noLoan;
        }
        const repayAll = pick.find((o: { action: string }) => o.action.startsWith('REPAY_LOAN:') && o.action.includes('全部'));
        const repayBig = pick.find((o: { action: string }) => o.action.startsWith('REPAY_LOAN:10') || o.action.startsWith('REPAY_LOAN:5'));
        const withdrawBig = pick.find((o: { action: string }) => o.action.startsWith('WITHDRAW:10') || o.action.startsWith('WITHDRAW:5'));
        const withdrawAny = pick.find((o: { action: string }) => o.action.startsWith('WITHDRAW:'));
        if (p.debt > 0 && p.cash >= 5 && repayBig) pick = [repayBig];
        else if (p.debt > 0 && repayAll && p.cash >= p.debt) pick = [repayAll];
        else if (p.debt > 0 && p.savings >= 5 && withdrawBig) pick = [withdrawBig];
        else if (p.debt > 0 && p.savings > 0 && withdrawAny) pick = [withdrawAny];
        else if (p.debt > 0) { if (leave) pick = [leave]; }
        else if (p.cash < 5 && p.savings > 5 && withdrawBig) pick = [withdrawBig];
        else if (p.cash < 5) { if (leave) pick = [leave]; }
      }
    }
    let chosen = pick[Math.floor(Math.random() * pick.length)];
    if (p && pendingAction?.type === 'transfer_bid' && !pendingAction.options.some((o: { action: string }) => o.action === 'YOUTH_DRAW')) {
      // 有空位且有钱 → 优先竞拍；否则离开（青训学院除外，已独立处理）
      const bidOpt = pick.find((o: { action: string }) => o.action.startsWith('PLACE_BID') || o.action.startsWith('START_BID'));
      const leaveOpt = pick.find((o: { action: string }) => o.action === 'SKIP_TRANSFER' || o.action === 'PASS_BID');
      if (bidOpt && !bidOpt.disabled) chosen = bidOpt;
      else if (leaveOpt) chosen = leaveOpt;
    }
    if (p && pendingAction?.type === 'transfer_sell') {
      // 负债 ≥ 20kw 时优先卖人，≥ 10kw 时也可卖
      const sellOpt = pick.find((o: { action: string }) => o.action.startsWith('SELL_PLAYER'));
      const leaveOpt = pick.find((o: { action: string }) => o.action === 'SKIP_TRANSFER');
      if (p.debt >= 20 && sellOpt) chosen = sellOpt;
      else if (p.debt >= 10 && sellOpt && Math.random() < 0.5) chosen = sellOpt;
      else if (leaveOpt) chosen = leaveOpt;
    }
    if (p && pendingAction?.type === 'upgrade') {
      // 所有球场剩余空位 ≤ 1 时一定升级
      const totalSlots = Object.entries(state.cellOwners)
        .filter(([, oid]) => oid === p.id)
        .reduce((sum, [cid]) => sum + (state.cellLevels[parseInt(cid)] || 1), 0);
      const totalPlayers = state.instances.filter(i => i.ownerId === p.id).length;
      if (totalSlots - totalPlayers <= 1) {
        const upOpt = pick.find((o: { action: string }) => o.action.startsWith('UPGRADE'));
        if (upOpt && !upOpt.disabled) chosen = upOpt;
      }
    }
    if (p && (pendingAction?.type === 'buy_club' || pendingAction?.type === 'buy_sponsor')) {
      const buyOpt = pick.find(o => (o.action.startsWith('BUY_CLUB') || o.action.startsWith('BUY_SPONSOR')) && !o.disabled);
      if (buyOpt) {
        if (buyOpt.action.startsWith('BUY_SPONSOR')) { chosen = buyOpt; }
        else {
          const myClubCount = Object.entries(state.cellOwners)
            .filter(([, oid]) => oid === p.id)
            .filter(([cid]) => state.cells[parseInt(cid)]?.type === 'club').length;
          if (myClubCount < 3 || p.cash > 10) chosen = buyOpt;
        }
      }
    }
    // 青训：现金>5kw必买
    if (p && pendingAction?.type === 'transfer_bid' && pendingAction.options.some(o => o.action === 'YOUTH_DRAW')) {
      const youthOpt = pick.find(o => o.action === 'YOUTH_DRAW' && !o.disabled);
      if (youthOpt && p.cash > 5) chosen = youthOpt;
    }
    if (p && pendingAction?.type === 'visit_or_challenge') {
      const challOpt = pick.find((o: { action: string; disabled?: boolean }) => o.action.startsWith('CHALLENGE') && !o.disabled);
      if (challOpt) {
        const homeClubId = pendingAction?.cellId;
        const x = state.instances.filter(i => i.clubId === homeClubId).length;
        const myClubIds = Object.entries(state.cellOwners).filter(([, oid]) => oid === p.id).map(([cid]) => parseInt(cid));
        let y = 0;
        for (const cid of myClubIds) { const cnt = state.instances.filter(i => i.clubId === cid).length; if (cnt > y) y = cnt; }
        if (x === 0) { chosen = challOpt; }
        else if (x > 2 * y) { /* 不挑战 */ }
        else if (y > x) { if (Math.random() < 0.8) chosen = challOpt; }
        else if (y === x) { if (Math.random() < 0.6) chosen = challOpt; }
        else if (y > x / 2) { if (Math.random() < 0.3) chosen = challOpt; }
      }
    }
    if (p && pendingAction?.type === 'match_setup') {
      const matchOpts = pick.filter((o: { action: string; disabled?: boolean }) => (o.action.startsWith('START_MATCH') || o.action.startsWith('PEAK_DUEL_CLUB')) && !o.disabled);
      if (matchOpts.length > 0) {
        let best = matchOpts[0], bestCount = 0, bestOvr = 0;
        for (const opt of matchOpts) {
          const cid = parseInt(opt.action.split(':')[2]);
          const count = state.instances.filter(i => i.clubId === cid).length;
          const avgOvr = count > 0 ? state.instances.filter(i => i.clubId === cid).reduce((s, i) => { const c = ALL_PLAYERS.find(x => x.id === i.cardId); return s + (c?.ovr || 0); }, 0) / count : 0;
          if (count > bestCount || (count === bestCount && avgOvr > bestOvr)) { best = opt; bestCount = count; bestOvr = avgOvr; }
        }
        chosen = best;
      }
    }
    if (p && (pendingAction?.type === 'street_food' || pendingAction?.type === 'street_animal')) {
      // 街头足球：能买就买
      const buy = pick.find((o: { action: string }) => o.action.startsWith('BUY_STREET'));
      if (buy && !buy.disabled) chosen = buy;
    }
    // 比赛日收入：有负债优先还贷
    if (p && pendingAction?.type === 'visit_or_challenge' && pendingAction.options.some((o: { action: string }) => o.action.startsWith('MATCH_INCOME:repay'))) {
      const repay = pick.find((o: { action: string }) => o.action.startsWith('MATCH_INCOME:repay'));
      if (repay && p.debt > 0) chosen = repay;
      else if (p.cash < 5) {
        const cash = pick.find((o: { action: string }) => o.action.startsWith('MATCH_INCOME:cash'));
        if (cash) chosen = cash;
      }
    }

    // 兜底：选最后一个（通常是"离开"/"不买"等安全选项）
    const fallback = pick[pick.length - 1];

    setBotPicked(chosen.action);
    const startTime = Date.now();
    botTimer.current = setTimeout(() => {
      const act = chosen.action;
      if (act === 'END_TURN') dispatch({ type: 'END_TURN' });
      else if (act === 'ROLL_DICE') dispatch({ type: 'START_DICE_ANIMATION' });
      else if (act === 'OK') dispatch({ type: 'CHOOSE_ACTION', action: 'OK' });
      else dispatch({ type: 'CHOOSE_ACTION', action: act, cellId: pendingAction?.cellId });
      setBotPicked(null);
    }, 2000);

    // 超时兜底：5s 后如果还没动作，强制选最后一个
    const safetyTimer = setTimeout(() => {
      if (Date.now() - startTime > 4000) {
        dispatch({ type: 'CHOOSE_ACTION', action: fallback.action, cellId: pendingAction?.cellId });
        setBotPicked(null);
      }
    }, 5000);

    return () => { if (botTimer.current) clearTimeout(botTimer.current); clearTimeout(safetyTimer); };
  }, [isBot, pendingAction?.type, pendingAction?.message]);

  // ===== 正常渲染 =====
  if (phase !== 'playing') return null;
  const displayPlayerId = (() => {
    if (pendingAction?.playerId !== undefined) return pendingAction.playerId;
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
      {pendingAction && !isSimpleStep && (
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
