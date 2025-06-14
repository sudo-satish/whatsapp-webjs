const { createClient } = require('redis');

// Create Redis client
const client = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

// Create separate clients for pub/sub to avoid blocking
const publisher = client.duplicate();
const subscriber = client.duplicate();

// Connect to Redis
async function connect() {
    try {
        await client.connect();
        await publisher.connect();
        await subscriber.connect();
        console.log('Connected to Redis');
    } catch (error) {
        console.error('Redis connection error:', error);
        throw error;
    }
}

// Subscribe to a channel
async function subscribe(channel, callback) {
    try {
        await subscriber.subscribe(channel, (message) => {
            callback(message);
        });
        console.log(`Subscribed to channel: ${channel}`);
    } catch (error) {
        console.error(`Error subscribing to channel ${channel}:`, error);
        throw error;
    }
}

// Publish to a channel
async function publish(channel, message) {
    try {
        await publisher.publish(channel, message);
        console.log(`Published to channel ${channel}: ${message}`);
    } catch (error) {
        console.error(`Error publishing to channel ${channel}:`, error);
        throw error;
    }
}

// Unsubscribe from a channel
async function unsubscribe(channel) {
    try {
        await subscriber.unsubscribe(channel);
        console.log(`Unsubscribed from channel: ${channel}`);
    } catch (error) {
        console.error(`Error unsubscribing from channel ${channel}:`, error);
        throw error;
    }
}

// Close Redis connections
async function disconnect() {
    try {
        await client.quit();
        await publisher.quit();
        await subscriber.quit();
        console.log('Disconnected from Redis');
    } catch (error) {
        console.error('Error disconnecting from Redis:', error);
        throw error;
    }
}

module.exports = {
    connect,
    subscribe,
    publish,
    unsubscribe,
    disconnect,
    client
};
