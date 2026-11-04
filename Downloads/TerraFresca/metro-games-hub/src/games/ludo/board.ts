/**
 * Ludo board logic: path system, safe squares, and coordinate mapping.
 */

import type { BoardState, Player } from './types';

export const MAIN_TRACK_LENGTH = 52;
export const HOME_STRETCH_LENGTH = 6;
export const FINISH_POSITION = 58;
export const BASE_POSITION = -1;

export const PLAYER_OFFSETS: Record<Player, number> = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39,
};

const SAFE_SQUARES = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

const ALL_PLAYERS: Player[] = ['red', 'green', 'yellow', 'blue'];

/**
 * Create the initial board state for Ludo.
 * Returns an empty Map since all pieces start in their bases (not on the track).
 */
export function createInitialBoard(): BoardState {
  return new Map<number, never[]>();
}

/**
 * Map a player's logical position (0-51) to an absolute track position (0-51).
 * Each player has a different starting offset on the shared main track.
 */
export function getAbsolutePosition(player: Player, logicalPos: number): number {
  return (logicalPos + PLAYER_OFFSETS[player]) % MAIN_TRACK_LENGTH;
}

/**
 * Check whether an absolute position is a safe square (no capture allowed).
 */
export function isSafeSquare(absPos: number): boolean {
  return SAFE_SQUARES.has(absPos);
}

/**
 * Get the absolute position where a player enters their home stretch.
 * This is the last cell on the main track before turning into the home column.
 * Logical position 50 maps to this entry point; logical 51 would be the first
 * home-stretch cell, but we return the main-track position just before entry.
 */
export function getHomeStretchStart(player: Player): number {
  // The home stretch entry is at logical position 51 (the last main-track cell
  // before entering home). We return its absolute position.
  return getAbsolutePosition(player, 51);
}

/**
 * Convert an absolute track position back to a player's logical position.
 * Inverse of getAbsolutePosition.
 */
export function getLogicalPosition(player: Player, absPos: number): number {
  return (absPos - PLAYER_OFFSETS[player] + MAIN_TRACK_LENGTH) % MAIN_TRACK_LENGTH;
}

/**
 * Return all four players in clockwise order.
 */
export function getAllPlayers(): Player[] {
  return [...ALL_PLAYERS];
}

/**
 * Return the next player in clockwise turn order.
 */
export function getNextPlayer(current: Player): Player {
  const index = ALL_PLAYERS.indexOf(current);
  return ALL_PLAYERS[(index + 1) % ALL_PLAYERS.length];
}
