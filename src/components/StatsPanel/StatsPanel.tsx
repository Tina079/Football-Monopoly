import React, { useState } from 'react';
import { useGame } from '../../state/GameContext';
import { fmtMoney, calcCapital, calcAssets, WIN_CAPITAL, BANKRUPT_DEBT } from '../../utils/gameLogic';
import { ALL_PLAYERS } from '../../data/players';
import PostGameReport from '../PostGameReport/PostGameReport';
import styles from './StatsPanel.module.css';

export default function StatsPanel() {
  const { state } = useGame();
  const { players, currentPlayerIndex, cellLevels, instances, clubTrophies, trainingPoints } = state;
  const [reportPid, setReportPid] = useState<number | null>(null);

  return (<>
    <div className={styles.panel}>
      <div className={styles.section}>
        <h3 className={styles.heading}>📊 玩家资产</h3>
        {players.map((p, i) => {
          if (p.isBankrupt) {
            return (
              <div key={p.id} className={`${styles.playerCard} ${styles.bankrupt}`}>
                <div className={styles.playerHeader}>
                  <span className={styles.dot} style={{ backgroundColor: p.color, opacity: 0.3 }} />
                  <span className={styles.playerName} style={{ opacity: 0.5 }}>{p.name}</span>
                  <span className={styles.badgeBankrupt}>💀 第{p.bankruptTurn || state.turn}轮破产</span>
                  <button className={styles.reportMiniBtn} onClick={(e) => { e.stopPropagation(); setReportPid(p.id); }}>报告</button>
                </div>
              </div>
            );
          }
          const capital = calcCapital(p.cash, p.savings, p.debt);
          const assets = calcAssets(p.properties, cellLevels, state.cells);
          const isCurrent = i === currentPlayerIndex && !p.isBankrupt;

          const winPct = Math.min(100, Math.max(0, (capital / WIN_CAPITAL) * 100));
          const failPct = Math.min(100, Math.max(0, (p.debt / BANKRUPT_DEBT) * 100));

          // 胜利条件检查
          const lv5Count = Object.entries(state.cellOwners)
            .filter(([cid, oid]) => oid === p.id && (state.cellLevels[parseInt(cid)] || 0) >= 5).length;
          const hasLv5 = lv5Count >= 3;
          const hasUCL = state.hasUCLTitle?.[p.id] === true;

          return (
            <div
              key={p.id}
              className={`${styles.playerCard} ${isCurrent ? styles.active : ''} ${p.isBankrupt ? styles.bankrupt : ''}`}
            >
              {/* 头部 */}
              <div className={styles.playerHeader}>
                <span className={styles.dot} style={{ backgroundColor: p.color }} />
                <span className={styles.playerName}>{p.name}</span>
                {isCurrent && <span className={styles.badge}>当前</span>}
                {p.isAI && (
                  <span className={styles.badgeAI}>
                    {i === currentPlayerIndex && !p.isBankrupt ? '🤖 思考中...' : '🤖'}
                  </span>
                )}
                {p.isBankrupt && <span className={styles.badgeBankrupt}>破产</span>}
                {p.jailTurns > 0 && <span className={styles.badgeJail}>🔒{p.jailTurns}</span>}
              </div>

              {/* 净值大字 */}
              <div className={`${styles.netWorthBig} ${capital >= 0 ? styles.positive : styles.negative}`}>
                {fmtMoney(capital)}
              </div>
              <div className={styles.netWorthLabel}>资金</div>

              {/* 胜利进度条 */}
              <div className={styles.barRow}>
                <span className={styles.barIcon}>🏆</span>
                <span className={styles.barLabel}>资金</span>
                <div className={styles.barTrack}>
                  <div
                    className={styles.barFillWin}
                    style={{ width: `${winPct}%`, backgroundColor: p.color }}
                  />
                </div>
                <span className={styles.barNum}>{winPct.toFixed(0)}%</span>
              </div>

              {/* 失败进度条 */}
              <div className={styles.barRow}>
                <span className={styles.barIcon}>💀</span>
                <span className={styles.barLabel}>破产</span>
                <div className={styles.barTrack}>
                  <div className={styles.barFillFail} style={{ width: `${failPct}%` }} />
                </div>
                <span className={styles.barNum}>{failPct.toFixed(0)}%</span>
              </div>

              {/* 胜利条件 */}
              <div className={styles.winConds}>
                <span className={capital >= WIN_CAPITAL ? styles.condDone : styles.condTodo}>
                  {capital >= WIN_CAPITAL ? '☑' : '☐'} 资金≥100kw
                </span>
                <span className={hasLv5 ? styles.condDone : styles.condTodo}>
                  {hasLv5 ? '☑' : '☐'} 3座五级 ({lv5Count}/3)
                </span>
                <span className={hasUCL ? styles.condDone : styles.condTodo}>
                  {hasUCL ? '☑' : '☐'} 欧冠冠军
                </span>
              </div>

              {/* 详细统计 */}
              <div className={styles.stats}>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>现金</span>
                  <span className={styles.statValue}>{fmtMoney(p.cash)}</span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>存款</span>
                  <span className={`${styles.statValue} ${p.savings > 0 ? styles.positive : ''}`}>
                    {fmtMoney(p.savings)}
                  </span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>负债</span>
                  <span className={`${styles.statValue} ${p.debt > 0 ? styles.debt : ''}`}>
                    {fmtMoney(p.debt)}
                  </span>
                </div>
                <div className={styles.stat}>
                  <span className={styles.statLabel}>资产</span>
                  <span className={`${styles.statValue} ${assets > 0 ? styles.positive : ''}`}>
                    {fmtMoney(assets)}
                  </span>
                </div>
              </div>

              {/* 地产列表 */}
              <div className={styles.propertyList}>
                {p.properties.map(cid => {
                  const cell = state.cells[cid];
                  const isSponsor = cell.type === 'sponsor';
                  const level = cellLevels[cid];
                  const clubPlayers = instances.filter(inst => inst.clubId === cid);
                  const trophyCount = clubTrophies[cid]?.total || 0;
                  return (
                    <span key={cid} className={styles.propertyTag} style={{ borderColor: p.color }}>
                      {cell.name}{!isSponsor && level ? ` Lv${level}` : ''}
                      {trophyCount > 0 && ` 🏆×${trophyCount}`}
                      {clubPlayers.length > 0 && (
                        <span className={styles.playerMiniList}>
                          {clubPlayers.map(inst => {
                            const card = ALL_PLAYERS.find(c => c.id === inst.cardId);
                            return card ? ` ${card.name}` : '';
                          }).join(',')}
                        </span>
                      )}
                    </span>
                  );
                })}
                {p.properties.length === 0 && (
                  <span className={styles.noProperty}>暂无地产</span>
                )}
              </div>

              {/* 训练点 */}
              {trainingPoints[p.id] > 0 && (
                <div className={styles.tpRow}>
                  <span className={styles.tpLabel}>🎯 训练点</span>
                  <span className={styles.tpVal}>{trainingPoints[p.id]}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 球场等级参考 */}
      <div className={styles.section}>
        <h3 className={styles.heading}>🏟️ 球场等级参考</h3>
        <table className={styles.refTable}>
          <thead>
            <tr>
              <th>等级</th>
              <th>名称</th>
              <th>费用</th>
              <th>可参加</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>★</td><td>社区球场</td><td>2kw</td><td>国内联赛</td></tr>
            <tr><td>★★</td><td>初级球场</td><td>3kw</td><td>国内杯赛</td></tr>
            <tr><td>★★★</td><td>中级球场</td><td>4kw</td><td>欧协联</td></tr>
            <tr><td>★★★★</td><td>高级球场</td><td>5kw</td><td>欧联</td></tr>
            <tr><td>★★★★★</td><td>现代化球场</td><td>10kw</td><td>欧冠</td></tr>
          </tbody>
        </table>
        <div className={styles.refNote}>费用 = 购买/升级/参观费/比赛日收入（挑战失败费用×2）</div>
      </div>

    </div>
    {reportPid !== null && <PostGameReport state={state} playerId={reportPid} onClose={() => setReportPid(null)} />}
  </>
  );
}
