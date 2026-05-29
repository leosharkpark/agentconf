import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { themeForLights } from '../theme.js';
import { tickWorld } from '../world/simulation.js';
import Venue from './Venue.jsx';
import Agents from './Agents.jsx';
import Booths from './Booths.jsx';
import StageScreen from './StageScreen.jsx';
import { CameraRig } from './CameraRig.jsx';

function SimulationLoop({ poolRef, movementPausedRef, onStats }) {
  const frame = useRef(0);
  useFrame(() => {
    frame.current++;
    const { convos } = tickWorld(poolRef.current, movementPausedRef.current);
    if (frame.current % 60 === 0 && onStats) {
      onStats(convos);
    }
  });
  return null;
}

export default function WorldScene({
  poolRef,
  booths,
  movementPausedRef,
  lightsOn,
  focus,
  showNames,
  onStats,
}) {
  const theme = themeForLights(lightsOn);

  return (
    <Canvas
      shadows
      gl={{ antialias: true }}
      dpr={[1, 2]}
      frameloop="always"
      style={{ width: '100%', height: '100%', touchAction: 'none' }}
      onCreated={({ gl }) => {
        gl.setClearColor(theme.canvasBg);
      }}
    >
      <color attach="background" args={[theme.canvasBg]} />
      <fog attach="fog" args={[theme.canvasBg, 80, 160]} />
      <CameraRig focus={focus} lightsOn={lightsOn} />
      <SimulationLoop
        poolRef={poolRef}
        movementPausedRef={movementPausedRef}
        onStats={onStats}
      />
      <Venue theme={theme} />
      <StageScreen />
      <Booths booths={booths} />
      <Agents poolRef={poolRef} showNames={showNames} />
    </Canvas>
  );
}
