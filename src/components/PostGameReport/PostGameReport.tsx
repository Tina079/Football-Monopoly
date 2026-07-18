import React, { useState, useRef, useCallback } from 'react';
import { toPng } from 'html-to-image';
import qrCodeSrc from '../../assets/qrcode.png';
import { GameState, UPGRADE_COSTS } from '../../types';
import { BOARD_CELLS } from '../../data/board';
import { ALL_PLAYERS } from '../../data/players';
import styles from './PostGameReport.module.css';

// ========== 类型 ==========

interface SquadPlayer { name: string; ovr: number; isGK?: boolean }
interface BestTeam {
  name: string; avgOvr: number; players: SquadPlayer[];
  leagueTitles: number; cupTitles: number; eclTitles: number; uelTitles: number; uclTitles: number;
}
interface ReportData {
  id: number; name: string; color: string;
  rounds: { turn: number; cash: number; savings: number; debt: number; propertyValue: number }[];
  totalIncome: number; totalSpent: number;
  jailCount: number; totalMatches: number; matchesWon: number; championships: number;
  endedBy: 'win' | 'bankrupt' | 'survived'; totalTurns: number;
  bestTeam: BestTeam;
  timeline: { turn: number; icon: string; text: string }[];
}

function getPropertyValue(state: GameState, playerId: number): number {
  let total = 0;
  for (const [cid, ownerId] of Object.entries(state.cellOwners)) {
    if (ownerId !== playerId) continue;
    const cell = BOARD_CELLS[parseInt(cid)];
    if (!cell) continue;
    const level = state.cellLevels[parseInt(cid)] || 1;
    let val = cell.price || 0;
    for (let lv = 1; lv < level; lv++) val += UPGRADE_COSTS[lv] || 0;
    total += val;
  }
  return total;
}

function buildTimeline(state: GameState, playerId: number): { turn: number; icon: string; text: string }[] {
  const pl2 = state.players[playerId];
  const endTurn2 = pl2?.isBankrupt ? (pl2.bankruptTurn || state.turn) : state.turn;
  const all = state.events.filter(e => e.playerId === playerId && e.turn <= endTurn2).sort((a, b) => a.turn - b.turn);
  const used = new Set<number>();
  const result: { turn: number; icon: string; text: string }[] = [];
  const idxOf = (e: typeof all[0]) => all.indexOf(e);
  const pickFirst = (icon: string, prefix: string): boolean => {
    const idx = all.findIndex(e => e.icon === icon && !used.has(idxOf(e)));
    if (idx < 0) return false;
    used.add(idx);
    result.push({ turn: all[idx].turn, icon: all[idx].icon, text: prefix + all[idx].text });
    return true;
  };
  pickFirst('🏟️', '买下第一座球场：');
  pickFirst('⚽', '签下第一名球员：');
  pickFirst('⬆️', '首次升级球场：');
  pickFirst('🏆', '首夺冠军：');
  pickFirst('👑', '首夺欧冠：');
  const lv5Idx = all.findIndex(e => e.icon === '⭐' && !used.has(idxOf(e)));
  if (lv5Idx >= 0) { used.add(lv5Idx); result.push({ turn: all[lv5Idx].turn, icon: all[lv5Idx].icon, text: '首次升级至五级球场：' + all[lv5Idx].text }); }
  const endIcon = state.winner === playerId ? '👑' : pl2?.isBankrupt ? '💀' : '🏁';
  const endText = state.winner === playerId ? '达成大富翁胜利！' : pl2?.isBankrupt ? '不幸破产出局' : '奋战至最后一轮';
  const endEvent = { turn: endTurn2, icon: endIcon, text: endText };
  const debts = all.filter(e => e.icon === '🍀' && !used.has(idxOf(e)));
  if (debts.length > 0) {
    const best = debts.reduce((a, b) => (parseFloat(b.text) || 0) > (parseFloat(a.text) || 0) ? b : a);
    used.add(idxOf(best));
    result.push({ turn: best.turn, icon: best.icon, text: '最大一笔负债勾销：' + best.text });
  }
  const pSnaps = state.snapshots.filter(s => s.players[playerId] && s.turn <= endTurn2);
  let maxD = 0, maxT = 0; let maxDir = '';
  for (let i = 1; i < pSnaps.length; i++) {
    const prev = pSnaps[i - 1].players[playerId]?.cash ?? 0;
    const curr = pSnaps[i].players[playerId]?.cash ?? 0;
    const d = Math.abs(curr - prev);
    if (d > maxD) { maxD = d; maxT = pSnaps[i].turn; maxDir = curr > prev ? '收入' : '支出'; }
  }
  if (maxD > 0 && !result.some(r => r.turn === maxT)) {
    result.push({ turn: maxT, icon: '💰', text: `最大单笔现金${maxDir}：${Math.round(maxD * 100) / 100}kw` });
  }
  const jailIdx = all.findIndex(e => e.icon === '🔒' && !used.has(idxOf(e)));
  if (jailIdx >= 0) { used.add(jailIdx); result.push({ turn: all[jailIdx].turn, icon: all[jailIdx].icon, text: '首次入狱' }); }
  pickFirst('🏋️', '首次球员训练：');
  pickFirst('🏪', '买下第一个赞助商：');
  const fillerPrefix: Record<string, string> = { '🏟️':'购入球场：','⚽':'签下球员：','⬆️':'升级：','🏆':'夺冠：','👑':'欧冠：','⭐':'Lv5：','🍀':'负债勾销：','🏋️':'训练：','🏪':'赞助商：' };
  // ═══ 不足 6 条补入（排除入狱） ═══
  for (const e of all) {
    if (result.length >= 6) break;
    if (e.icon === '🔒') continue; // 入狱只留首次
    if (!used.has(idxOf(e))) { used.add(idxOf(e)); result.push({ turn: e.turn, icon: e.icon, text: (fillerPrefix[e.icon] || '') + e.text }); }
  }
  result.sort((a, b) => a.turn - b.turn);
  // 终局事件固定最后一条，截断时也保留
  const final = result.slice(0, 11);
  final.push(endEvent);
  return final;
}

