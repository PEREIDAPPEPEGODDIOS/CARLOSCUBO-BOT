const mineflayer = require('mineflayer');

// Capturar cualquier error no controlado para evitar que Node.js cierre el proceso
process.on('uncaughtException', (err) => {
    console.log(`[NPC] Error interno capturado e ignorado: ${err.message}`);
});

process.on('unhandledRejection', (reason) => {
    console.log(`[NPC] Promesa rechazada ignorada: ${reason}`);
});

let chatInterval = null;
let patrolInterval = null;

function createBot() {
    if (chatInterval) clearInterval(chatInterval);
    if (patrolInterval) clearInterval(patrolInterval);

    const bot = mineflayer.createBot({
        host: 'logcraft.mcsh.io',
        port: 25565,
        username: 'BotLog',
        version: '1.21.4',
        hideErrors: true,
        checkTimeoutInterval: 120 * 1000 // Margen de 2 minutos para evitar caídas por micro-lag de red
    });

    let spawnPos = null;

    bot.on('login', () => {
        console.log('[NPC] Conexión establecida con LogCraft.');
    });

    bot.on('spawn', () => {
        console.log('[NPC] El bot ha aparecido en el Spawn.');
        
        // Guardar el punto central exacto de aparición
        spawnPos = bot.entity.position.clone();

        // Inicio de sesión automático
        setTimeout(() => {
            bot.chat('/login cubo16');
        }, 3000);
    });

    bot.on('kicked', (reason) => {
        let mensaje = reason;
        try {
            mensaje = JSON.stringify(reason);
        } catch (e) {}
        console.log(`[NPC] Expulsado por el servidor: ${mensaje}`);
    });

    // 1. Anuncio automático en el chat cada 5 minutos
    chatInterval = setInterval(() => {
        if (!bot || !bot.entity) return;

        bot.chat('&b&lDISFRUTA DEL SERVIDOR ?');
        console.log('[NPC] Anuncio enviado al chat.');
    }, 5 * 60 * 1000);

    // 2. Patrulla inteligente dentro del área 7x7 (3.5 bloques máximo desde el centro)
    patrolInterval = setInterval(() => {
        if (!bot || !bot.entity || !spawnPos) return;

        try {
            const distFromSpawn = bot.entity.position.distanceTo(spawnPos);

            // Si intenta salir del perímetro de 7x7 (más de 3.5 bloques del centro), gira de regreso al Spawn
            if (distFromSpawn > 3.5) {
                const dx = spawnPos.x - bot.entity.position.x;
                const dz = spawnPos.z - bot.entity.position.z;
                const yaw = Math.atan2(-dx, -dz);
                
                bot.look(yaw, 0, true);
                bot.clearControlStates();
                bot.setControlState('forward', true);
            } else {
                // Movimiento aleatorio dentro del área permitida
                const yaw = (Math.random() * Math.PI * 2) - Math.PI;
                bot.look(yaw, 0, true);

                bot.clearControlStates();
                bot.setControlState('forward', true);

                if (Math.random() > 0.6) bot.setControlState('jump', true);
                bot.swingArm('right');
            }

            // Pasos cortos (1.2 segundos) para no empujar bloques y evitar detección de Anti-Cheat
            setTimeout(() => {
                if (bot && bot.entity) bot.clearControlStates();
            }, 1200);

        } catch (err) {
            console.log(`[NPC] Aviso en patrulla: ${err.message}`);
        }
    }, 4000);

    // Auto-reconexión inmediata en 3 segundos si el servidor se reinicia
    bot.on('end', (reason) => {
        if (chatInterval) clearInterval(chatInterval);
        if (patrolInterval) clearInterval(patrolInterval);
        console.log(`[NPC] Conexión cerrada (${reason}). Reconectando en 3 segundos...`);
        setTimeout(createBot, 3000);
    });

    bot.on('error', (err) => {
        console.log(`[NPC] Error de red: ${err.message}`);
    });
}

createBot();
