/**
 * Harmonic Swarm Coordination System
 * Main entry point and public API
 */

// Core exports
export { Agent } from './core/agent.js';
export { SwarmCoordinator } from './core/swarm-coordinator.js';
export { 
  StandardIntervals, 
  harmonicMultiplier, 
  harmonicConstantTable,
  securityHardness,
  MotionType,
  VoiceLeadingRules
} from './core/harmonic-constants.js';

// Type exports
export type {
  Vector3D,
  Vector6D,
  SwarmConfig,
  Mission,
  PerformanceMetrics,
  NetworkTopology,
  QuantumState,
  SatelliteTarget,
  DroneCapabilities,
  HarmonicField,
  LatticePoint,
  BoundaryConditions,
  PhysicsConfig,
  MissionConstraint,
  NetworkEdge,
  CoordinationMode
} from './core/types.js';

// Demo exports (for testing and examples)
export { default as SatelliteDemo } from './demo/satellite-demo.js';
export { default as DroneDemo } from './demo/drone-demo.js';
export { default as QuantumDemo } from './demo/quantum-demo.js';

/**
 * Quick start factory function for common use cases
 */
export function createSwarmCoordinator(
  type: 'satellite' | 'drone' | 'quantum',
  agentCount: number = 10
): SwarmCoordinator {
  switch (type) {
    case 'satellite':
      return new SwarmCoordinator({
        agentCount,
        dimension: 3,
        coordinationMode: CoordinationMode.FORMATION,
        harmonicIntervals: ['perfectFifth', 'majorThird', 'perfectFourth', 'octave'],
        boundaryConditions: {
          type: 'infinite',
          bounds: {
            min: { x: -1000, y: -1000, z: -1000 },
            max: { x: 1000, y: 1000, z: 1000 }
          }
        },
        physics: {
          gravity: { x: 0, y: 0, z: 0 },
          friction: 0.01,
          collisionRadius: 5.0,
          timeStep: 0.1
        }
      });

    case 'drone':
      return new SwarmCoordinator({
        agentCount,
        dimension: 2,
        coordinationMode: CoordinationMode.SWARMING,
        harmonicIntervals: ['perfectFifth', 'majorThird', 'perfectFourth', 'minorThird'],
        boundaryConditions: {
          type: 'reflective',
          bounds: {
            min: { x: 0, y: 0, z: 10 },
            max: { x: 500, y: 500, z: 100 }
          }
        },
        physics: {
          gravity: { x: 0, y: 0, z: -9.81 },
          friction: 0.1,
          collisionRadius: 15.0,
          timeStep: 0.1
        }
      });

    case 'quantum':
      return new SwarmCoordinator({
        agentCount,
        dimension: 6,
        coordinationMode: CoordinationMode.LATTICE,
        harmonicIntervals: ['perfectFifth', 'majorThird', 'perfectFourth', 'octave'],
        boundaryConditions: {
          type: 'periodic',
          bounds: {
            min: { x: 0, y: 0, z: 0 },
            max: { x: 1000, y: 1000, z: 100 }
          }
        },
        physics: {
          gravity: { x: 0, y: 0, z: 0 },
          friction: 0.05,
          collisionRadius: 50.0,
          timeStep: 0.01
        }
      });

    default:
      throw new Error(`Unknown swarm type: ${type}`);
  }
}

/**
 * Create an agent with sensible defaults for different applications
 */
export function createAgent(
  id: string,
  position: Vector3D,
  type: 'satellite' | 'drone' | 'quantum' = 'drone'
): Agent {
  const configs = {
    satellite: {
      mass: 1000,
      maxSpeed: 5.0,
      harmonicInterval: 'perfectFifth'
    },
    drone: {
      mass: 5,
      maxSpeed: 15.0,
      harmonicInterval: 'majorThird'
    },
    quantum: {
      mass: 1.0,
      maxSpeed: 100.0,
      harmonicInterval: 'perfectFourth'
    }
  };

  const config = configs[type];
  
  return new Agent({
    id,
    position,
    velocity: { x: 0, y: 0, z: 0 },
    harmonicInterval: config.harmonicInterval,
    mass: config.mass,
    maxSpeed: config.maxSpeed,
    role: 'follower'
  });
}

// Re-export types for convenience
import { CoordinationMode } from './core/types.js';
export { CoordinationMode };