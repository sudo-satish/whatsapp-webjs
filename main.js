require('dotenv').config();

const { Client, MessageMedia, RemoteAuth } = require('whatsapp-web.js');
const { MongoStore } = require('wwebjs-mongo');
const mongoose = require('mongoose');

const { connect, subscribe, publish, unsubscribe, disconnect, client } = require('./redis');

connect();

const qrcode = require('qrcode-terminal');


const bindEvents = (client) => {
    // When the client is ready, run this code (only once)
    client.once('ready', () => {
        console.log('Client is ready!', client.clientId);
        publish('whatsapp.ready', JSON.stringify({ connected: true }))
    });

    // When the client received QR-Code
    client.on('qr', (qr) => {
        console.log('QR RECEIVED', qr);
        publish('whatsapp.qr.recieved', qr);
        qrcode.generate(qr, { small: true });
    });

    client.on('message_create', async message => {

        console.log(message);

        publish('whatsapp.message_create', JSON.stringify(message));

        if (message.hasMedia) {
            const media = await message.downloadMedia();
            console.log(media);
        }

        if (message.body === '!ping') {
            // send back "pong" to the chat the message was sent in
            // client.sendMessage(message.from, 'pong');
            message.reply('pong2 reply');
        }

        if (message.body === '!send-media') {
            const media = MessageMedia.fromFilePath('./img1.png');
            await client.sendMessage(message.from, media, {
                caption: 'This is a test caption'
            });
        }
    });

    client.on('remote_session_saved', () => {
        console.log('Remote session saved');
    });
};

let store;
mongoose.connect(process.env.MONGODB_URI).then(() => {
    console.log('Connected to MongoDB');
    store = new MongoStore({ mongoose: mongoose });
});

const createNewClient = (clientId) => {
    const client = new Client({
        clientId: clientId,
        authStrategy: new RemoteAuth({
            clientId: clientId,
            store: store,
            backupSyncIntervalMs: 300000,
            rmMaxRetries: 10
        })
    });

    console.log('clientId => ', client.authStrategy.clientId)

    bindEvents(client);

    client.initialize();

    return client;
}


subscribe('new-client', (clientId) => {
    console.log('New client', clientId);
    const client = createNewClient(clientId);
});

module.exports = {
    createNewClient: (clientId) => {
        const client = new Client({
            clientId: clientId,
            authStrategy: new RemoteAuth({
                clientId: clientId,
                store: store,
                backupSyncIntervalMs: 300000,
                rmMaxRetries: 10
            })
        });

        bindEvents(client);

        client.initialize();

        return client;
    }
};
