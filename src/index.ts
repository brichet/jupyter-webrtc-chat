import { buildChatSidebar } from '@jupyter/chat';
import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { IRenderMimeRegistry } from '@jupyterlab/rendermime';
import { User } from '@jupyterlab/services';
import { ISettingRegistry } from '@jupyterlab/settingregistry';
import { UUID } from '@lumino/coreutils';

import { ChatModel } from './chat-model';
import { IWebRTCConnections } from './tokens';
import { WebRTCConnections } from './webRTCConnections';

const DEFAULT_IDENTITY: User.IIdentity = {
  username: UUID.uuid4(),
  name: 'Anonymous Something',
  display_name: 'Anonymous Something',
  color: '#AABBCC',
  initials: 'AS'
};

/**
 * Initialization data for the jupyter-webrtc-chat extension.
 */
const signaling: JupyterFrontEndPlugin<IWebRTCConnections> = {
  id: 'jupyter-webrtc-chat:signaling-client',
  description: 'A JupyterLab extension providing a chat over webRTC.',
  autoStart: true,
  optional: [ISettingRegistry],
  provides: IWebRTCConnections,
  activate: (
    app: JupyterFrontEnd,
    settingRegistry: ISettingRegistry | null
  ): IWebRTCConnections => {
    const webRtcConnections = new WebRTCConnections();

    function loadSettings(setting: ISettingRegistry.ISettings): void {
      const signalingUrl = setting.get('signalingURL').composite as string;
      if (signalingUrl !== webRtcConnections.serverUrl) {
        webRtcConnections.serverUrl = signalingUrl;
      }
    }
    if (settingRegistry) {
      Promise.all([app.restored, settingRegistry.load(signaling.id)]).then(
        ([, setting]) => {
          loadSettings(setting);

          setting.changed.connect(loadSettings);
        }
      );
    }

    return webRtcConnections;
  }
};

/**
 * Initialization data for the jupyter-webrtc-chat extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'jupyter-webrtc-chat:plugin',
  description: 'A JupyterLab extension providing a chat over webRTC.',
  autoStart: true,
  requires: [IRenderMimeRegistry, IWebRTCConnections],
  optional: [ISettingRegistry],
  activate: (
    app: JupyterFrontEnd,
    rmRegistry: IRenderMimeRegistry,
    webRtcConnections: IWebRTCConnections,
    settingRegistry: ISettingRegistry | null
  ) => {
    const { user } = app.serviceManager;
    Promise.all([app.restored, user.ready]).then(() => {
      const model = new ChatModel({
        user: user.identity ?? DEFAULT_IDENTITY,
        webRtcConnections
      });
      const chat = buildChatSidebar({ model, rmRegistry });
      app.shell.add(chat, 'left');
    });
  }
};

export default [plugin, signaling];
