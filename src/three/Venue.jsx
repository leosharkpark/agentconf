import { useMemo } from 'react';
import {
  GW,
  GH,
  STAGE_PLATFORM_X1,
  STAGE_PLATFORM_X2,
  STAGE_Y1,
  STAGE_Y2,
  SBH,
  PODCAST_STUDIOS,
  isStageTile,
  isFloorTile,
  podcastStudioAt,
} from '../world/layout.js';
import { gridToWorld, TILE_SIZE_X, TILE_SIZE_Z } from '../world/coords.js';

const tileHeight = (kind, theme, studio) => {
  if (kind === 'floor') return { h: 0.35, color: theme.rooms.floor.top };
  if (kind === 'podcast') return { h: 0.5, color: theme.rooms[studio?.id]?.top ?? '#333' };
  return { h: 0.08, color: theme.voidTile };
};

export default function Venue({ theme }) {
  const tiles = useMemo(() => {
    const list = [];
    for (let gx = 0; gx < GW; gx++) {
      for (let gy = 0; gy < GH; gy++) {
        if (isStageTile(gx, gy)) continue;
        const studio = podcastStudioAt(gx, gy);
        let kind = 'void';
        if (isFloorTile(gx, gy)) kind = 'floor';
        else if (studio) kind = 'podcast';

        const { h, color } = tileHeight(kind, theme, studio);
        const { x, z } = gridToWorld(gx, gy);
        list.push({ gx, gy, x, z, h, color });
      }
    }
    return list;
  }, [theme]);

  const stageDeck = useMemo(() => {
    const blocks = [];
    for (let gx = STAGE_PLATFORM_X1; gx <= STAGE_PLATFORM_X2; gx++) {
      for (let gy = STAGE_Y1; gy <= STAGE_Y2; gy++) {
        const { x, z } = gridToWorld(gx, gy);
        blocks.push({ x, z, gx, gy });
      }
    }
    return blocks;
  }, []);

  return (
    <group>
      {tiles.map(t => (
        <mesh key={`${t.gx}-${t.gy}`} position={[t.x, t.h / 2, t.z]} receiveShadow>
          <boxGeometry args={[TILE_SIZE_X, t.h, TILE_SIZE_Z]} />
          <meshStandardMaterial color={t.color} roughness={0.85} metalness={0.05} />
        </mesh>
      ))}
      {stageDeck.map(b => (
        <mesh key={`s-${b.gx}-${b.gy}`} position={[b.x, SBH * 0.22 / 2 + 0.35, b.z]} castShadow receiveShadow>
          <boxGeometry args={[TILE_SIZE_X, SBH * 0.22, TILE_SIZE_Z]} />
          <meshStandardMaterial
            color={theme.rooms.stage.top}
            roughness={0.7}
            metalness={0.08}
          />
        </mesh>
      ))}
      {PODCAST_STUDIOS.map(studio => (
        <group key={studio.id}>
          {Array.from({ length: studio.x2 - studio.x1 }, (_, i) => {
            const gx = studio.x1 + i;
            return Array.from({ length: studio.y2 - studio.y1 }, (_, j) => {
              const gy = studio.y1 + j;
              const onPlatform = gx >= studio.platformX1 && gx <= studio.platformX2
                && gy >= studio.platformY1 && gy <= studio.platformY2;
              const { x, z } = gridToWorld(gx, gy);
              const h = onPlatform ? 1.4 : 0.5;
              return (
                <mesh key={`${gx}-${gy}`} position={[x, h / 2, z]} receiveShadow>
                  <boxGeometry args={[TILE_SIZE_X, h, TILE_SIZE_Z]} />
                  <meshStandardMaterial color={theme.rooms[studio.id]?.top ?? '#333'} />
                </mesh>
              );
            });
          })}
        </group>
      ))}
    </group>
  );
}
