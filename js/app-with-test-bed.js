import {Testbed} from "./vendor/planck-with-testbed.min";

const pl = planck;
const Vec2 = pl.Vec2;

// Testbed uruchamia symulację i rysowanie automatycznie
Testbed(function(testbed) {
  testbed.width = 40;   // szerokość widoku kamery
  testbed.height = 20;  // wysokość widoku
  testbed.x = 0;        // pozycja kamery
  testbed.y = 2;

  // Świat z grawitacją
  const world = new pl.World(Vec2(0, -10));

  // === Teren (płaski) ===
  const ground = world.createBody();
  ground.createFixture(pl.Edge(Vec2(-50, 0), Vec2(50, 0)), { friction: 0.6 });

  // === Auto ===
  // Nadwozie
  const car = world.createBody({
    type: 'dynamic',
    position: Vec2(0, 1)
  });
  car.createFixture(pl.Box(1, 0.25), { density: 1, friction: 0.3 });

  // Koło 1
  const wheel1 = world.createBody({
    type: 'dynamic',
    position: Vec2(-0.8, 0.5)
  });
  wheel1.createFixture(pl.Circle(0.4), { density: 1, friction: 0.9 });

  // Koło 2
  const wheel2 = world.createBody({
    type: 'dynamic',
    position: Vec2(0.8, 0.5)
  });
  wheel2.createFixture(pl.Circle(0.4), { density: 1, friction: 0.9 });

  // === Zawieszenie z napędem ===
  const motorSpeed = -10.0;    // prędkość obrotowa silnika
  const motorTorque = 20.0;    // maksymalny moment obrotowy

  world.createJoint(pl.RevoluteJoint({
    motorSpeed: motorSpeed,
    maxMotorTorque: motorTorque,
    enableMotor: true
  }, car, wheel1, wheel1.getPosition()));

  world.createJoint(pl.RevoluteJoint({
    motorSpeed: motorSpeed,
    maxMotorTorque: motorTorque,
    enableMotor: true
  }, car, wheel2, wheel2.getPosition()));

  // === Zwróć świat do testbedu ===
  return world;
});
