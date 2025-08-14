// world.js
// Module responsible for constructing the physical simulation world and exposing
// a simple stepping helper. This module uses Planck.js via the global
// `planck` object that is loaded from the vendor bundle. A world is
// comprised of gravity, a procedurally generated terrain, a simple car with
// two wheels and powered joints.  When called, `createWorld` returns both
// the world instance and a reference to the car body so that consumers can
// follow it with a camera.

const pl = planck;
const Vec2 = pl.Vec2;

/**
 * Create a new Planck world populated with a terrain and a car.
 *
 * The terrain is procedurally generated as a chain of vertices defined by
 * multiple sine waves. It produces gentle rolling hills so that the car
 * always has something interesting to drive over. A powered car body with
 * two wheels is created and connected via revolute joints.
 *
 * @returns {{ world: pl.World, car: pl.Body }} object containing the world
 *   and a reference to the car body. The caller owns the returned objects.
 */
export function createWorld() {
  // Create a new world with downward gravity.
  const world = new pl.World(Vec2(0, -10));

  // === Terrain ===
  // Build a list of vertices for our ground shape. We combine several
  // sine waves with different frequencies and amplitudes to give the
  // impression of natural terrain. The x range spans from -50 to 150 so
  // the car can drive forward for a while without running off the end.
  const ground = world.createBody();
  const points = [];
  for (let i = -50; i <= 150; i += 1) {
    const x = i;
    // Combine two sine waves: a faster oscillation and a slower one.
    const y = Math.sin(i * 0.20) * 0.5 + Math.sin(i * 0.05) * 0.2;
    points.push(Vec2(x, y));
  }
  // Create a chain shape from our points. The chain is open (not a loop).
  const chainShape = pl.Chain(points, false);
  ground.createFixture(chainShape, { friction: 0.6 });

  // === Vehicle ===
  // Car chassis body. Start it slightly above the ground to avoid
  // immediate collisions.
  const car = world.createBody({
    type: 'dynamic',
    position: Vec2(0, 1),
  });
  car.createFixture(pl.Box(1, 0.25), { density: 1, friction: 0.3 });

  // Left wheel
  const wheel1 = world.createBody({
    type: 'dynamic',
    position: Vec2(-0.8, 0.5),
  });
  wheel1.createFixture(pl.Circle(0.4), { density: 1, friction: 0.9 });

  // Right wheel
  const wheel2 = world.createBody({
    type: 'dynamic',
    position: Vec2(0.8, 0.5),
  });
  wheel2.createFixture(pl.Circle(0.4), { density: 1, friction: 0.9 });

  // === Suspension and Drive ===
  // Use revolute joints with motors enabled to drive the wheels. A
  // constant motor speed will propel the car forward. Adjust motor speed
  // and torque as desired for different behaviours.
  const motorSpeed = -10.0;
  const motorTorque = 20.0;
  world.createJoint(pl.RevoluteJoint(
    {
      motorSpeed: motorSpeed,
      maxMotorTorque: motorTorque,
      enableMotor: true,
    },
    car,
    wheel1,
    wheel1.getPosition(),
  ));
  world.createJoint(pl.RevoluteJoint(
    {
      motorSpeed: motorSpeed,
      maxMotorTorque: motorTorque,
      enableMotor: true,
    },
    car,
    wheel2,
    wheel2.getPosition(),
  ));

  return { world, car };
}

/**
 * Step the physics world forward by a fixed amount of time.
 *
 * This helper performs a simple world step with a fixed timestep. It is
 * separated from the creation logic to make the simulation loop easier
 * to read in the main entry file.
 *
 * @param {pl.World} world The physics world to advance.
 * @param {number} dt The amount of time (in seconds) to step.
 */
export function stepWorld(world, dt) {
  world.step(dt);
}