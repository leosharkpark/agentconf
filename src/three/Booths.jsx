import { Text } from '@react-three/drei';
import { gridToWorld } from '../world/coords.js';

export default function Booths({ booths }) {
  return (
    <group>
      {booths.map(b => {
        const { x, z } = gridToWorld(b.gx + 0.5, b.gy + 0.5);
        return (
          <group key={b.label} position={[x, 1.2, z]}>
            <mesh castShadow position={[0, 1.5, 0]}>
              <boxGeometry args={[2.2, 3, 0.35]} />
              <meshStandardMaterial color={b.color} roughness={0.8} />
            </mesh>
            <mesh castShadow position={[0, 0.4, 0.2]}>
              <boxGeometry args={[2.4, 0.8, 1.2]} />
              <meshStandardMaterial color={b.accent} roughness={0.7} />
            </mesh>
            <Text
              position={[0, 3.35, 0.35]}
              fontSize={0.28}
              color={b.accent}
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.02}
              outlineColor="#000000"
            >
              {b.label.toUpperCase()}
            </Text>
          </group>
        );
      })}
    </group>
  );
}
