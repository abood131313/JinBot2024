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
            <title>Configuración del Bot de Minecraft</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    background-color: #f4f4f4;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                }
                .container {
                    background: #fff;
                    padding: 20px;
                    border-radius: 8px;
                    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                    width: 300px;
                }
                h1 {
                    text-align: center;
                    color: #333;
                }
                label {
                    display: block;
                    margin: 10px 0 5px;
                    color: #555;
                }
                input[type="text"], input[type="number"] {
                    width: 100%;
                    padding: 8px;
                    margin-bottom: 10px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                }
                button {
                    width: 100%;
                    padding: 10px;
                    background-color: #28a745;
                    border: none;
                    border-radius: 4px;
                    color: #fff;
                    font-size: 16px;
                }
                button:hover {
                    background-color: #218838;
                }
                footer {
                    text-align: center;
                    margin-top: 20px;
                    color: #777;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Configuración del Bot de Minecraft</h1>
                <form id="botConfigForm">
                    <label for="host">Host:</label>
                    <input type="text" id="host" name="host" required>

                    <label for="port">Puerto:</label>
                    <input type="number" id="port" name="port" required>

                    <label for="username">Usuario:</label>
                    <input type="text" id="username" name="username" required>

                    <label for="version">Versión:</label>
                    <input type="text" id="version" name="version" required>

                    <label for="message">Mensaje de bienvenida:</label>
                    <input type="text" id="message" name="message">

                    <button type="submit">Iniciar Bot</button>
                </form>
                <footer>&copy; 2024 Jin</footer>
            </div>

            <script>
                document.getElementById('botConfigForm').addEventListener('submit', function(event) {
                    event.preventDefault();

                    const host = document.getElementById('host').value;
                    const port = document.getElementById('port').value;
                    const username = document.getElementById('username').value;
                    const version = document.getElementById('version').value;
                    const message = document.getElementById('message').value;

                    fetch('/start-bot', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ host, port, username, version, message })
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
    const { host, port, username, version, message } = req.body;

    if (bot) {
        bot.end();
    }

    bot = createBot(host, port, username, version, message);
    res.json({ message: 'Bot iniciado' });
});

function createBot(host, port, username, version, message) {
    const newBot = mineflayer.createBot({
        host,
        port: parseInt(port),
        username,
        version
    });

    newBot.loadPlugin(pvp);
    newBot.loadPlugin(armorManager);
    newBot.loadPlugin(pathfinder);

    newBot.on('login', () => {
        console.log('Bot conectado.');
        if (message) {
            newBot.chat(message);
        }
        startTime = Date.now();
        startRandomMovement(newBot);
    });

    newBot.on('spawn', () => {
        setInterval(() => displayUptime(newBot), 60000);
    });

    newBot.on('end', () => {
        console.log('Desconectado, reconectando...');
        reconnectBot(host, port, username, version, message);
    });

    newBot.on('error', (err) => {
        console.error('Error del bot:', err);
        reconnectBot(host, port, username, version, message);
    });

    return newBot;
}

function reconnectBot(host, port, username, version, message) {
    setTimeout(() => {
        bot = createBot(host, port, username, version, message);
    }, 5000); // Espera 5 segundos antes de intentar reconectar
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
