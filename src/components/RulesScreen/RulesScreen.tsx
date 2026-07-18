import React, { useState } from 'react';
import styles from './RulesScreen.module.css';

const PAGES = [
  {
    title: '基本设置',
    content: (
      <>
        <p>《足球大富翁》是一款融合了经典大富翁与足球经理玩法的多人策略游戏。</p>
        <h4>👥 玩家</h4>
        <ul>
          <li>支持 <strong>2-4 人</strong>游戏，每位玩家选择一种颜色，可设为真人或 🤖 机器人。</li>
          <li>每位玩家起始资金 <strong>10 kw</strong>（kw 为游戏货币单位）。</li>
        </ul>
        <h4>🎲 回合制</h4>
        <ul>
          <li>玩家轮流掷 1 枚六面骰子，按点数顺时针前进。</li>
          <li>每经过起点一次，获得 <strong>5 kw</strong> 资金。</li>
        </ul>
        <h4>🗺️ 棋盘</h4>
        <ul>
          <li>40 格环形棋盘，包含 <strong>23 座球场</strong>、5 个赞助商、银行、监狱、机场、转会窗、训练营、青训学院、街头足球、随机事件等。</li>
          <li>每座球场属于五大联赛之一：英超、德甲、西甲、意甲、法甲。</li>
        </ul>
        <h4>🏦 银行系统</h4>
        <ul>
          <li>到达银行格时可进行存款、取款、贷款、还款操作。</li>
          <li>存款每轮获得 <strong>2% 利息</strong>，贷款每轮产生 <strong>5% 利息</strong>。</li>
        </ul>
      </>
    ),
  },
  {
    title: '地产与球员交易',
    content: (
      <>
        <h4>🏟️ 购买球场</h4>
        <ul>
          <li>走到无人持有的球场格时，可以 <strong>2 kw</strong> 购买该球场。</li>
          <li>球场分为 <strong>5 个等级</strong>，升级费用依次为：3kw → 4kw → 5kw → 10kw。</li>
          <li>球场等级决定了可容纳的球员数量（容量 = 等级）、比赛等级和参观费收入。</li>
        </ul>
        <h4>🏪 赞助商</h4>
        <ul>
          <li>赞助商格可购买，他人停留时需支付 <strong>购买价 × 2</strong> 的费用。</li>
        </ul>
        <h4>⚽ 球员系统</h4>
        <ul>
          <li>71 名球员可供获取：街头足球（半价购买）、转会窗竞拍、青训学院盲盒（5kw）。</li>
          <li>每位球员有 6 维属性：速度、射门、传球、盘带、防守、身体，以及 OVR 综合评价。</li>
          <li>球场升至 <strong>Lv3</strong> 时自动获得一名驻守球员。</li>
          <li>球场降级可能导致球员溢出，需转会或释放。</li>
          <li>到达训练营可花费训练点数提升球员属性（每点全维度 +1，上限 OVR 100）。</li>
        </ul>
        <h4>💸 参观费</h4>
        <ul>
          <li>走到他人的球场或赞助商格时，需支付参观费（球场等级越高越贵）。</li>
        </ul>
      </>
    ),
  },
  {
    title: '对决与比赛积分',
    content: (
      <>
        <h4>⚔️ 挑战对决</h4>
        <ul>
          <li>走到他人的球场时，可选择<strong>支付参观费</strong>或<strong>发起挑战</strong>。</li>
          <li><strong>Lv1-2 球场</strong>只能接受<strong>同一联赛</strong>球队的挑战；<strong>Lv3 及以上</strong>球场可被任意联赛球队挑战。</li>
          <li>挑战为双方球场球员的 6 维属性对决。掷骰子决定比拼哪一维属性，数值高者胜。</li>
          <li>比赛级别（国内联赛、国内杯赛、欧协联、欧联、欧冠）= <strong>主场球场等级</strong>，级别决定比赛轮次。</li>
          <li>主场球队有 <strong>+1</strong> 属性加成优势。门将只比 OVR，不比单项。</li>
          <li>挑战成功：<strong>免费参观</strong>。挑战失败：<strong>支付双倍参观费</strong>。</li>
          <li>常规轮次打完后如平局，进入<strong>金球决胜</strong>（突然死亡，先得分者胜）。</li>
        </ul>
        <h4>📊 联赛积分</h4>
        <ul>
          <li>每场比赛的结果计入对应等级的联赛积分榜。</li>
          <li>积分规则：常规胜 <strong>3 分</strong>，金球胜 <strong>2 分</strong>，金球负 <strong>1 分</strong>，常规负 0 分。</li>
          <li>联赛共 5 级：国内联赛 → 国内杯赛 → 欧协联 → 欧联 → 欧冠。</li>
          <li>每级联赛打满 <strong>2N 场</strong>（N = 玩家数）后结算，冠军获得奖金 + 奖杯，亚军获得一半奖金。</li>
        </ul>
        <h4>⚡ 巅峰对决</h4>
        <ul>
          <li>随机事件可触发巅峰对决，选择一名对手进行比赛。</li>
          <li>比赛级别 = <strong>被挑战者球场等级</strong>，胜者获得 <strong>5 kw</strong> 奖金。</li>
        </ul>
      </>
    ),
  },
  {
    title: '胜利和破产条件',
    content: (
      <>
        <h4>🏆 胜利条件</h4>
        <p>满足以下<strong>任一</strong>条件即获胜：</p>
        <ol>
          <li><strong>大富翁胜利</strong>：同时满足 —— 资金（现金 + 存款 − 负债）≥ <strong>100 kw</strong>、拥有至少 <strong>3 座 Lv5 现代化球场</strong>、曾赢得 <strong>欧冠冠军</strong>（Lv5 联赛冠军）。</li>
          <li><strong>生存胜利</strong>：当场上只剩 <strong>1 名</strong>未破产玩家时，该玩家直接获胜。</li>
        </ol>

        <h4>💀 破产条件</h4>
        <ul>
          <li>负债达到 <strong>50 kw</strong> 时强制破产。</li>
          <li>破产后所有地产清空、球员回池、资金归零。</li>
        </ul>

        <h4>🎲 随机事件</h4>
        <ul>
          <li>棋盘上有<strong>随机事件格</strong>，可能触发：刮彩票、挖石油、特大丑闻、球场漏水、燃放焰火罚款、车水马龙增收、巅峰对决、税务稽查等。</li>
        </ul>

        <h4>🍀 绝处逢生</h4>
        <ul>
          <li>走到<strong>绝处逢生</strong>格时：若有负债则<strong>全部清零</strong>；若无负债则触发财政公平，最富玩家向最穷玩家转移资金。</li>
        </ul>

        <h4>✈️ 其他设施</h4>
        <ul>
          <li><strong>机场</strong>：可飞往自己的任意地产。</li>
          <li><strong>监狱</strong>：停留 2 回合，无法行动。</li>
        </ul>
      </>
    ),
  },
];

