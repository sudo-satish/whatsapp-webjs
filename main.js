require('dotenv').config();

const { Client, MessageMedia, RemoteAuth } = require('whatsapp-web.js');
const { MongoStore } = require('wwebjs-mongo');
const mongoose = require('mongoose');

const { connect, subscribe, publish, unsubscribe, disconnect, client } = require('./redis');

connect();

const clientMap = {};

const qrcode = require('qrcode-terminal');
const WhatsappClient = require('./models/clients');
const MessageLog = require('./models/messageLog');
const Company = require('./models/company');


const bindEvents = (client, clientId) => {
    // When the client is ready, run this code (only once)
    client.once('ready', async () => {
        console.log('Client is ready!', clientId);
        await WhatsappClient.updateOne({ clientId: clientId }, { $set: { connected: true } });
        await Company.updateOne({ _id: new mongoose.Types.ObjectId(clientId) }, { $set: { isWhatsappEnabled: true } });
        publish('whatsapp:ready', JSON.stringify({ clientId, connected: true }))
    });

    client.on('disconnected', async () => {
        console.log('Client is disconnected!', clientId);
        await WhatsappClient.updateOne({ clientId: clientId }, { $set: { connected: false } });
        await Company.updateOne({ _id: new mongoose.Types.ObjectId(clientId) }, { $set: { isWhatsappEnabled: false } });
    });

    // When the client received QR-Code
    client.on('qr', (qr) => {
        publish('whatsapp:qr', JSON.stringify({
            companyId: clientId,
            qr: qr
        }));
    });

    client.on('message_create', async message => {

        const msgLog = await MessageLog.create({ message });
        if (msgLog) {
            publish('whatsapp:message_create', msgLog._id.toString());
        }

        if (message.hasMedia) {
            // const media = await message.downloadMedia();
            // console.log(media);
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

const createNewClient = async (clientId) => {

    console.log('Creating new client for => ', clientId);

    if (clientMap[clientId]) {
        console.log('Client already exists', clientId);
        publish('whatsapp:ready', JSON.stringify({ clientId, connected: true }))
        return clientMap[clientId];
    }

    const client = new Client({
        clientId: clientId,
        authStrategy: new RemoteAuth({
            clientId: clientId,
            store: store,
            backupSyncIntervalMs: 300000,
            rmMaxRetries: 10
        })
    });

    console.log('clientId => ', client.authStrategy.clientId);

    const whatsappClient = await WhatsappClient.findOne({ clientId: clientId });

    if (!whatsappClient) {
        const whatsappClient = new WhatsappClient({
            clientId: clientId,
            authStrategy: 'remote'
        });

        await whatsappClient.save();
    }

    bindEvents(client, clientId);

    client.initialize();

    clientMap[clientId] = client;

    return client;
}


subscribe('new-client', (clientId) => {
    console.log('New client', clientId);
    const client = createNewClient(clientId);
});

subscribe('whatsapp:connect', (data) => {
    console.log('QR Code', data);

    const payload = JSON.parse(data);
    createNewClient(payload.companyId);
});

subscribe('whatsapp.send-message', async (data) => {
    console.log('whatsapp.send-message', data);

    const payload = JSON.parse(data);

    if (!payload.companyId) {
        console.log('Company ID is required');
        return;
    }

    const client = clientMap[payload.companyId];
    if (!client) {
        console.log('Client not found', payload.companyId);
        return;
    }

    try {
        await client.sendMessage(payload.to, payload.message);
    } catch (error) {
        console.log('Error sending message', error);
    }


    // if (client) {
    //     if (client.isReady) {
    //         client.sendMessage(payload.to, payload.message);
    //     } else {
    //         client.on('ready', () => {
    //             client.sendMessage(payload.to, payload.message);
    //             client.isReady = true;
    //         });
    //     }
    // } else {
    //     console.log('Client not found', payload.companyId);
    // }
});

const initClients = async () => {
    const clients = await WhatsappClient.find({});

    await Promise.all(clients.map(async client => {
        await createNewClient(client.clientId);
    }));

    console.log('Clients initialized');
};

initClients();
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
