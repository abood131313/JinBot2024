const express = require('express');
const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const mcData = require('minecraft-data');
const armorManager = require('mineflayer-armor-manager');
const pvp = require('mineflayer-pvp').plugin;

const app = express();
app.use(express.json());

let bot;
let startTime = Date.now();

app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Minecraft by Jin</title>
        </head>
        <body>
            <h1>Configuración del Bot de Minecraft</h1>
            <form id="botConfigForm">
                <label for="host">Host:</label>
                <input type="text" id="host" name="host" required><br><br>

                <label for="port">Puerto:</label>
                <input type="number" id="port" name="port" required><br><br>

                <label for="username">Usuario:</label>
                <input type="text" id="username" name="username" required><br><br>

                <label for="password">Contraseña:</label>
                <input type="password" id="password" name="password"><br><br>

                <label for="version">Versión:</label>
                <input type="text" id="version" name="version" required><br><br>

                <button type="submit">Iniciar Bot</button>
            </form>

            <script>
                document.getElementById('botConfigForm').addEventListener('submit', function(event) {
                    event.preventDefault();

                    const host = document.getElementById('host').value;
                    const port = document.getElementById('port').value;
                    const username = document.getElementById('username').value;
                    const password = document.getElementById('password').value;
                    const version = document.getElementById('version').value;

                    fetch('/start-bot', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ host, port, username, password, version })
                    })
                    .then(response => response.json())
                    .then(data => {
                        console.log(data.message);
                    })
                    .catch(error => {
                        console.error('Error:', error);
                    });
                });
            </script>
        </body>
        </html>
    `);
});

app.post('/start-bot', (req, res) => {
    const { host, port, username, password, version } = req.body;

    if (bot) {
        bot.end();
    }

    bot = createBot(host, port, username, password, version);
    res.json({ message: 'Bot iniciado' });
});

function createBot(host, port, username, password, version) {
    const newBot = mineflayer.createBot({
        host,
        port: parseInt(port),
        username,
        password,
        version
    });

    newBot.loadPlugin(pvp);
    newBot.loadPlugin(armorManager);
    newBot.loadPlugin(pathfinder);

    newBot.on('login', () => {
        console.log('Bot conectado.');
        startTime = Date.now();
        startRandomMovement(newBot);
    });

    newBot.on('spawn', () => {
        setInterval(() => displayUptime(newBot), 60000);
    });

    newBot.on('end', () => {
        console.log('Desconectado, reconectando...');
        bot = createBot(host, port, username, password, version);
    });

    return newBot;
}

function displayUptime(bot) {
    const currentTime = Date.now();
    const uptime = currentTime - startTime;
    const hours = Math.floor(uptime / 3600000);
    const minutes = Math.floor((uptime % 3600000) / 60000);
    const seconds = Math.floor((uptime % 60000) / 1000);
    console.log(`Tiempo de conexión: ${hours}h ${minutes}m ${seconds}s`);
}

function startRandomMovement(bot) {
    const radius = 15; // Define el radio de movimiento
    const movements = new Movements(bot, mcData(bot.version));
    bot.pathfinder.setMovements(movements);

    function move() {
        if (!bot.pathfinder.isMoving()) {
            const randomPosition = bot.entity.position.floored().offset(
                (Math.random() - 0.5) * 2 * radius,
                0,
                (Math.random() - 0.5) * 2 * radius
            );
            bot.pathfinder.setGoal(new goals.GoalNear(randomPosition.x, randomPosition.y, randomPosition.z, 1));
        }
    }

    // Ejecuta la función move cada segundo para revisar si necesita establecer un nuevo objetivo
    setInterval(move, 1000);
}

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Servidor escuchando en el puerto ${port}`);
});
