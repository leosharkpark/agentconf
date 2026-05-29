import { getAgentRenderStyle } from './agentStyle.js';
import * as kenney from './kenney/agent.js';
import * as colored from './coloredAgent.js';

function impl() {
  return getAgentRenderStyle() === 'colored' ? colored : kenney;
}

export function createAgentSprite() {
  return impl().createAgentSprite();
}

export function drawAgentSprite(sprite, agent, frame, showName, movementPaused) {
  return impl().drawAgentSprite(sprite, agent, frame, showName, movementPaused);
}

export function agentVisualKey(agent, frame, showName, movementPaused) {
  return impl().agentVisualKey(agent, frame, showName, movementPaused);
}

export function loadKenneyAssets() {
  return kenney.loadKenneyAssets();
}
