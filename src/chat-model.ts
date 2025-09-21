import {
  AbstractChatModel,
  IChatMessage,
  IChatModel,
  INewMessage
} from '@jupyter/chat';
import { User } from '@jupyterlab/services';
import { UUID } from '@lumino/coreutils';

import { IWebRTCConnections } from './tokens';
import { WebRTCConnections } from './webRTCConnections';

export class ChatModel extends AbstractChatModel {
  constructor(options: ChatModel.IOption) {
    super(options);
    this._user = options.user;
    this._rtcConnection =
      options.webRtcConnections ?? new WebRTCConnections({});
    this._rtcConnection.login(this._user.username);

    this._rtcConnection.onMessageReceived = (message: IChatMessage) => {
      this.messageAdded(message);
    };

    this._rtcConnection.serverChanged.connect(() => {
      this._rtcConnection.login(this._user.username);
    });
  }

  sendMessage(message: INewMessage): Promise<boolean | void> | boolean | void {
    const chatMessage: IChatMessage = {
      id: message.id ?? UUID.uuid4(),
      type: 'msg',
      body: message.body,
      sender: this._user,
      time: Date.now() / 1000
    };
    this.messageAdded(chatMessage);
    this._rtcConnection.sendMessage(chatMessage);
  }

  createChatContext(): any {
    return {};
  }

  private _rtcConnection: IWebRTCConnections;
  private _user: User.IIdentity;
}

export namespace ChatModel {
  export interface IOption extends IChatModel.IOptions {
    user: User.IIdentity;
    webRtcConnections?: IWebRTCConnections;
  }
}
