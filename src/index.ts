import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { ChatModel } from './chat-model';
import { buildChatSidebar } from '@jupyter/chat';

/**
 * Initialization data for the jupyter-webrtc-chat extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'jupyter-webrtc-chat:plugin',
  description: 'A JupyterLab extension providing a chat over webRTC.',
  autoStart: true,
  requires: [IRenderMimeRegistry],
  optional: [ISettingRegistry],
  activate: (
    app: JupyterFrontEnd,
    rmRegistry: IRenderMimeRegistry,
    settingRegistry: ISettingRegistry | null
  ) => {
    const { user } = app.serviceManager;
    Promise.all([app.restored, user.ready]).then(() => {
      const model = new ChatModel({ user: user.identity! });
      const chat = buildChatSidebar({ model, rmRegistry });
      app.shell.add(chat, 'left');
    });
  }
};

export default plugin;
