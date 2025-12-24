import { io } from 'socket.io-client';

export class Network {
    constructor() {
        this.socket = io();
        this.events = {};
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
