const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      bufferCommands: false // Disable mongoose buffering
    });

    logger.info('mongodb_connected', { host: conn.connection.host });

    mongoose.connection.on('error', (err) => {
      logger.error('mongodb_error', { message: err.message });
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('mongodb_disconnected', {});
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('mongodb_reconnected', {});
    });
  } catch (error) {
    logger.error('mongodb_connection_failed', { message: error.message });
    process.exit(1);
  }
};

module.exports = connectDB; 