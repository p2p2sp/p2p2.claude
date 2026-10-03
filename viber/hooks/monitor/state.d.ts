/*
 * state.d.ts - the build monitor's session state, as register.tsx keeps it in
 * `$.state` under the plugin's name. Self-contained: it imports nothing and
 * declares the shapes structurally, matching monitor.ts's RunIndex, Flight and
 * Tier (each led by `Viber` so no name inside the augmentation binds to the
 * engine's own `Tier`).
 */

export type ViberTier = 'haiku' | 'sonnet' | 'opus' | 'fable';
export type ViberRole = 'coder' | 'reviewer';
export type ViberTaskState = 'done' | 'skipped' | 'todo';

export type ViberIndexTask = { id: string; state: ViberTaskState; title: string };
export type ViberRunIndex = {
  plan: string;
  title: string;
  done: number;
  total: number;
  skipped: string[];
  deferred: string[];
  decisions: string[];
  rulings: string[];
  tasks: ViberIndexTask[];
};
export type ViberDispatch = { plan: string; taskId: string; role: ViberRole; tier?: ViberTier };
export type ViberFlight = { agentId: string; dispatch: ViberDispatch };

declare module 'claude-code' {
  interface PluginState {
    viber: {
      enabled: boolean;                        // build.monitor resolved at session start
      index: ViberRunIndex | null;             // the active run's last refresh
      flights: ViberFlight[];                  // in flight now
      attempts: Record<string, number>;        // "<plan>#<id>" -> coder spawns this session
      tiers: Record<string, ViberTier>;        // "<plan>#<id>" -> last coder tier
      lastDispatchPlan: string | null;
      observed: boolean;                       // glossary: observed
      autoOpened: boolean;                     // the panel already opened itself this session
    };
  }
}
