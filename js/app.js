// Inicjalizacja Planck.js
const pl = planck;
const Vec2 = pl.Vec2;


const world = new pl.World(Vec2(0, -10)); // Grawitacja w dół

// Skalowanie do rysowania
const SCALE = 30;
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Teren (płaska linia)
const ground = world.createBody();
ground.createFixture(pl.Edge(Vec2(-50, 0), Vec2(50, 0)), {friction: 0.6});

// Pojazd - nadwozie
const car = world.createBody({
  type: 'dynamic',
  position: Vec2(0, 1)
});
car.createFixture(pl.Box(1, 0.25), {density: 1, friction: 0.3});

// Koło 1
const wheel1 = world.createBody({
  type: 'dynamic',
  position: Vec2(-0.8, 0.5)
});
wheel1.createFixture(pl.Circle(0.4), {density: 1, friction: 0.9});

// Koło 2
const wheel2 = world.createBody({
  type: 'dynamic',
  position: Vec2(0.8, 0.5)
});
wheel2.createFixture(pl.Circle(0.4), {density: 1, friction: 0.9});

// Zawieszenie (revolute joint)
const motorSpeed = -10.0;
const motorTorque = 20.0;

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

// Renderowanie
function drawBody(body) {
  for (let fixture = body.getFixtureList(); fixture; fixture = fixture.getNext()) {
    const shape = fixture.getShape();
    const type = shape.getType();

    ctx.beginPath();
    ctx.strokeStyle = "#fff";

    if (type === 'polygon') {
      const vertices = shape.m_vertices.map(v => body.getWorldPoint(v));
      ctx.moveTo(vertices[0].x * SCALE, canvas.height - vertices[0].y * SCALE);
      for (let i = 1; i < vertices.length; i++) {
        ctx.lineTo(vertices[i].x * SCALE, canvas.height - vertices[i].y * SCALE);
      }
      ctx.closePath();
      ctx.stroke();
    }

    if (type === 'circle') {
      const pos = body.getWorldPoint(shape.m_p);
      ctx.arc(pos.x * SCALE, canvas.height - pos.y * SCALE,
        shape.m_radius * SCALE, 0, 2 * Math.PI);
      ctx.stroke();
    }
  }
}

// Pętla symulacji
function update() {
  world.step(1/60);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let b = world.getBodyList(); b; b = b.getNext()) {
    drawBody(b);
  }

  requestAnimationFrame(update);
}

update();
