# Cobras e Escadas — Design Spec

**Date:** 2026-11-04
**Status:** Draft
**Parent Plan:** Metro Games Hub — Game Implementation Series

## Overview

Cobras e Escadas (Snakes and Ladders) é o primeiro jogo a ser implementado após a fundação do Metro Games Hub. Serve como validação end-to-end do sistema `GameModule`, integrando com `PixelRenderer`, `SpriteGenerator`, `AudioManager` e o sistema de navegação já criado.

## Game Rules

### Board Layout
- **Grid:** 10x10 (100 casas numeradas de 1 a 100)
- **Layout serpenteante:** Casa 1 no canto inferior-esquerdo, casa 100 no canto superior-esquerdo
  - Linha 1 (casas 1-10): esquerda → direita
  - Linha 2 (casas 11-20): direita → esquerda
  - Linha 3 (casas 21-30): esquerda → direita
  - ... e assim por diante alternando direção

### Cobras (Snakes)
- **Quantidade:** 8 cobras
- **Função:** Quando um peão termina seu movimento na cabeça da cobra, desliza até a cauda (movimento descendente)
- **Posicionamento:** Definido proceduralmente via seed, mas com restrições:
  - Cabeça nunca está na casa 100 (impossível vencer por cobra)
  - Cauda nunca está na casa 1 (impossível começar por cobra)
  - Cobra não pode conectar duas casas adjacentes (mínimo 5 casas de distância)

### Escadas (Ladders)
- **Quantidade:** 8 escadas
- **Função:** Quando um peão termina seu movimento na base da escada, sobe até o topo (movimento ascendente)
- **Posicionamento:** Definido proceduralmente via seed, mas com restrições:
  - Base nunca está na casa 100 (impossível subir no final)
  - Topo nunca está na casa 1 (impossível começar por escada)
  - Escada não pode conectar duas casas adjacentes (mínimo 5 casas de distância)

### Movimento
- **Dado:** 1 dado de 6 faces (1-6)
- **Turno:** Jogador rola o dado, move seu peão o número correspondente de casas
- **Direção:** Sempre em direção à casa 100 (nunca retrocede, exceto por cobras)
- **Vitória:** Jogador que alcançar exatamente a casa 100 vence
  - Se o dado resultar em número que ultrapassa 100, o peão permanece no lugar (não move)
  - Exemplo: peão na casa 97, dado mostra 5 → não move (precisaria de exatamente 3)

### Jogadores
- **Modo:** 2-4 jogadores locais (mesmo dispositivo, turnos alternados)
- **Peões:** Cada jogador tem um peão de cor diferente
- **Colisão:** Múltiplos peões podem ocupar a mesma casa simultaneamente

## Technical Integration

### GameModule Implementation
```typescript
const CobrasEscadasModule: GameModule = {
  metadata: {
    id: 'cobras-escadas',
    name: 'Cobras e Escadas',
    iconSeed: 20, // seed para SpriteGenerator gerar ícone do hub
    minPlayers: 2,
    maxPlayers: 4,
    type: 'turn-based'
  },
  Component: CobrasEscadasGame,
  cleanup: () => {
    // Limpar timers de animação, subscriptions de áudio, etc.
  }
};
```

### Rendering (PixelRenderer)
- **Tabuleiro:** 480x480px (10x10 grid, cada casa 48x48px)
- **Peões:** 32x32px cada, posicionados no centro da casa
- **Cobras:** SVG procedural via SpriteGenerator, renderizado como overlay no tabuleiro
- **Escadas:** SVG procedural via SpriteGenerator, renderizado como overlay no tabuleiro
- **Dado:** Componente `DiceRoller` com animação estilo Baldur's Gate 3 (ver seção abaixo)
- **Animações:**
  - Rolagem de dado: animação 3D-style com rotação multi-eixo + desaceleração progressiva (ver DiceRoller spec)
  - Movimento do peão: 0.3s por casa (interpolação linear entre centros das casas)
  - Subida de escada: 0.5s de transição vertical
  - Descida de cobra: 0.5s de transição vertical

### DiceRoller — Animação Estilo Baldur's Gate 3

O dado é um componente visual independente (`src/games/cobras-escadas/DiceRoller.tsx`) que simula a experiência tátil e visual do dado de Baldur's Gate 3, adaptada para 2D pixel art.

**Comportamento:**
1. **Estado idle:** Dado mostra a última face rolada (ou face 1 no início). Leve efeito de "breathing" (pulsação sutil de escala 1.0→1.02→1.0 em loop de 2s) para indicar interatividade.
2. **Trigger de rolagem:** Ao clicar/tocar no dado ou no botão "Rolar", inicia a animação. SFX `dice-roll` toca imediatamente.
3. **Fase de rotação (0.8s):** Dado gira rapidamente com rotação simulada em 2D usando sequenciação de faces. A cada ~80ms, a face exibida muda aleatoriamente (usando PRNG seeded), criando efeito de "tumbling". A velocidade de troca desacelera progressivamente (ease-out).
4. **Fase de landing (0.3s):** Última troca de face → resultado final. Pequeno bounce (scale 1.0→1.15→1.0 em 0.3s ease-out) para dar peso tátil ao resultado. SFX `dice-land` (click curto e satisfatório) toca no momento do landing.
5. **Estado resultado:** Face final permanece visível até o próximo turno. Glow sutil na cor do jogador atual ao redor do dado.

