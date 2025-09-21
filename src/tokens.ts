import { IChatMessage } from '@jupyter/chat';
import { Token } from '@lumino/coreutils';
import { ISignal } from '@lumino/signaling';

export interface IWebRTCConnections {
  login(name: string): void;
  handleConnection(name: string): boolean;
  sendMessage(message: IChatMessage): boolean[];
  onMessageReceived: (message: IChatMessage) => void;
  readonly peers: Map<string, IPeer>;
  readonly serverChanged: ISignal<IWebRTCConnections, void>;
}

export interface IPeer {
  connection?: RTCPeerConnection;
  channel?: RTCDataChannel;
}

export const IWebRTCConnections = new Token<IWebRTCConnections>(
  'jupyter-webrtc-chat:WebRTCConnection'
);
