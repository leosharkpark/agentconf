import { Text } from '@react-three/drei';
import { gridToWorld } from '../world/coords.js';
import { STAGE_CX, STAGE_Y1 } from '../world/layout.js';

export default function StageScreen() {
  const { x, z } = gridToWorld(STAGE_CX, STAGE_Y1 + 0.35);
  return (
    <group position={[x, 5.5, z]}>
      <mesh position={[0, 2.5, -0.55]}>
        <boxGeometry args={[7.5, 4.2, 0.12]} />
        <meshStandardMaterial
          color="#080838"
          emissive="#200C70"
          emissiveIntensity={0.55}
          roughness={0.4}
        />
      </mesh>
      <Text
        position={[0, 3.4, -0.48]}
        fontSize={0.32}
        color="#ff4444"
        anchorX="center"
        anchorY="middle"
      >
        LIVE
      </Text>
      <Text
        position={[0, 2.85, -0.48]}
        fontSize={0.55}
        color="#c8b8ff"
        anchorX="center"
        anchorY="middle"
        maxWidth={6.5}
        textAlign="center"
      >
        AGENTCONF 2026
      </Text>
      <Text
        position={[0, 2.2, -0.48]}
        fontSize={0.22}
        color="#88aacc"
        anchorX="center"
        anchorY="middle"
        maxWidth={7}
        textAlign="center"
      >
        PALDISKI, ESTONIA
      </Text>
    </group>
  );
}
