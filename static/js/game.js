let player1;
let player2;
let puck;
let goals = [];
let scores = { team1: 0, team2: 0 };
let socket;
let gameTimer;
let timeLeft = 120; // 2 minutes en secondes
let bonuses = [];
let bonusSpawnInterval;

// Initialiser la connexion Socket.IO
function initializeSocket() {
    socket = io();

    socket.on('connect', () => {
        console.log('Connected to server');
    });

    socket.on('game_state_update', (data) => {
        updateGameState(data);
    });

    socket.on('score_update', (data) => {
        updateScore(data);
    });

    socket.on('bonus_update', (data) => {
        handleBonusUpdate(data);
    });
}

function setup() {
    const canvas = createCanvas(800, 400);
    canvas.parent('game-container');

    initializeSocket();
    startGame();
}

function startGame() {
    // Initialiser le joueur 1 (bleu, contrôles flèches)
    player1 = {
        x: width * 0.75,
        y: height / 2,
        radius: 20,
        mass: 5,
        maxSpeed: 5,
        acceleration: 0.5,
        friction: 0.95,
        velocity: { x: 0, y: 0 },
        color: color(52, 152, 219), // Bleu
        bonuses: {}
    };

    // Initialiser le joueur 2 (rouge, contrôles WASD)
    player2 = {
        x: width * 0.25,
        y: height / 2,
        radius: 20,
        mass: 5,
        maxSpeed: 5,
        acceleration: 0.5,
        friction: 0.95,
        velocity: { x: 0, y: 0 },
        color: color(231, 76, 60), // Rouge
        bonuses: {}
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
        { x: 0, y: height/2, width: 10, height: 100 },          // But gauche (équipe 1)
        { x: width-10, y: height/2, width: 10, height: 100 }    // But droit (équipe 2)
    ];

    // Démarrer le chronomètre
    startTimer();

    // Démarrer le spawn de bonus
    startBonusSpawning();
}