function buildReportData(state: GameState): ReportData[] {
  return state.players.map(p => {
    const stats = state.playerStats[p.id] || { totalIncome: 0, totalSpent: 0, jailCount: 0, matchesPlayed: 0, matchesWon: 0, championships: 0 };
    const endTurn = p.isBankrupt ? (p.bankruptTurn || state.turn) : state.turn;
    // 破产玩家只取破产前的快照：不超过破产轮次
    const allRounds = state.snapshots
      .filter(s => s.turn <= endTurn)
      .map(s => ({
        turn: s.turn,
        cash: s.players[p.id]?.cash ?? 0,
        savings: s.players[p.id]?.savings ?? 0,
        debt: s.players[p.id]?.debt ?? 0,
        propertyValue: s.players[p.id]?.propertyValue ?? 0,
      }));
    // 破产玩家：排除破产轮次中清理后的归零快照（cash=savings=debt=0）
    const rounds = p.isBankrupt
      ? allRounds.filter((r, i) => !(r.turn === endTurn && r.cash === 0 && r.savings === 0 && r.debt === 0))
      : allRounds;

    // 最强球队：破产玩家用破产时记录，存活玩家实时计算
    const bt = state.bankruptTeams[p.id];
    let bestTeam: ReportData['bestTeam'];
    if (bt) {
      bestTeam = {
        name: bt.name, avgOvr: bt.avgOvr,
        players: bt.players,
        leagueTitles: bt.leagueTitles, cupTitles: bt.cupTitles,
        eclTitles: bt.eclTitles, uelTitles: bt.uelTitles, uclTitles: bt.uclTitles,
      };
    } else {
      bestTeam = { name: '无球队', avgOvr: 0, players: [], leagueTitles: 0, cupTitles: 0, eclTitles: 0, uelTitles: 0, uclTitles: 0 };
      const myClubs = Object.entries(state.cellOwners)
        .filter(([, oid]) => oid === p.id)
        .map(([cid]) => parseInt(cid));
      let bestOvrSum = -1;
      for (const cid of myClubs) {
      const squad = state.instances.filter(i => i.clubId === cid);
      if (squad.length === 0) continue;
      let ovrSum = 0;
      const players: SquadPlayer[] = [];
      for (const inst of squad) {
        const card = ALL_PLAYERS.find(c => c.id === inst.cardId);
        if (!card) continue;
        const ovr = card.isGK ? card.ovr + (inst.growth[0] || 0) : card.ovr + Math.floor(inst.growth.reduce((a, b) => a + b, 0) / 6);
        ovrSum += ovr;
        players.push({ name: card.name, ovr, isGK: card.isGK });
      }
      if (ovrSum > bestOvrSum) {
        bestOvrSum = ovrSum;
        const tr = state.clubTrophies[cid];
        const byLevel = tr?.byLevel || [0, 0, 0, 0, 0, 0];
        bestTeam = {
          name: BOARD_CELLS[cid]?.name ?? '?',
          avgOvr: Math.round((ovrSum / squad.length) * 10) / 10,
          players: players.sort((a, b) => b.ovr - a.ovr),
          leagueTitles: byLevel[1] || 0,
          cupTitles: byLevel[2] || 0,
          eclTitles: byLevel[3] || 0,
          uelTitles: byLevel[4] || 0,
          uclTitles: byLevel[5] || 0,
        };
      }
    }
    }

    const endedBy = state.winner === p.id ? 'win' as const : p.isBankrupt ? 'bankrupt' as const : 'survived' as const;

    return {
      id: p.id, name: p.name, color: p.color,
      rounds,
      totalIncome: stats.totalIncome, totalSpent: stats.totalSpent,
      jailCount: stats.jailCount, totalMatches: stats.matchesPlayed, matchesWon: stats.matchesWon,
      championships: stats.championships,
      endedBy, totalTurns: endTurn,
      bestTeam,
      timeline: buildTimeline(state, p.id),
    };
  });
}


