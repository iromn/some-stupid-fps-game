import { io } from 'socket.io-client';

export class Network {
    constructor() {
        this.socket = io();
        this.events = {};

        this.socket.onAny((event, ...args) => {
            console.log(`[NETWORK DEBUG] Received: ${event}`, args);
        });
    }

    connect() {
        // socket.io connects automatically on instantiation usually
    }

    emit(event, data) {
        this.socket.emit(event, data);
    }

    on(event, callback) {
        this.socket.on(event, callback);
    }

    get id() {
        return this.socket.id;
    }
}