function startTimer() {
    timeLeft = 120;
    updateTimerDisplay();
    gameTimer = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();
        if (timeLeft <= 0) {
            endGame();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    document.getElementById('timer').textContent = 
        `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function endGame() {
    clearInterval(gameTimer);
    clearInterval(bonusSpawnInterval);
    // Afficher le résultat final
    const winner = scores.team1 > scores.team2 ? "Équipe 1" : 
                  scores.team2 > scores.team1 ? "Équipe 2" : "Match nul";
    document.getElementById('game-result').textContent = 
        `Fin du match ! ${winner} ${winner !== "Match nul" ? "gagne" : ""}!`;
}

function startBonusSpawning() {
    bonusSpawnInterval = setInterval(spawnBonus, 5000); // Nouveau bonus toutes les 5 secondes
}

function spawnBonus() {
    const bonusTypes = ['mass', 'speed'];
    const bonus = {
        x: random(50, width - 50),
        y: random(50, height - 50),
        type: random(bonusTypes),
        radius: 15,
        duration: 10000 // 10 secondes
    };
    bonuses.push(bonus);
}

function draw() {
    background(33, 37, 41);

    // Dessiner la patinoire
    drawRink();

    // Mettre à jour et dessiner les bonus
    updateAndDrawBonuses();

    // Mettre à jour les positions
    updatePlayer(player1, false);
    updatePlayer(player2, true);
    updatePuck();

    // Gérer les collisions
    handleCollisions();

    // Dessiner les éléments
    drawPlayer(player1);
    drawPlayer(player2);
    drawPuck();
    drawGoals();

    // Envoyer les mises à jour au serveur
    sendGameState();
}

function updateAndDrawBonuses() {
    for (let i = bonuses.length - 1; i >= 0; i--) {
        const bonus = bonuses[i];

        // Dessiner le bonus
        fill(bonus.type === 'mass' ? color(155, 89, 182) : color(46, 204, 113));
        circle(bonus.x, bonus.y, bonus.radius * 2);

        // Vérifier les collisions avec les joueurs
        [player1, player2].forEach(player => {
            if (dist(player.x, player.y, bonus.x, bonus.y) < player.radius + bonus.radius) {
                applyBonus(player, bonus);
                bonuses.splice(i, 1);
                socket.emit('bonus_collected', {
                    type: bonus.type,
                    player_id: player === player1 ? 'player1' : 'player2'
                });
            }
        });
    }
}

function applyBonus(player, bonus) {
    const originalValue = bonus.type === 'mass' ? player.mass : player.maxSpeed;
    const bonusMultiplier = 1.5;

    player[bonus.type === 'mass' ? 'mass' : 'maxSpeed'] *= bonusMultiplier;

    // Restaurer la valeur originale après la durée du bonus
    setTimeout(() => {
        player[bonus.type === 'mass' ? 'mass' : 'maxSpeed'] = originalValue;
    }, bonus.duration);
}

function sendGameState() {
    socket.emit('player_update', {
        player1: {
            x: player1.x,
            y: player1.y,
            velocity: player1.velocity
        },
        player2: {
            x: player2.x,
            y: player2.y,
            velocity: player2.velocity
        },
        puck: {
            x: puck.x,
            y: puck.y,
            velocity: puck.velocity
        }
    });
}

function updateGameState(data) {
    // Mettre à jour la position des autres joueurs
    if (data.player1) {
        player1.x = data.player1.x;
        player1.y = data.player1.y;
        player1.velocity = data.player1.velocity;
    }
    if (data.player2) {
        player2.x = data.player2.x;
        player2.y = data.player2.y;
        player2.velocity = data.player2.velocity;
    }
    if (data.puck) {
        puck.x = data.puck.x;
        puck.y = data.puck.y;
        puck.velocity = data.puck.velocity;
    }
}

function drawRink() {
    stroke(200);
    noFill();
    rect(0, 0, width, height);
    circle(width/2, height/2, 100);
    line(width/2, 0, width/2, height);
}

function updatePlayer(player, isPlayer2) {
    // Mise à jour de la masse depuis le curseur
    player.mass = document.getElementById(isPlayer2 ? 'massRange2' : 'massRange1').value;
    // Mise à jour de l'accélération depuis le curseur de vitesse
    player.acceleration = document.getElementById(isPlayer2 ? 'speedRange2' : 'speedRange1').value * 0.1;

    // Contrôles spécifiques à chaque joueur
    if (isPlayer2) {
        // WASD pour joueur 2
        if (keyIsDown(65)) player.velocity.x -= player.acceleration; // A
        if (keyIsDown(68)) player.velocity.x += player.acceleration; // D
        if (keyIsDown(87)) player.velocity.y -= player.acceleration; // W
        if (keyIsDown(83)) player.velocity.y += player.acceleration; // S
    } else {
        // Flèches pour joueur 1
        if (keyIsDown(LEFT_ARROW)) player.velocity.x -= player.acceleration;
        if (keyIsDown(RIGHT_ARROW)) player.velocity.x += player.acceleration;
        if (keyIsDown(UP_ARROW)) player.velocity.y -= player.acceleration;
        if (keyIsDown(DOWN_ARROW)) player.velocity.y += player.acceleration;
    }

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
    // Collision joueurs-palet
    [player1, player2].forEach(player => {
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
    });

    // Collision entre joueurs
    let dx = player2.x - player1.x;
    let dy = player2.y - player1.y;
    let distance = sqrt(dx * dx + dy * dy);

    if (distance < player1.radius + player2.radius) {
        let angle = atan2(dy, dx);
        let overlap = player1.radius + player2.radius - distance;

        // Séparer les joueurs
        player1.x -= cos(angle) * overlap / 2;
        player1.y -= sin(angle) * overlap / 2;
        player2.x += cos(angle) * overlap / 2;
        player2.y += sin(angle) * overlap / 2;

        // Échanger les vitesses
        let temp = {x: player1.velocity.x, y: player1.velocity.y};
        player1.velocity = {x: player2.velocity.x, y: player2.velocity.y};
        player2.velocity = {x: temp.x, y: temp.y};
    }

    // Vérifier si le palet est dans un but
    goals.forEach((goal, index) => {
        if (index === 0) {  // But gauche
            if (puck.x <= goal.x + goal.width && 
                puck.y > goal.y - goal.height/2 && 
                puck.y < goal.y + goal.height/2) {
                // But marqué !
                scores.team1++;
                console.log("But pour l'équipe 1! Score:", scores.team1);
                document.getElementById('score1').textContent = scores.team1;
                socket.emit('score_update', {team: 1, score: scores.team1});
                resetPuck();
            }
        } else {  // But droit
            if (puck.x >= goal.x && 
                puck.y > goal.y - goal.height/2 && 
                puck.y < goal.y + goal.height/2) {
                // But marqué !
                scores.team2++;
                console.log("But pour l'équipe 2! Score:", scores.team2);
                document.getElementById('score2').textContent = scores.team2;
                socket.emit('score_update', {team: 2, score: scores.team2});
                resetPuck();
            }
        }
    });
}

function resetPuck() {
    puck.x = width / 2;
    puck.y = height / 2;
    puck.velocity.x = 0;
    puck.velocity.y = 0;
}

function drawPlayer(player) {
    fill(player.color);
    noStroke();
    circle(player.x, player.y, player.radius * 2);
}

function drawPuck() {
    fill(255); // Blanc
    noStroke();
    circle(puck.x, puck.y, puck.radius * 2);
}

function drawGoals() {
    fill(46, 204, 113); // Vert
    goals.forEach(goal => {
        rect(goal.x, goal.y - goal.height/2, goal.width, goal.height);
    });
}

function updateScore(data) {
    if (data.team === 1) {
        scores.team1 = data.score;
        document.getElementById('score1').textContent = scores.team1;
    } else {
        scores.team2 = data.score;
        document.getElementById('score2').textContent = scores.team2;
    }
}

function handleBonusUpdate(data) {
    //  Handle bonus updates from the server (if needed)
}