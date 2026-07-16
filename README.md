# ⚽ 足球大富翁 / Football Monopoly

A football-themed Monopoly board game with player recruitment, team battles, league rankings, and AI opponents. Built with React + TypeScript + Vite.

一款融合球员收集、六维对战、联赛积分榜和AI机器人的足球主题大富翁棋盘游戏。

---

## 🎮 Features / 功能

- **40-tile Board** with clubs, sponsors, banks, jail, airport, training camp, youth academy, and more
- **71 Player Cards** across 4 pools (Food, Animal, Transfer Window, Youth Academy)
- **Six-Attribute Battle System** — home advantage, GK rules, golden goal, forfeit
- **5-Level League Table** — domestic league through Champions League, with trophies
- **Transfer Window** — multi-player bidding auction
- **Random Events** (9 types) — lottery, oil strike, tax audit, peak duel, etc.
- **Training Camp** — spend training points to boost player attributes
- **Resident Players** — each club gets a bound player at Level 3
- **Save/Load** (2 slots) via localStorage
- **🤖 Bot Mode** — random-choice AI with 2s visual highlight
- **Loan & Repayment** system with interest
- **Dice Animation** — 1s spinning dice in board center

---

## 🚀 Quick Start / 快速开始

```bash
cd Football-Monopoly
npm install
npm run dev
```

Open `http://localhost:5173/` in your browser.

---

## 🏗️ Tech Stack / 技术栈

| Tech | Usage |
|------|-------|
| React 18 | UI framework |
| TypeScript | Type safety |
| Vite 6 | Build tool |
| CSS Modules | Scoped styling |
| localStorage | Save/Load |

---

## 📁 Project Structure / 项目结构

```
src/
├── ai/                  # AI engine (removed, now in DiceRoller)
├── components/
│   ├── Board/           # 11×11 game board
│   ├── Cell/            # Individual tile
│   ├── DiceAnimation/   # Spinning dice overlay
│   ├── DiceRoller/      # Action bar + bot logic
│   ├── LeaguePanel/     # 5 league tables
│   ├── MatchPanel/      # Battle UI (split screen)
│   ├── PlayerCard/      # Player stat card
│   ├── PlayerToken/     # Player position marker
│   ├── SavePanel/       # Save/Load buttons
│   ├── SetupScreen/     # Game setup (players, colors, AI)
│   └── StatsPanel/      # Right sidebar (assets, players, victory conditions)
├── data/
│   ├── board.ts         # 40 tiles definition
│   └── players.ts       # 71 player cards database
├── state/
│   ├── GameContext.tsx   # React context provider
│   ├── gameReducer.ts   # Core game logic (~2500 lines)
│   └── initialState.ts  # Initial state & pools
├── utils/
│   └── gameLogic.ts     # Dice, finance, net worth
├── types.ts             # All TypeScript types
├── App.tsx
├── App.module.css
├── main.tsx
└── index.css
```

---

## 🎲 Game Rules Summary / 规则概要

### Setup
- 2–4 players (any mix of human and 🤖 bot)
- Starting cash: 10kw

### Turn Flow
Roll dice (1d6) → move → land on tile → take action → end turn

### Victory Conditions (all 3 required)
1. ☑ Capital (cash + savings − debt) ≥ 100kw
2. ☑ Own 3+ Level-5 stadiums
3. ☑ Have won a Champions League trophy

### Battle System
- Match level = defending club's stadium level
- Each side fields up to `level` players per match
- Per round: both pick 1 player → dice (1-6) selects attribute → compare values
- GK vs outfield: GK uses OVR, outfield uses rolled attribute
- Home advantage: +1 to all home player attributes
- Golden goal: tied after all rounds → sudden death
- Empty squad: remaining rounds auto-awarded to side with players

### Finance
- Savings interest: +2% per round
- Loan interest: +5% per round
- Bankruptcy: debt ≥ 50kw

### Player Growth
- Match participation: compared attribute +1
- Training camp: all 6 attributes +1 per training point

---

## 👤 Author

Built with ❤️ and Claude Code
