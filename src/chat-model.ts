import { AbstractChatModel, IChatMessage, IChatModel, INewMessage } from '@jupyter/chat';
import { WebRTCConnections } from './webRTCConnections';
import { User } from '@jupyterlab/services';
import { UUID } from '@lumino/coreutils';

export class ChatModel extends AbstractChatModel {
  constructor(options: ChatModel.IOption) {
    super(options);
    this._user = options.user;
    this._rtcConnection.login(this._user.username);
    this._rtcConnection.setReceivedMessage((message: IChatMessage) => {
      this.messageAdded(message);
    });
  }

  sendMessage(message: INewMessage): Promise<boolean | void> | boolean | void {
    const chatMessage: IChatMessage = {
        id: message.id ?? UUID.uuid4(),
        type: 'msg',
        body: message.body,
        sender: this._user,
        time: Date.now() / 1000
      }
    this.messageAdded(chatMessage);
    this._rtcConnection.sendMessage(chatMessage);
  }

  createChatContext(): any {
    return {};
  }

  private _rtcConnection = new WebRTCConnections();
  private _user: User.IIdentity;
}

export namespace ChatModel {
  export interface IOption extends IChatModel.IOptions {
    user: User.IIdentity;
  }
}
