import amqp from "amqplib";
import processMessage from "./processor";
import logger from "./logging";

class Worker {
  private connection!: amqp.Connection;
  private channel!: amqp.Channel;
  private queue!: string;

  async connect() {
    if (!this.channel) {
      this.queue = "all_requests";
      this.connection = await amqp.connect("amqp://localhost:5672");
      this.channel = await this.connection.createChannel();
      await this.channel.assertQueue(this.queue, { durable: true });
      logger.info("Connected to rMQ");
    } else {
      return 'Channel connection already exists';
    }
  }

  async listenForRequests() {
    this.channel.prefetch(100);
    logger.info(`Waiting for messages in queue: ${this.queue}`);
    this.channel.consume(
      this.queue,
      (msg: any) => {
        const json = JSON.parse(msg.content.toString()); 
        this.channel.ack(msg);
        processMessage(json);
      },
      { noAck: false }
    );
  }
}

export default new Worker();
