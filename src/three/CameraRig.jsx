import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { MapControls, OrthographicCamera } from '@react-three/drei';
import * as THREE from 'three';
import { gridToWorld, worldBounds } from '../world/coords.js';
import {
  isoCameraOffset,
  fitIsoOrthoZoom,
  ISO_POLAR,
} from '../world/isometricCamera.js';

const bounds = worldBounds();
const WORLD_CX = (bounds.minX + bounds.maxX) / 2;
const WORLD_CZ = (bounds.minZ + bounds.maxZ) / 2;

const ISO_OFFSET = isoCameraOffset(72);

export function CameraRig({ focus, lightsOn }) {
  const controlsRef = useRef();
  const targetRef = useRef(new THREE.Vector3(WORLD_CX, 0, WORLD_CZ));
  const desiredTarget = useRef(new THREE.Vector3(WORLD_CX, 0, WORLD_CZ));
  const desiredZoom = useRef(13);
  const currentZoom = useRef(13);
  const size = useThree(s => s.size);

  const lockCamera = useMemo(() => (camera, target) => {
    camera.position.copy(target).add(ISO_OFFSET);
    camera.up.set(0, 1, 0);
    camera.lookAt(target);
    camera.updateMatrixWorld(true);
  }, []);

  useFrame((_, delta) => {
    if (!focus) return;
    const { x, z } = gridToWorld(focus.gx, focus.gy);
    desiredTarget.current.set(x, 0, z);

    const t = 1 - Math.exp(-6 * delta);
    targetRef.current.lerp(desiredTarget.current, t);

    const c = controlsRef.current;
    if (!c?.object) return;

    c.target.copy(targetRef.current);
    lockCamera(c.object, c.target);

    desiredZoom.current = fitIsoOrthoZoom(
      c.object,
      size.width,
      size.height,
      focus.zoom,
    );
    currentZoom.current += (desiredZoom.current - currentZoom.current) * t;

    if (c.object instanceof THREE.OrthographicCamera) {
      c.object.zoom = currentZoom.current;
      c.object.updateProjectionMatrix();
    }
    c.update();
  });

  return (
    <>
      <OrthographicCamera
        makeDefault
        position={[
          WORLD_CX + ISO_OFFSET.x,
          ISO_OFFSET.y,
          WORLD_CZ + ISO_OFFSET.z,
        ]}
        zoom={13}
        near={-200}
        far={400}
      />
      <MapControls
        ref={controlsRef}
        target={[WORLD_CX, 0, WORLD_CZ]}
        enableRotate={false}
        enableDamping
        dampingFactor={0.1}
        maxPolarAngle={ISO_POLAR}
        minPolarAngle={ISO_POLAR}
        screenSpacePanning
      />
      <ambientLight intensity={lightsOn ? 0.85 : 0.45} />
      <directionalLight
        position={[30, 50, 20]}
        intensity={lightsOn ? 1.1 : 0.65}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-20, 30, -15]} intensity={lightsOn ? 0.35 : 0.2} />
    </>
  );
}
