import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { resolveAppearance } from '../agentCustomization.js';
import { gridToWorld } from '../world/coords.js';
import { isStageTile } from '../world/layout.js';
import { getAllAgents } from '../world/simulation.js';

const AGENT_SCALE = 0.42;

function findAgent(pool, id) {
  if (!pool) return null;
  if (pool.speaker?.id === id) return pool.speaker;
  const booth = pool.booth?.find(a => a.id === id);
  if (booth) return booth;
  const pod = pool.podcast?.find(a => a.id === id);
  if (pod) return pod;
  return pool.regular?.find(a => a.id === id) ?? null;
}

function AgentMesh({ agentId, poolRef, showName }) {
  const groupRef = useRef();
  const labelRef = useRef();
  const bubbleRef = useRef();
  const appRef = useRef(null);

  useFrame(() => {
    const agent = findAgent(poolRef.current, agentId);
    const g = groupRef.current;
    if (!agent || !g) return;

    if (!appRef.current) {
      appRef.current = resolveAppearance(agent, agent.id);
    }

    const { x, z } = gridToWorld(agent.x, agent.y);
    const onStage = isStageTile(Math.floor(agent.x), Math.floor(agent.y));
    const y = onStage ? 2.2 : 0.55;
    g.position.set(x, y, z);
    const flip = agent.faceDir < 0 ? -AGENT_SCALE : AGENT_SCALE;
    g.scale.set(flip, AGENT_SCALE, AGENT_SCALE);

    if (labelRef.current) {
      labelRef.current.visible = showName;
    }
    const bubble = bubbleRef.current;
    if (bubble) {
      const show = agent.talkTimer > 0 || agent.watchTimer > 0;
      bubble.visible = show;
      if (show) {
        bubble.text = agent.talkTimer > 0 ? agent.talkMsg : agent.watchMsg;
      }
    }
  });

  const initial = findAgent(poolRef.current, agentId);
  if (!initial) return null;
  if (!appRef.current) appRef.current = resolveAppearance(initial, initial.id);

  return (
    <group ref={groupRef}>
      <mesh castShadow position={[0, 2.8, 0]}>
        <capsuleGeometry args={[1.1, 2.4, 4, 8]} />
        <meshStandardMaterial color={appRef.current.shirtColor} roughness={0.75} />
      </mesh>
      <mesh castShadow position={[0, 5.2, 0]}>
        <sphereGeometry args={[1.15, 12, 12]} />
        <meshStandardMaterial color={appRef.current.skin} roughness={0.8} />
      </mesh>
      <mesh castShadow position={[0, 6.5, 0]}>
        <sphereGeometry args={[1.05, 10, 8, 0, 0, 0, Math.PI * 0.55, Math.PI * 1.45]} />
        <meshStandardMaterial color={appRef.current.hairColor} roughness={0.85} />
      </mesh>
      <Text
        ref={labelRef}
        position={[0, 8.2, 0]}
        fontSize={0.22}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.03}
        outlineColor="#000000"
        visible={showName}
      >
        {initial.name}
      </Text>
      <Text
        ref={bubbleRef}
        position={[0, 9.2, 0]}
        fontSize={0.18}
        color="#FFE060"
        anchorX="center"
        anchorY="middle"
        maxWidth={2.8}
        textAlign="center"
        outlineWidth={0.025}
        outlineColor="#000000"
        visible={false}
      >
        {' '}
      </Text>
    </group>
  );
}

export default function Agents({ poolRef, showNames }) {
  const agents = getAllAgents(poolRef.current);
  return (
    <group>
      {agents.map(a => (
        <AgentMesh key={a.id} agentId={a.id} poolRef={poolRef} showName={showNames} />
      ))}
    </group>
  );
}
