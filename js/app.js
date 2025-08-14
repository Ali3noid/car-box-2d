// app.js
// Entry point for the car simulation. This module wires together the
// world creation, rendering and control systems. It implements a
// fixed-timestep simulation loop with an accumulator so physics runs
// deterministically regardless of frame rate. The renderer keeps the
// camera smoothly following the car and supports pausing, resetting and
// zooming via keyboard controls.

import { createWorld, stepWorld } from './world.js';
import { Renderer } from './render.js';
import { setupControls } from './controls.js';

// Retrieve the canvas from the DOM. The HTML file should contain a
// <canvas id="gameCanvas"> element sized appropriately. If it is not
// present, throw an error so problems are surfaced early.
const canvas = document.getElementById('gameCanvas');
if (!canvas) {
  throw new Error('Unable to find canvas with id "gameCanvas"');
}

// Create initial world and renderer. We store these in outer scope so
// they can be replaced when resetting the simulation.
let simulation = createWorld();
let world = simulation.world;
let car = simulation.car;
let renderer = new Renderer(canvas, world, car);

// Simulation state variables
let paused = false;
let accumulator = 0;
const fixedTimeStep = 1 / 60; // 60 Hz physics
let lastTimestamp = null;

/**
 * The main animation loop. It calculates how much time has elapsed since
 * the previous frame and steps the physics world forward in fixed-size
 * increments. The renderer is invoked once per frame to draw the
 * interpolated state.
 * @param {DOMHighResTimeStamp} timestamp Provided by requestAnimationFrame
 */
function loop(timestamp) {
  if (lastTimestamp === null) {
    lastTimestamp = timestamp;
  }
  const deltaTime = (timestamp - lastTimestamp) / 1000;
  lastTimestamp = timestamp;
  if (!paused) {
    accumulator += deltaTime;
    // Step the world in fixed increments. We may step multiple times per
    // frame if the renderer is lagging behind.
    while (accumulator >= fixedTimeStep) {
      stepWorld(world, fixedTimeStep);
      accumulator -= fixedTimeStep;
    }
  }
  // Render the current state
  renderer.render();
  // Queue next frame
  requestAnimationFrame(loop);
}

// Define actions to be invoked by controls
const actions = {
  togglePause() {
    paused = !paused;
  },
  reset() {
    // Create a fresh world and replace our references. Reset the
    // accumulator and timestamp to avoid simulation jumps.
    simulation = createWorld();
    world = simulation.world;
    car = simulation.car;
    renderer = new Renderer(canvas, world, car);
    paused = false;
    accumulator = 0;
    lastTimestamp = null;
  },
  zoomIn() {
    renderer.adjustZoom(0.1);
  },
  zoomOut() {
    renderer.adjustZoom(-0.1);
  },
};

// Register keyboard controls
setupControls(actions);

// Kick off the animation loop
requestAnimationFrame(loop);