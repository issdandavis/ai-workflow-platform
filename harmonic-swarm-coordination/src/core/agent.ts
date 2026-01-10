/**
 * Core Agent class for harmonic swarm coordination
 */

import { Vector3D, MotionType } from './types.js';
import { harmonicMultiplier, StandardIntervals } from './harmonic-constants.js';

export interface AgentConfig {
  id: string;
  position: Vector3D;
  velocity: Vector3D;
  harmonicInterval: string;
  mass: number;
  maxSpeed: number;
  role: 'leader' | 'follower' | 'scout' | 'coordinator';
}

export class Agent {
  public id: string;
  public position: Vector3D;
  public velocity: Vector3D;
  public harmonicInterval: string;
  public harmonicRatio: number;
  public mass: number;
  public maxSpeed: number;
  public role: 'leader' | 'follower' | 'scout' | 'coordinator';
  
  private history: Vector3D[] = [];
  private maxHistoryLength = 100;

  constructor(config: AgentConfig) {
    this.id = config.id;
    this.position = { ...config.position };
    this.velocity = { ...config.velocity };
    this.harmonicInterval = config.harmonicInterval;
    this.harmonicRatio = StandardIntervals[config.harmonicInterval]?.ratio || 1.0;
    this.mass = config.mass;
    this.maxSpeed = config.maxSpeed;
    this.role = config.role;
  }

  /**
   * Update agent position based on harmonic coordination
   */
  update(deltaTime: number, dimension: number): void {
    // Apply harmonic scaling to velocity
    const harmonicMultiplier = this.getHarmonicMultiplier(dimension);
    
    // Scale velocity by harmonic factor
    const scaledVelocity = {
      x: this.velocity.x * harmonicMultiplier,
      y: this.velocity.y * harmonicMultiplier,
      z: this.velocity.z * harmonicMultiplier
    };

    // Limit to max speed
    const speed = Math.sqrt(
      scaledVelocity.x ** 2 + 
      scaledVelocity.y ** 2 + 
      scaledVelocity.z ** 2
    );

    if (speed > this.maxSpeed) {
      const scale = this.maxSpeed / speed;
      scaledVelocity.x *= scale;
      scaledVelocity.y *= scale;
      scaledVelocity.z *= scale;
    }

    // Update position
    this.position.x += scaledVelocity.x * deltaTime;
    this.position.y += scaledVelocity.y * deltaTime;
    this.position.z += scaledVelocity.z * deltaTime;

    // Store history
    this.history.push({ ...this.position });
    if (this.history.length > this.maxHistoryLength) {
      this.history.shift();
    }
  }

  /**
   * Calculate harmonic multiplier for this agent
   */
  getHarmonicMultiplier(dimension: number): number {
    return harmonicMultiplier(this.harmonicRatio, dimension);
  }

  /**
   * Calculate distance to another agent
   */
  distanceTo(other: Agent): number {
    return Math.sqrt(
      (this.position.x - other.position.x) ** 2 +
      (this.position.y - other.position.y) ** 2 +
      (this.position.z - other.position.z) ** 2
    );
  }

  /**
   * Calculate harmonic relationship with another agent
   */
  harmonicRelationshipWith(other: Agent): number {
    return this.harmonicRatio / other.harmonicRatio;
  }

  /**
   * Apply force to agent (affects velocity)
   */
  applyForce(force: Vector3D): void {
    this.velocity.x += force.x / this.mass;
    this.velocity.y += force.y / this.mass;
    this.velocity.z += force.z / this.mass;
  }

  /**
   * Get agent's trajectory history
   */
  getTrajectory(): Vector3D[] {
    return [...this.history];
  }

  /**
   * Reset agent to initial state
   */
  reset(config: Partial<AgentConfig>): void {
    if (config.position) this.position = { ...config.position };
    if (config.velocity) this.velocity = { ...config.velocity };
    if (config.harmonicInterval) {
      this.harmonicInterval = config.harmonicInterval;
      this.harmonicRatio = StandardIntervals[config.harmonicInterval]?.ratio || 1.0;
    }
    this.history = [];
  }

  /**
   * Serialize agent state for network transmission
   */
  serialize(): string {
    return JSON.stringify({
      id: this.id,
      position: this.position,
      velocity: this.velocity,
      harmonicInterval: this.harmonicInterval,
      role: this.role,
      timestamp: Date.now()
    });
  }

  /**
   * Create agent from serialized data
   */
  static deserialize(data: string): Agent {
    const parsed = JSON.parse(data);
    return new Agent({
      id: parsed.id,
      position: parsed.position,
      velocity: parsed.velocity,
      harmonicInterval: parsed.harmonicInterval,
      mass: 1.0, // Default values for missing data
      maxSpeed: 10.0,
      role: parsed.role || 'follower'
    });
  }
}