import Phaser from 'phaser';
import { CREATURE_COLOURS, EFFECTS, HEALTH_BAR } from '../config';
import { healthLevel } from '../logic/combat';

/** A comic-book word like "BONK!" that pops up and floats away. */
export function popWord(scene: Phaser.Scene, x: number, y: number, word: string): void {
  const colour = Phaser.Utils.Array.GetRandom([...CREATURE_COLOURS]) as number;
  const text = scene.add
    .text(x, y, word, {
      fontSize: EFFECTS.wordFontSize,
      fontStyle: 'bold',
      color: Phaser.Display.Color.IntegerToColor(colour).rgba,
      stroke: EFFECTS.wordStroke,
      strokeThickness: 5,
    })
    .setOrigin(0.5)
    .setScale(0)
    .setAngle(Phaser.Math.Between(-18, 18))
    .setDepth(10);
  scene.tweens.add({
    targets: text,
    scale: 1,
    duration: EFFECTS.wordMs * 0.35,
    ease: 'Back.easeOut',
    onComplete: () => {
      scene.tweens.add({
        targets: text,
        y: y - 30,
        alpha: 0,
        duration: EFFECTS.wordMs * 0.65,
        onComplete: () => text.destroy(),
      });
    },
  });
}

/** Little stars flying out in every direction. */
export function burstStars(scene: Phaser.Scene, x: number, y: number): void {
  for (let i = 0; i < EFFECTS.stars; i++) {
    const star = scene.add.graphics({ x, y }).setDepth(9);
    star.fillStyle(EFFECTS.starColour);
    star.fillPoints(starPoints(EFFECTS.starSize), true);
    const angle = (i / EFFECTS.stars) * Math.PI * 2 + Math.random() * 0.5;
    const distance = EFFECTS.starFlyDistance * (0.6 + Math.random() * 0.6);
    scene.tweens.add({
      targets: star,
      x: x + Math.cos(angle) * distance,
      y: y + Math.sin(angle) * distance,
      angle: Phaser.Math.Between(-360, 360),
      scale: 0.3,
      alpha: 0,
      duration: EFFECTS.starMs,
      ease: 'Cubic.easeOut',
      onComplete: () => star.destroy(),
    });
  }
}

/** A red "-12" rising from a creature's head. */
export function floatNumber(scene: Phaser.Scene, x: number, y: number, amount: number): void {
  const text = scene.add
    .text(x, y, `-${Math.round(amount)}`, {
      fontSize: EFFECTS.numberFontSize,
      fontStyle: 'bold',
      color: EFFECTS.numberColour,
    })
    .setOrigin(0.5)
    .setDepth(10);
  scene.tweens.add({
    targets: text,
    y: y - EFFECTS.numberRise,
    alpha: 0,
    duration: EFFECTS.numberMs,
    ease: 'Cubic.easeOut',
    onComplete: () => text.destroy(),
  });
}

/** Squash flat for a moment, then spring back. */
export function squash(
  scene: Phaser.Scene,
  art: Phaser.GameObjects.Graphics,
  amount: { x: number; y: number; ms: number },
): void {
  scene.tweens.killTweensOf(art);
  art.setScale(amount.x, amount.y).setAlpha(0.5);
  scene.tweens.add({
    targets: art,
    scaleX: 1,
    scaleY: 1,
    alpha: 1,
    duration: amount.ms * 2,
    ease: 'Elastic.easeOut',
  });
}

/** Spin, shrink and vanish in a puff of smoke; a tiny ghost floats up. */
export function poof(
  scene: Phaser.Scene,
  body: Phaser.GameObjects.Container,
  centre: { x: number; y: number },
): void {
  scene.tweens.add({
    targets: body,
    angle: body.angle + 540,
    scale: 0,
    alpha: 0,
    duration: EFFECTS.dieMs,
    ease: 'Back.easeIn',
    onComplete: () => body.destroy(),
  });
  for (let i = 0; i < EFFECTS.puffs; i++) {
    const puff = scene.add
      .circle(centre.x, centre.y, Phaser.Math.Between(6, 12), EFFECTS.puffColour)
      .setDepth(9);
    const angle = (i / EFFECTS.puffs) * Math.PI * 2;
    scene.tweens.add({
      targets: puff,
      x: centre.x + Math.cos(angle) * 40,
      y: centre.y + Math.sin(angle) * 30,
      scale: 2,
      alpha: 0,
      delay: EFFECTS.dieMs * 0.6,
      duration: EFFECTS.puffMs,
      ease: 'Cubic.easeOut',
      onComplete: () => puff.destroy(),
    });
  }
  const ghost = scene.add
    .text(centre.x, centre.y, '👻', { fontSize: '28px' })
    .setOrigin(0.5)
    .setAlpha(0)
    .setDepth(10);
  scene.tweens.add({
    targets: ghost,
    y: centre.y - EFFECTS.ghostRise,
    alpha: { from: 1, to: 0 },
    x: { from: centre.x - 8, to: centre.x + 8 },
    delay: EFFECTS.dieMs * 0.6,
    duration: EFFECTS.ghostMs,
    ease: 'Sine.easeInOut',
    onComplete: () => ghost.destroy(),
  });
}

/** An energy bar centred above a creature's head. */
export function drawHealthBar(
  bar: Phaser.GameObjects.Graphics,
  x: number,
  headY: number,
  health: number,
  maxHealth: number,
): void {
  const { width, height, gap, colours } = HEALTH_BAR;
  const left = x - width / 2;
  const top = headY - gap - height;
  const fill = Math.max(0, Math.min(1, health / maxHealth));
  bar.clear();
  bar.fillStyle(colours.back);
  bar.fillRect(left, top, width, height);
  bar.fillStyle(colours[healthLevel(health, maxHealth)]);
  bar.fillRect(left, top, width * fill, height);
  bar.lineStyle(1, colours.edge);
  bar.strokeRect(left, top, width, height);
}

function starPoints(radius: number): Phaser.Math.Vector2[] {
  return Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 === 0 ? radius : radius * 0.45;
    const angle = (i / 10) * Math.PI * 2 - Math.PI / 2;
    return new Phaser.Math.Vector2(Math.cos(angle) * r, Math.sin(angle) * r);
  });
}
