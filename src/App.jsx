import AgentConf from './AgentConf.jsx';
import AgentConfThree from './AgentConfThree.jsx';

/** Three.js is the default; set VITE_RENDERER=canvas for the legacy Canvas 2D build. */
const useCanvas = import.meta.env.VITE_RENDERER === 'canvas'
  || import.meta.env.VITE_RENDERER === '2d';

export default function App() {
  return useCanvas ? <AgentConf /> : <AgentConfThree />;
}