export default function RulesScreen({ onClose }: { onClose: () => void }) {
  const [page, setPage] = useState(0);
  const isLast = page === PAGES.length - 1;

  return (
    <div className={styles.overlay}>
      <button className={styles.closeBtn} onClick={onClose}>✕</button>
      <div className={styles.card}>
        <h1 className={styles.title}>📖 游戏规则</h1>
        <div className={styles.progress}>
          {PAGES.map((_, i) => (
            <span key={i} className={`${styles.dot} ${i === page ? styles.dotActive : ''} ${i < page ? styles.dotDone : ''}`} />
          ))}
        </div>
        <h2 className={styles.pageTitle}>{PAGES[page].title}</h2>
        <div className={styles.body}>{PAGES[page].content}</div>
        <div className={styles.btns}>
          {page > 0 && (
            <button className={styles.btn} onClick={() => setPage(page - 1)}>上一步</button>
          )}
          <div style={{ flex: 1 }} />
          {isLast ? (
            <button className={styles.btnPrimary} onClick={onClose}>返回首页</button>
          ) : (
            <button className={styles.btnPrimary} onClick={() => setPage(page + 1)}>下一步 →</button>
          )}
        </div>
        <p className={styles.counter}>{page + 1} / {PAGES.length}</p>
      </div>
    </div>
  );
}
