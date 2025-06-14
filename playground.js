require('dotenv').config()
// const { createNewClient } = require('./main');
const { connect, publish, subscribe } = require('./redis');

// const client = createNewClient('8130626713');

// client.on('ready', () => {
//     console.log('Client is ready!');
// });

// client.on('message', (message) => {
//     console.log(message);
// });

connect();

setTimeout(() => {
    // const client1 = createNewClient('8130626713');
    // const client2 = createNewClient('9958000332');

    publish('new-client', '8130626713');

}, 1000);

subscribe('whatsapp.message_create', (data) => {
    console.log('whatsapp.message_create')
    console.log(data);
})
subscribe('whatsapp.ready', (data) => {
    console.log('whatsapp.ready')
    console.log(data);
})

const main = async () => {
};

main();