/**
 * Tests for checker-piece SVG sprite template.
 */

import { generateCheckerPiece } from '../templates/checker-piece.svg';

const TEST_PALETTE = ['#000000', '#FFFFFF'];

describe('generateCheckerPiece', () => {
  it('returns valid SVG string', () => {
    const svg = generateCheckerPiece(42, TEST_PALETTE);
    expect(svg).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    expect(svg).toContain('</svg>');
    expect(svg).toContain('width="32"');
    expect(svg).toContain('height="32"');
  });

  it('uses white player colors when player is white', () => {
    const svg = generateCheckerPiece(1, TEST_PALETTE, { player: 'white' });
    expect(svg).toContain('#F0E0C0'); // main color
    expect(svg).toContain('#C0B090'); // shadow color
  });

  it('uses black player colors when player is black', () => {
    const svg = generateCheckerPiece(1, TEST_PALETTE, { player: 'black' });
    expect(svg).toContain('#A03020'); // main color
    expect(svg).toContain('#702010'); // shadow color
  });

  it('includes selection highlight ring when isSelected is true', () => {
    const svg = generateCheckerPiece(1, TEST_PALETTE, { isSelected: true });
    expect(svg).toContain('#FFD700');
    expect(svg).toContain('stroke-width="2"');
  });

  it('does not include selection highlight ring when isSelected is false', () => {
    const svg = generateCheckerPiece(1, TEST_PALETTE, { isSelected: false });
    expect(svg).not.toContain('stroke-width="2"');
  });

  it('includes crown rectangles when isKing is true', () => {
    const svg = generateCheckerPiece(1, TEST_PALETTE, { isKing: true });
    // Crown has 3 rectangles with gold fill
    const rectMatches = svg.match(/<rect[^>]*fill="#FFD700"[^>]*>/g);
    expect(rectMatches).not.toBeNull();
    expect(rectMatches!.length).toBe(3);
  });

  it('does not include crown when isKing is false', () => {
    const svg = generateCheckerPiece(1, TEST_PALETTE, { isKing: false });
    const rectMatches = svg.match(/<rect[^>]*fill="#FFD700"[^>]*>/g);
    expect(rectMatches).toBeNull();
  });

  it('produces deterministic output for same seed', () => {
    const svg1 = generateCheckerPiece(123, TEST_PALETTE, { player: 'white' });
    const svg2 = generateCheckerPiece(123, TEST_PALETTE, { player: 'white' });
    expect(svg1).toBe(svg2);
  });

  it('produces different output for different seeds', () => {
    const svg1 = generateCheckerPiece(1, TEST_PALETTE, { player: 'white' });
    const svg2 = generateCheckerPiece(2, TEST_PALETTE, { player: 'white' });
    expect(svg1).not.toBe(svg2);
  });

  it('uses palette colors for outline and highlight', () => {
    const customPalette = ['#FF0000', '#00FF00'];
    const svg = generateCheckerPiece(1, customPalette, { player: 'white' });
    expect(svg).toContain('#FF0000'); // outline from palette[0]
    expect(svg).toContain('#00FF00'); // highlight from palette[1]
  });
});
