/**
 * Core type definitions for harmonic swarm coordination
 */

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface Vector6D extends Vector3D {
  vx: number; // velocity components
  vy: number;
  vz: number;
}

export enum MotionType {
  PARALLEL = "parallel",     // Agents move in same direction
  OBLIQUE = "oblique",       // One agent moves, others stationary
  CONTRARY = "contrary",     // Agents move in opposite directions
  SIMILAR = "similar"        // Agents move in same general direction but different intervals
}

export enum CoordinationMode {
  FORMATION = "formation",   // Maintain specific geometric formation
  FLOCKING = "flocking",     // Bird-like flocking behavior
  SWARMING = "swarming",     // Insect-like swarming behavior
  ORBITING = "orbiting",     // Orbital mechanics-based coordination
  LATTICE = "lattice"        // Crystal lattice-based positioning
}

export interface SwarmConfig {
  agentCount: number;
  dimension: number;
  coordinationMode: CoordinationMode;
  harmonicIntervals: string[];
  boundaryConditions: BoundaryConditions;
  physics: PhysicsConfig;
}

export interface BoundaryConditions {
  type: 'periodic' | 'reflective' | 'absorbing' | 'infinite';
  bounds: {
    min: Vector3D;
    max: Vector3D;
  };
}

export interface PhysicsConfig {
  gravity: Vector3D;
  friction: number;
  collisionRadius: number;
  timeStep: number;
}

export interface Mission {
  id: string;
  type: 'satellite_servicing' | 'debris_removal' | 'search_rescue' | 'surveillance' | 'quantum_routing';
  target: Vector3D;
  priority: number;
  deadline: number;
  requiredAgents: number;
  constraints: MissionConstraint[];
}

export interface MissionConstraint {
  type: 'fuel_limit' | 'time_limit' | 'collision_avoidance' | 'communication_range' | 'formation_integrity';
  value: number;
  penalty: number;
}

export interface PerformanceMetrics {
  efficiency: number;        // Task completion rate
  coordination: number;      // How well agents coordinate
  fuelConsumption: number;   // Total energy used
  collisions: number;        // Number of collisions
  communicationOverhead: number; // Network traffic
  missionSuccess: boolean;   // Did we complete the mission?
  executionTime: number;     // Time to complete
}

export interface NetworkTopology {
  nodes: string[];           // Agent IDs
  edges: NetworkEdge[];      // Communication links
  latency: number;           // Network latency in ms
  bandwidth: number;         // Available bandwidth
  reliability: number;       // Link reliability (0-1)
}

export interface NetworkEdge {
  from: string;
  to: string;
  weight: number;            // Connection strength
  harmonicRatio: number;     // Harmonic relationship
}

export interface QuantumState {
  agentId: string;
  position: Vector6D;        // Position + velocity in 6D space
  entanglement: string[];    // IDs of entangled agents
  coherenceTime: number;     // How long quantum state lasts
  fidelity: number;          // Quality of quantum state (0-1)
}

export interface SatelliteTarget {
  id: string;
  position: Vector3D;
  velocity: Vector3D;
  mass: number;
  status: 'active' | 'debris' | 'defunct' | 'target';
  priority: number;
}

export interface DroneCapabilities {
  maxSpeed: number;
  maxAcceleration: number;
  sensorRange: number;
  communicationRange: number;
  batteryLife: number;
  payload: number;
}

export interface HarmonicField {
  center: Vector3D;
  radius: number;
  strength: number;
  harmonicRatio: number;
  frequency: number;
}

export interface LatticePoint {
  coordinates: number[];     // N-dimensional coordinates
  harmonicValue: number;     // H(d,R) at this point
  occupancy: string | null;  // Agent ID if occupied
  neighbors: number[];       // Indices of neighboring points
}