// ========== 走势图（固定宽度，横轴标轮次） ==========
function TrendChart({ rounds, lines, w, h }: {
  rounds: { turn: number }[]; lines: { color: string; values: number[] }[]; w: number; h: number;
}) {
  if (rounds.length < 2) return null;
  const dataLen = rounds.length;
  const pad = { l: 34, r: 12, t: 12, b: 26 };
  const pw = w - pad.l - pad.r, ph = h - pad.t - pad.b;
  let min = Infinity, max = -Infinity;
  lines.forEach(l => l.values.forEach(v => { if (v < min) min = v; if (v > max) max = v; }));
  if (max === min) { max += 10; min -= 10; }
  const range = max - min;
  const x = (i: number) => pad.l + (i / (dataLen - 1)) * pw;
  const y = (v: number) => pad.t + ph * (1 - (v - min) / range);

  // 每 3-4 个点标一个轮次
  const labelStep = Math.max(1, Math.ceil(dataLen / 8));

  return (
    <svg width={w} height={h} className={styles.chartSvg}>
      {/* 横线 */}
      {[0, 0.25, 0.5, 0.75, 1].map(p => (
        <line key={p} x1={pad.l} x2={pad.l + pw} y1={pad.t + ph * (1 - p)} y2={pad.t + ph * (1 - p)}
          stroke="rgba(255,255,255,0.04)" strokeDasharray="2,4" />
      ))}
      {/* Y 轴标签 */}
      <text x={pad.l - 4} y={pad.t + 2} textAnchor="end" fontSize="9" fill="#555">{(min + range).toFixed(0)}</text>
      <text x={pad.l - 4} y={pad.t + ph * 0.5 + 3} textAnchor="end" fontSize="9" fill="#555">{(min + range * 0.5).toFixed(0)}</text>
      <text x={pad.l - 4} y={pad.t + ph + 2} textAnchor="end" fontSize="9" fill="#555">{min.toFixed(0)}</text>
      {/* 折线 */}
      {lines.map(line => (
        <g key={line.color}>
          <polyline points={line.values.map((v, i) => `${x(i)},${y(v)}`).join(' ')}
            fill="none" stroke={line.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          {line.values.map((v, i) => (
            <circle key={i} cx={x(i)} cy={y(v)} r="2" fill={line.color} />
          ))}
        </g>
      ))}
      {/* X 轴轮次标签 */}
      {rounds.map((r, i) => {
        if (i % labelStep !== 0 && i !== dataLen - 1) return null;
        return <text key={i} x={x(i)} y={h - 6} textAnchor="middle" fontSize="9" fill="#555">T{r.turn}</text>;
      })}
    </svg>
  );
}

// ========== 最强球队荣誉文本 ==========
function honorsText(t: BestTeam): string {
  const parts: string[] = [];
  if (t.uclTitles > 0) parts.push(`${t.uclTitles} 个欧冠`);
  if (t.uelTitles > 0) parts.push(`${t.uelTitles} 个欧联`);
  if (t.eclTitles > 0) parts.push(`${t.eclTitles} 个欧协联`);
  if (t.cupTitles > 0) parts.push(`${t.cupTitles} 个国内杯赛`);
  if (t.leagueTitles > 0) parts.push(`${t.leagueTitles} 个国内联赛`);
  if (parts.length === 0) return '暂无冠军入账';
  return parts.join(' · ');
}

// ========== 结局文案 ==========
function endingText(data: ReportData): string {
  switch (data.endedBy) {
    case 'win': return `最终，在 ${data.totalTurns} 轮的鏖战之后，你拿下了这场游戏的胜利，登顶足坛之巅。`;
    case 'bankrupt': return `最终，在第 ${data.totalTurns} 轮，你因负债累累，不幸宣告破产，退出了这片绿茵场。`;
    default: return '虽然最终未能问鼎，但你在这片绿茵场上留下的足迹，无人能够抹去。';
  }
}

// ========== 二维码小组件 ==========
function QrBlock() {
  return (
    <div className={styles.qrBox}>
      <img className={styles.qrImg} src={qrCodeSrc} alt="QR" />
      <div className={styles.qrText}>
        <span className={styles.qrLabel}>扫码即玩</span>
        <span className={styles.qrUrl}>football-monopoly.netlify.app</span>
      </div>
    </div>
  );
}

// ========== 单人报告 ==========
function PlayerReport({ data }: { data: ReportData }) {
  const ref = useRef<HTMLDivElement>(null);
  const leftInnerRef = useRef<HTMLDivElement>(null);
  const rightInnerRef = useRef<HTMLDivElement>(null);
  const [qrSide, setQrSide] = useState<'left' | 'right'>('right');
  const c = data.color;
  if (data.rounds.length === 0) return <div className={styles.report}><p className={styles.endingText}>暂无数据</p></div>;
  const final = data.rounds[data.rounds.length - 1];
  const winRate = data.totalMatches > 0 ? Math.round((data.matchesWon / data.totalMatches) * 100) : 0;

  // 测量左右列内容真实高度（内层 div 不受 flex stretch 影响）
  React.useLayoutEffect(() => {
    const left = leftInnerRef.current;
    const right = rightInnerRef.current;
    if (!left || !right) return;
    setQrSide(left.offsetHeight <= right.offsetHeight ? 'left' : 'right');
  }, [data]);

  const savePng = useCallback(async () => {
    if (!ref.current) return;
    try {
      const reportUrl = await toPng(ref.current, { backgroundColor: '#12101a', pixelRatio: 2 });
      const reportImg = await loadImage(reportUrl);

      const frameW = 40;
      const titleH = 54;
      const scale = 2;
      const rw = ref.current.offsetWidth;
      const rh = ref.current.offsetHeight;
      const cw = (rw + frameW * 2) * scale;
      const ch = (rh + frameW * 2 + titleH) * scale;

      const canvas = document.createElement('canvas');
      canvas.width = cw; canvas.height = ch;
      const ctx = canvas.getContext('2d')!;

      const bgGrad = ctx.createLinearGradient(0, 0, cw, ch);
      bgGrad.addColorStop(0, '#1a1625'); bgGrad.addColorStop(0.5, '#12101a'); bgGrad.addColorStop(1, '#151220');
      ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, cw, ch);

      ctx.strokeStyle = c + '44'; ctx.lineWidth = 3 * scale;
      ctx.strokeRect(frameW * scale * 0.6, (frameW + titleH) * scale * 0.6, (rw + frameW * 0.8) * scale, (rh + frameW * 0.8) * scale);

      ctx.strokeStyle = c; ctx.lineWidth = 1.5 * scale;
      const innerX = frameW * scale, innerY = (frameW + titleH) * scale;
      const innerW = rw * scale, innerH = rh * scale;
      ctx.strokeRect(innerX - 1 * scale, innerY - 1 * scale, innerW + 2 * scale, innerH + 2 * scale);

      const cnSize = 12 * scale;
      ctx.fillStyle = c;
      [
        [innerX - 1 * scale, innerY - 1 * scale],
        [innerX + innerW + 1 * scale, innerY - 1 * scale],
        [innerX - 1 * scale, innerY + innerH + 1 * scale],
        [innerX + innerW + 1 * scale, innerY + innerH + 1 * scale],
      ].forEach(([cx, cy]) => {
        ctx.beginPath();
        ctx.moveTo(cx, cy - cnSize); ctx.lineTo(cx + cnSize, cy);
        ctx.lineTo(cx, cy + cnSize); ctx.lineTo(cx - cnSize, cy);
        ctx.closePath(); ctx.fill();
      });

      const titleY = 20 * scale;
      ctx.fillStyle = c; ctx.font = `${14 * scale}px serif`; ctx.textAlign = 'center';
      ctx.fillText('FOOTBALL MONOPOLY', cw / 2, titleY);
      ctx.fillStyle = '#888'; ctx.font = `${10 * scale}px serif`;
      ctx.fillText('赛 后 报 告', cw / 2, titleY + 18 * scale);
      ctx.strokeStyle = c + '44'; ctx.lineWidth = 1 * scale;
      const lineY = titleY + 6 * scale;
      ctx.beginPath();
      ctx.moveTo(cw / 2 - 80 * scale, lineY); ctx.lineTo(cw / 2 - 60 * scale, lineY);
      ctx.moveTo(cw / 2 + 60 * scale, lineY); ctx.lineTo(cw / 2 + 80 * scale, lineY);
      ctx.stroke();

      ctx.drawImage(reportImg, innerX, innerY, innerW, innerH);

      ctx.fillStyle = '#444'; ctx.font = `${9 * scale}px serif`; ctx.textAlign = 'center';
      ctx.fillText('Generated by Football Monopoly · github.com/Tina079/Football-Monopoly', cw / 2, ch - 14 * scale);

      canvas.toBlob(blob => {
        if (!blob) return;
        const a = document.createElement('a');
        a.download = `${data.name}_赛后报告.png`;
        a.href = URL.createObjectURL(blob);
        a.click();
      }, 'image/png');
    } catch { alert('保存失败，请尝试截图'); }
  }, [data.name, c]);

  function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  return (<>
    <div className={styles.report} ref={ref} style={{
      '--accent': c,
      background: `linear-gradient(155deg, ${c}08 0%, ${c}03 40%, rgba(255,255,255,0.02) 100%)`,
      borderColor: `${c}22`,
    } as React.CSSProperties}>

      {/* ===== 抬头 ===== */}
      <div className={styles.head}>
        <div className={styles.headBadge} style={{ background: `linear-gradient(135deg, ${c}, ${c}88)` }}>
          {data.name[0]}
        </div>
        <div>
          <h2 className={styles.headName} style={{ color: c }}>{data.name}</h2>
          <p className={styles.headSub}>Football Monopoly · 赛后报告</p>
        </div>
        <div className={styles.headOrn}>◈</div>
      </div>

      {/* ===== 主体：双栏 ===== */}
      <div className={styles.columns}>

        {/* ===== 左栏 ===== */}
        <div className={styles.leftCol}>
          <div ref={leftInnerRef}>
          {/* 四项数据 */}
          <div className={styles.fourCards}>
            <div className={styles.fc}><span className={styles.fcLabel}>现金</span><span className={styles.fcVal} style={{color:'#5cb878'}}>{final.cash}<i>kw</i></span></div>
            <div className={styles.fc}><span className={styles.fcLabel}>存款</span><span className={styles.fcVal} style={{color:'#64b5f6'}}>{final.savings}<i>kw</i></span></div>
            <div className={styles.fc}><span className={styles.fcLabel}>负债</span><span className={styles.fcVal} style={{color:'#e94560'}}>{final.debt}<i>kw</i></span></div>
            <div className={styles.fc}><span className={styles.fcLabel}>资产</span><span className={styles.fcVal} style={{color:'#f0c060'}}>{final.propertyValue}<i>kw</i></span></div>
          </div>

          {/* 走势图 */}
          <div className={styles.chartBox}>
            <div className={styles.chartTitle}>财务走势</div>
            <div className={styles.legendRow}>
              {[{c:'#5cb878',l:'现金'},{c:'#64b5f6',l:'存款'},{c:'#e94560',l:'负债'},{c:'#f0c060',l:'资产'}].map(x => (
                <span key={x.l} className={styles.legItem}><i style={{color:x.c}}>●</i>{x.l}</span>
              ))}
            </div>
            <TrendChart rounds={data.rounds} w={290} h={160}
              lines={[
                { color: '#5cb878', values: data.rounds.map(r => r.cash) },
                { color: '#64b5f6', values: data.rounds.map(r => r.savings) },
                { color: '#e94560', values: data.rounds.map(r => r.debt) },
                { color: '#f0c060', values: data.rounds.map(r => r.propertyValue) },
              ]}
            />
          </div>

          {/* 生涯数据 */}
          <div className={styles.statsBlock}>
            <div className={styles.chartTitle}>生涯数据</div>
            <div className={styles.statGrid}>
              <div className={styles.si}><span className={styles.siVal}>{data.totalIncome}<i>kw</i></span><span className={styles.siLbl}>累计收入</span></div>
              <div className={styles.si}><span className={styles.siVal}>{data.totalSpent}<i>kw</i></span><span className={styles.siLbl}>累计消费</span></div>
              <div className={styles.si}><span className={styles.siVal}>{data.jailCount}</span><span className={styles.siLbl}>坐牢次数</span></div>
              <div className={styles.si}><span className={styles.siVal}>{data.totalMatches}<i>场</i></span><span className={styles.siLbl}>比赛场次</span></div>
              <div className={styles.si}><span className={styles.siVal}>{data.matchesWon}<i>胜</i></span><span className={styles.siLbl}>胜率 {winRate}%</span></div>
              <div className={styles.si}><span className={styles.siVal}>{data.championships}</span><span className={styles.siLbl}>冠军数</span></div>
            </div>
          </div>
          </div>

          {/* 二维码（动态摆放） */}
          {qrSide === 'left' && <QrBlock />}
        </div>

        {/* ===== 右栏 ===== */}
        <div className={styles.rightCol}>
          <div ref={rightInnerRef} className={styles.rightInner}>
          {/* 最强球队 */}
          <div className={styles.panel}>
            <div className={styles.panelTitle} style={{color:c}}>最强球队</div>
            <div className={styles.teamName}>{data.bestTeam.name}</div>
            <div className={styles.teamOvr}>平均 OVR <strong>{data.bestTeam.avgOvr}</strong></div>
            <div className={styles.teamHonors}>{honorsText(data.bestTeam)}</div>
            <div className={styles.squadList}>
              {data.bestTeam.players.map(p => (
                <div key={p.name} className={styles.sqRow}>
                  <span className={styles.sqName}>{p.name}{p.isGK ? ' 🧤' : ''}</span>
                  <span className={styles.sqOvr}>OVR {p.ovr}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 大事记 */}
          <div className={styles.panel}>
            <div className={styles.panelTitle} style={{color:c}}>大事记</div>
            <div className={styles.timeline}>
              {data.timeline.map((item, i) => (
                <div key={i} className={styles.tlRow}>
                  <span className={styles.tlMark} style={{background: `${c}44`, color: c}}>T{item.turn}</span>
                  <span className={styles.tlIcon}>{item.icon}</span>
                  <span className={styles.tlText}>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
          </div>

          {/* 二维码（动态摆放） */}
          {qrSide === 'right' && <QrBlock />}
        </div>

      </div>

      {/* ===== 底部：结局叙事 ===== */}
      <div className={styles.ending}>
        <span className={styles.endingOrn}>❦</span>
        <p className={styles.endingText}>{endingText(data)}</p>
      </div>
    </div>

    {/* ===== 保存按钮（在截图区外） ===== */}
    <button className={styles.saveBtn} onClick={savePng} style={{borderColor: `${c}33`, color: c}}>
      ⬇ 下载报告图片
    </button>
    </>
  );
}

// ========== 主组件 ==========
export default function PostGameReport({ state, onClose, playerId }: { state: GameState; onClose?: () => void; playerId?: number }) {
  const players = buildReportData(state);
  const isSingle = playerId !== undefined;
  const [idx, setIdx] = useState(isSingle ? Math.max(0, players.findIndex(p => p.id === playerId)) : 0);
  const data = players[idx];

  return (
    <div className={styles.overlay}>
      {onClose && <button className={styles.closeBtn} onClick={onClose}>✕</button>}
      <div className={styles.container}>
        <div className={styles.mainTitle}>赛后报告</div>
        {!isSingle && (
        <div className={styles.tabs}>
          {players.map((p, i) => (
            <button key={p.id} className={`${styles.tab} ${i === idx ? styles.tabOn : ''}`}
              style={i === idx ? {borderColor: p.color, background: `${p.color}15`, color: p.color} : {}}
              onClick={() => setIdx(i)}>
              <span className={styles.tabDot} style={{background: p.color}} />{p.name}
            </button>
          ))}
        </div>
        )}
        <PlayerReport data={data} />
      </div>
    </div>
  );
}
