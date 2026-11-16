// Keyboard and pointer input. Held keys are read every frame; one-shot presses (confirm,
// pause, restart, mute, hint, next) are queued as bit flags and taken once by the loop, so a
// press between two frames is never lost and never counted twice. Pointer drags aim the
// slingshot; a plain click is also a confirm (for buttons, handled by main.js).
import { FIELD } from './config.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_RESTART = 4;
export const ACTION_MUTE = 8;
export const ACTION_HINT = 16;
export const ACTION_NEXT = 32;

const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const RESTART = new Set(['KeyR']);
const MUTE = new Set(['KeyM']);
const HINT = new Set(['KeyH']);
const NEXT = new Set(['KeyN']);

export function createInput(canvas) {
  let actions = 0;
  let aiming = false;
  let pointer = { x: 0, y: 0 };
  let downAt = { x: 0, y: 0 };
  let clicked = false;
  let clickAt = { x: 0, y: 0 };

  function toField(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = FIELD.width / rect.width;
    const scaleY = FIELD.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }

  window.addEventListener('keydown', (event) => {
    if (CONFIRM.has(event.code)) actions |= ACTION_CONFIRM;
    else if (PAUSE.has(event.code)) actions |= ACTION_PAUSE;
    else if (RESTART.has(event.code)) actions |= ACTION_RESTART;
    else if (MUTE.has(event.code)) actions |= ACTION_MUTE;
    else if (HINT.has(event.code)) actions |= ACTION_HINT;
    else if (NEXT.has(event.code)) actions |= ACTION_NEXT;
    else if (/^Digit[0-9]$/.test(event.code)) actions |= ACTION_CONFIRM;
    else return;
    event.preventDefault();
  });
  window.addEventListener('blur', () => {
    aiming = false;
  });

  canvas.addEventListener('pointerdown', (event) => {
    const p = toField(event);
    aiming = true;
    pointer = p;
    downAt = p;
  });
  canvas.addEventListener('pointermove', (event) => {
    if (aiming) pointer = toField(event);
  });
  canvas.addEventListener('pointerup', (event) => {
    const p = toField(event);
    pointer = p;
    aiming = false;
    // A short tap (not a drag) counts as a click for buttons.
    if (Math.hypot(p.x - downAt.x, p.y - downAt.y) < 8) {
      clicked = true;
      clickAt = p;
    }
  });
  canvas.addEventListener('pointercancel', () => {
    aiming = false;
  });

  return {
    isAiming() { return aiming; },
    aim() { return pointer; },
    down() { return downAt; },
    takeClick() {
      if (!clicked) return null;
      clicked = false;
      return clickAt;
    },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