**Especificações técnicas:**
- **Dimensões:** 96x96px (maior que o spec original de 64px para permitir detalhes da animação)
- **Faces:** 6 sprites SVG via SpriteGenerator (`dice-face` template), cada um 96x96px
- **Animação:** Implementada via `requestAnimationFrame` com easing functions puras (sem dependência de Animated API do RN para compatibilidade com Skia)
- **Integração com state machine:** O componente recebe `onRollComplete: (value: number) => void` como prop. A animação é puramente visual — o valor do dado já foi determinado pela state machine antes da animação começar. O callback é chamado ao fim da fase de landing.
- **Acessibilidade:** `accessibilityLabel` dinâmico ("Dado mostrando {valor}") + `accessibilityHint` ("Toque para rolar")

**Integração com GameState:**
- A fase `'rolling'` é restaurada no state machine como estado transitório entre `'waiting-roll'` e `'moving'`
- Fluxo: `waiting-roll` → (usuário clica) → `rolling` (animação começa, valor já determinado) → (animação termina) → `moving`
- O valor do dado é determinado no momento da transição para `rolling`, não no fim da animação

### Audio (AudioManager)
- **Música de fundo:** Loop de música de tabuleiro (calma, estratégica)
- **SFX:**
  - `dice-roll`: Som de dado rolando (0.5s)
  - `pawn-move`: Som de peça movendo (0.2s por casa)
  - `snake-slide`: Som de descida por cobra (0.5s, tom descendente)
  - `ladder-climb`: Som de subida por escada (0.5s, tom ascendente)
  - `victory`: Fanfarra de vitória (2s)

### Sprite Templates (SpriteGenerator)
- `board-cell`: Casa individual do tabuleiro (48x48px) com variação de cor
- `pawn`: Peão de jogador (32x32px) com parâmetro de cor (4 cores: vermelho, azul, verde, amarelo)
- `dice-face`: Face do dado (64x64px) com pontos de 1 a 6
- `snake`: Cobra completa (SVG com cabeça, corpo serpenteante, cauda) — seed define forma e cor
- `ladder`: Escada completa (SVG com degraus e cordas laterais) — seed define forma e cor

### State Management
```typescript
interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  boardConfig: BoardConfig;
  phase: 'waiting-roll' | 'rolling' | 'moving' | 'snake-ladder' | 'game-over';
  winner: number | null; // índice do jogador vencedor
}

interface Player {
  id: number;
  position: number; // 1-100
  color: 'red' | 'blue' | 'green' | 'yellow';
}

interface BoardConfig {
  snakes: Record<number, number>; // { cabeça: cauda }
  ladders: Record<number, number>; // { base: topo }
}
```

### UI Layout (Landscape)
```
┌─────────────────────────────────────────────────────────┐
│  Player 1 (red)    Player 2 (blue)    Player 3 (green)  │
│  House: 45         House: 67          House: 23         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│                    [10x10 Board]                        │
│                    480x480px                            │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  Player 4 (yellow)         [ROLL DICE]                  │
│  House: 89                 [64x64px]                    │
└─────────────────────────────────────────────────────────┘
```

## Acceptance Criteria

### Gameplay
- [ ] 2-4 jogadores podem participar em turnos alternados
- [ ] Dado rola e mostra resultado de 1-6
- [ ] Peão move corretamente o número de casas indicado pelo dado
- [ ] Cobra transporta peão da cabeça para a cauda
- [ ] Escada transporta peão da base para o topo
- [ ] Jogo termina quando um jogador alcança exatamente a casa 100
- [ ] Jogador que ultrapassa 100 não move (permanece no lugar)
- [ ] Tela de vitória mostra o jogador vencedor e botão "Jogar Novamente"

### Visual
- [ ] Tabuleiro 10x10 renderizado com PixelRenderer (Skia ou GL)
- [ ] Peões de 4 cores diferentes visíveis no tabuleiro
- [ ] Cobras e escadas renderizadas como overlays no tabuleiro
- [ ] Animações suaves de movimento, subida e descida
- [ ] Dado renderizado fora do tabuleiro com animação de rolagem

### Audio
- [ ] Música de fundo toca em loop durante o jogo
- [ ] SFX de rolagem de dado toca ao clicar no botão
- [ ] SFX de movimento toca a cada casa percorrida
- [ ] SFX de cobra/escada toca ao ativar esses elementos
- [ ] SFX de vitória toca ao final do jogo
- [ ] Todos os áudios respeitam o volume global e mute/unmute

### Integration
- [ ] Jogo registrado via `GameRegistry.register()`
- [ ] Ícone do jogo aparece no MetroHub com sprite gerado via SpriteGenerator
- [ ] Navegação do hub para o jogo e retorno funciona corretamente
- [ ] Cleanup é chamado ao sair do jogo (timers, áudio, listeners)
- [ ] Rotação do dispositivo para portrait mostra RotationPrompt

## Non-Goals (Out of Scope)

- Multiplayer online (apenas local no mesmo dispositivo)
- IA para jogar sozinho (sempre requer 2+ jogadores humanos)
- Salvar/carregar estado do jogo (sessão única)
- Customização de regras (tamanho do tabuleiro, número de cobras/escadas)
- Power-ups ou mecânicas especiais além das regras clássicas

## Risk Analysis

1. **Animações de movimento podem parecer travadas** — Mitigação: usar `requestAnimationFrame` com interpolação linear entre centros das casas, não salto discreto
2. **Cobras/escadas geradas proceduralmente podem se sobrepor visualmente** — Mitigação: validar no gerador que nenhuma cobra/escada compartilha a mesma casa de início ou fim
3. **Áudio pode não sincronizar perfeitamente com animações** — Mitigação: tocar SFX no início da animação, não no fim
4. **Layout em landscape pode não caber bem em dispositivos pequenos** — Mitigação: usar escala dinâmica baseada no tamanho da tela, mantendo aspect ratio do tabuleiro