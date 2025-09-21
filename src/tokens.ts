// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { IChatMessage } from '@jupyter/chat';
import { Token } from '@lumino/coreutils';

export interface IWebRTCConnections {
  login(name: string): void;
  handleConnection(name: string): boolean;
  sendMessage(message: IChatMessage): boolean[];
  onMessageReceived: (message: IChatMessage) => void;
  readonly peers: Map<string, IPeer>;
}

export interface IPeer {
  connection?: RTCPeerConnection;
  channel?: RTCDataChannel;
}

export const IWebRTCConnections = new Token<IWebRTCConnections>(
  '@jupyter/collaboration:IRTCConnection'
);
