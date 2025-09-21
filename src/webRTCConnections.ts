import { IChatMessage } from '@jupyter/chat';
import { URLExt } from '@jupyterlab/coreutils';
import { ServerConnection } from '@jupyterlab/services';
import { PromiseDelegate, UUID } from '@lumino/coreutils';
import { ISignal, Signal } from '@lumino/signaling';
import { IPeer, IWebRTCConnections } from './tokens';

const SIGNALING_URL = 'webrtc_chat';

const iceConfiguration = {
  iceServers: [{ urls: 'stun:stun.1.google.com:19302' }]
};

export class WebRTCConnections implements IWebRTCConnections {
  constructor(options?: WebRTCConnections.IOptions) {
    let serverUrl: string;
    if (options?.signalingURL) {
      serverUrl = options.signalingURL;
    } else {
      const server = ServerConnection.makeSettings();
      serverUrl = URLExt.join(server.wsUrl, SIGNALING_URL);
    }

    this._websocket = new WebSocket(serverUrl);
    this._initWebSocket();
  }

  get serverUrl(): string {
    return this._websocket.url;
  }
  set serverUrl(value: string) {
    this._websocket.close();
    this._ready = new PromiseDelegate<void>();
    this._websocket = new WebSocket(value);

    this._initWebSocket();
    this._serverChanged.emit();
  }

  get peers(): Map<string, IPeer> {
    return this._peers;
  }

  get serverChanged(): ISignal<IWebRTCConnections, void> {
    return this._serverChanged;
  }

  private _initWebSocket(): void {
    // Set the connection ready when the signaling server connection is opened.
    this._websocket.onopen = () => {
      console.log("It's ready");
      this._ready.resolve();
    };

    // Listen to the messages received from the signaling server.
    this._websocket.onmessage = (message: MessageEvent) => {
      const data = JSON.parse(message.data);
      console.debug('ONMESSAGE', data);
      if (data) {
        switch (data.type) {
          case 'users':
            data.values.forEach((user: string) => {
              if (user !== this._name) {
                this._addConnection(user, true);
              }
            });
            break;
          case 'offer':
            this.onOffer(data);
            break;
          case 'answer':
            this.onAnswer(data);
            break;
          case 'candidate':
            this.onCandidate(data);
            break;
        }
      }
    };
  }

  onMessageReceived = (message: IChatMessage): void => {
    // No-op by default
    // It should be overwritten by the consumer
  };

  login(name: string) {
    this._name = name;
    this._send({ type: 'login', name: name });
  }

  sendMessage = (message: IChatMessage): boolean[] => {
    const status: boolean[] = [];
    this._peers.forEach(peer => {
      if (peer.channel) {
        try {
          peer.channel.send(JSON.stringify(message));
          status.push(true);
        } catch (error) {
          console.error('The message has not been sent', error);
          status.push(false);
        }
      } else {
        status.push(false);
      }
    });
    return status;
  };

  handleConnection = (name: string): boolean => {
    this._addConnection(name, true);
    return !!this._peers.get(name);
  };

  onOffer(data: any) {
    console.debug('OFFER', data);
    this._addConnection(data.name);
    const connection = this._peers.get(data.name)?.connection;
    connection
      ?.setRemoteDescription(new RTCSessionDescription(data.offer))
      .then(() => connection.createAnswer())
      .then(answer => connection.setLocalDescription(answer))
      .then(() => {
        this._send({
          type: 'answer',
          answer: connection.localDescription,
          name: data.name
        });
      });
  }

  onAnswer(data: any) {
    console.debug('ANSWER', data);
    const connection = this._peers.get(data.name)?.connection;
    connection?.setRemoteDescription(new RTCSessionDescription(data.answer));
  }

  onCandidate(data: any) {
    console.debug('ICE CANDIDATE', data);
    const connection = this._peers.get(data.name)?.connection;
    connection?.addIceCandidate(new RTCIceCandidate(data.candidate));
  }

  private _addConnection(name: string, createOffer = false) {
    if (this._peers.get(name)?.connection) {
      this._peers.delete(name);
    }

    const connection = new RTCPeerConnection({
      iceServers: iceConfiguration.iceServers
    });
    connection.onicecandidate = data => {
      console.debug('ICE candidate received', data);
      if (data.candidate) {
        this._send({
          type: 'candidate',
          candidate: data.candidate,
          name: name
        });
      }
    };
    connection.ondatachannel = event => {
      console.debug('Data Channel received', this._peers);
      this._addChannel(name, event.channel);
    };
    this._peers.set(name, { ...this._peers.get(name), connection });
    if (createOffer) {
      const dataChannel = connection.createDataChannel(UUID.uuid4());
      this._addChannel(name, dataChannel);
      connection
        .createOffer()
        .then(offer => connection.setLocalDescription(offer))
        .then(() => {
          this._send({
            type: 'offer',
            offer: connection.localDescription,
            name: name
          });
        });
    }
  }

  private _addChannel(name: string, channel: RTCDataChannel) {
    channel.onopen = () => {
      console.debug(`Data channel with ${name} ready.`);
    };
    channel.onmessage = event => {
      console.log('received message', event);
      console.log('PEERS', this._peers);
      this.onMessageReceived(JSON.parse(event.data));
    };
    channel.onclose = event => {
      this._peers.delete(name);
    };
    this._peers.set(name, { ...this._peers.get(name), channel });
  }

  private _send(data: any): void {
    console.log('SEND', this._websocket, data);
    this._ready.promise.then(() => {
      this._websocket.send(JSON.stringify(data));
    });
  }

  private _name: string = '';
  private _peers = new Map<string, IPeer>();
  private _websocket: WebSocket;
  private _ready = new PromiseDelegate<void>();
  private _serverChanged = new Signal<IWebRTCConnections, void>(this);
}

export namespace WebRTCConnections {
  export interface IOptions {
    signalingURL?: string;
  }
}
