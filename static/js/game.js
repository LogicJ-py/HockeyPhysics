let player;
let puck;
let goals = [];
let score = 0;

function setup() {
    const canvas = createCanvas(800, 400);
    canvas.parent('game-container');

    // Initialiser le joueur
    player = {
        x: width / 4,
        y: height / 2,
        radius: 20,
        mass: 5,
        maxSpeed: 5,
        acceleration: 0.5,
        friction: 0.95,
        velocity: { x: 0, y: 0 }
    };

    // Initialiser le palet
    puck = {
        x: width / 2,
        y: height / 2,
        radius: 10,
        velocity: { x: 0, y: 0 },
        friction: 0.98
    };

    // Initialiser les buts
    goals = [
        { x: 0, y: height/2, width: 10, height: 100 },
        { x: width-10, y: height/2, width: 10, height: 100 }
    ];
}

function draw() {
    background(33, 37, 41); // Couleur de fond Bootstrap dark

    // Dessiner la patinoire
    drawRink();

    // Mettre à jour la position du joueur
    updatePlayer();

    // Mettre à jour la position du palet
    updatePuck();

    // Gérer les collisions
    handleCollisions();

    // Dessiner les éléments
    drawPlayer();
    drawPuck();
    drawGoals();
}

function drawRink() {
    stroke(200);
    noFill();
    rect(0, 0, width, height);
    circle(width/2, height/2, 100);
    line(width/2, 0, width/2, height);
}

function updatePlayer() {
    // Mise à jour de la masse depuis le curseur
    player.mass = document.getElementById('massRange').value;
    // Mise à jour de l'accélération depuis le curseur de vitesse
    player.acceleration = document.getElementById('speedRange').value * 0.1;

    // Appliquer l'accélération en fonction des touches
    if (keyIsDown(LEFT_ARROW)) player.velocity.x -= player.acceleration;
    if (keyIsDown(RIGHT_ARROW)) player.velocity.x += player.acceleration;
    if (keyIsDown(UP_ARROW)) player.velocity.y -= player.acceleration;
    if (keyIsDown(DOWN_ARROW)) player.velocity.y += player.acceleration;

    // Limiter la vitesse maximale
    let speed = sqrt(player.velocity.x * player.velocity.x + player.velocity.y * player.velocity.y);
    if (speed > player.maxSpeed) {
        player.velocity.x = (player.velocity.x / speed) * player.maxSpeed;
        player.velocity.y = (player.velocity.y / speed) * player.maxSpeed;
    }

    // Appliquer la friction
    player.velocity.x *= player.friction;
    player.velocity.y *= player.friction;

    // Mettre à jour la position
    player.x += player.velocity.x;
    player.y += player.velocity.y;

    // Limites du terrain
    player.x = constrain(player.x, player.radius, width - player.radius);
    player.y = constrain(player.y, player.radius, height - player.radius);
}

function updatePuck() {
    // Appliquer la vélocité
    puck.x += puck.velocity.x;
    puck.y += puck.velocity.y;

    // Appliquer la friction
    puck.velocity.x *= puck.friction;
    puck.velocity.y *= puck.friction;

    // Rebonds sur les bords
    if (puck.x < puck.radius || puck.x > width - puck.radius) {
        puck.velocity.x *= -1;
    }
    if (puck.y < puck.radius || puck.y > height - puck.radius) {
        puck.velocity.y *= -1;
    }

    // Limites du terrain
    puck.x = constrain(puck.x, puck.radius, width - puck.radius);
    puck.y = constrain(puck.y, puck.radius, height - puck.radius);
}

function handleCollisions() {
    // Collision joueur-palet
    let dx = puck.x - player.x;
    let dy = puck.y - player.y;
    let distance = sqrt(dx * dx + dy * dy);

    if (distance < player.radius + puck.radius) {
        // Calculer l'angle de collision
        let angle = atan2(dy, dx);

        // Transférer la vitesse au palet
        let force = player.mass * sqrt(player.velocity.x * player.velocity.x + player.velocity.y * player.velocity.y) * 0.5;
        puck.velocity.x = cos(angle) * force;
        puck.velocity.y = sin(angle) * force;
    }

    // Vérifier si le palet est dans un but
    goals.forEach((goal, index) => {
        if (puck.x < goal.x + goal.width && 
            puck.x > goal.x && 
            puck.y > goal.y - goal.height/2 && 
            puck.y < goal.y + goal.height/2) {
            // But marqué !
            score += (index === 1) ? 1 : -1; // +1 pour but droit, -1 pour but gauche
            document.getElementById('score').textContent = score;
            resetPuck();
        }
    });
}

function resetPuck() {
    puck.x = width / 2;
    puck.y = height / 2;
    puck.velocity.x = 0;
    puck.velocity.y = 0;
}

function drawPlayer() {
    fill(52, 152, 219); // Bleu
    noStroke();
    circle(player.x, player.y, player.radius * 2);
}

function drawPuck() {
    fill(231, 76, 60); // Rouge
    noStroke();
    circle(puck.x, puck.y, puck.radius * 2);
}

function drawGoals() {
    fill(46, 204, 113); // Vert
    goals.forEach(goal => {
        rect(goal.x, goal.y - goal.height/2, goal.width, goal.height);
    });
}