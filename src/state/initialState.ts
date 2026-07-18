import { GameState, LeagueTable } from '../types';
import { BOARD_CELLS } from '../data/board';
import { FOOD_PLAYERS, ANIMAL_PLAYERS, TRANSFER_PLAYERS, YOUTH_PLAYERS } from '../data/players';

export const PLAYER_COLORS = ['#ff69b4', '#f5f5f5', '#fff176', '#a0522d', '#c4a4e0', '#81c784', '#ff5f1f'];
export const PLAYER_COLOR_NAMES = ['粉', '白', '浅黄', '棕', '浅紫', '浅绿', '荧光橙'];

function createEmptyLeagueTables(playerCount: number): LeagueTable[] {
  const arr: LeagueTable[] = [{} as LeagueTable]; // index 0 dummy
  for (let level = 1; level <= 5; level++) {
    arr.push({
      level,
      entries: [],
      matchesPlayed: 0,
      matchesNeeded: 2 * playerCount,
    });
  }
  return arr;
}

export function createInitialState(): GameState {
  return {
    phase: 'setup',
    players: [],
    currentPlayerIndex: 0,
    cells: BOARD_CELLS,
    cellOwners: {},
    cellLevels: {},
    turn: 0,
    diceValue: null,
    diceAnimating: false,
    log: [],
    winner: null,

    // 球员系统
    instances: [],
    foodPool: FOOD_PLAYERS.map(p => p.id),
    animalPool: ANIMAL_PLAYERS.map(p => p.id),
    transferPool: TRANSFER_PLAYERS.map(p => p.id),
    youthPool: YOUTH_PLAYERS.map(p => p.id),

    // 对战
    matchState: null,
    peakDuel: false,

    // 转会
    transferBidState: null,

    // 联赛榜
    leagueTables: createEmptyLeagueTables(2),

    // 训练点
    trainingPoints: {},

    // 奖杯
    clubTrophies: {},
    hasUCLTitle: {},

    // 赛后报告
    snapshots: [],
    playerStats: {},
    events: [],
    bankruptTeams: {},

    pendingAction: null,
    challengeState: null,
  };
}

export function initPlayerPools() {
  return {
    foodPool: [...FOOD_PLAYERS.map(p => p.id)],
    animalPool: [...ANIMAL_PLAYERS.map(p => p.id)],
    transferPool: [...TRANSFER_PLAYERS.map(p => p.id)],
    youthPool: [...YOUTH_PLAYERS.map(p => p.id)],
    instances: [] as GameState['instances'],
    trainingPoints: {} as Record<number, number>,
    clubTrophies: {} as Record<number, GameState['clubTrophies'][number]>,
    hasUCLTitle: {} as Record<number, boolean>,
  };
}
