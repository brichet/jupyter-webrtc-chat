import json

from jupyter_server.base.handlers import JupyterHandler
from jupyter_server.utils import url_path_join
from tornado.ioloop import IOLoop
from tornado.websocket import WebSocketHandler

class RouteHandler(WebSocketHandler, JupyterHandler):
    _users = {}

    def check_origin(self, origin):
        # Allow every origins
        return True

    def initialize(self):
        self.username = ''

    def on_close(self):
        self.log.warning(f"CLOSING")
        self._users.pop(self.username)
        for username in self._users.keys():
            IOLoop.current().add_callback(
                self._users[username].send,
                {
                    "type": "disconnect",
                    "name": self.username
                }
            )
        return super().on_close()

    async def on_message(self, message):
        self.log.warn(f"MESSAGE {message}")
        data = json.loads(message)
        if data["type"] == "login":
            username = data["name"]
            self.username = username
            self._users[username] = self
            self.log.warn(self._users)
            await self._users[username].send({
                "type": "users",
                "values": list(self._users.keys())
            })
        elif data["type"] == "offer":
            self.log.warn(f"RECEIVED offer\n {message}\n")
            username = data["name"]
            if username in self._users.keys():

                await self._users[username].send({
                    "type": "offer",
                    "offer": data["offer"],
                    "name": self.username
                    })
            else:
                self.log.warn("User does not exist")
        elif data["type"] == "answer":
            self.log.warn(f"RECEIVED answer\n {message}\n")
            username = data["name"]
            if username in self._users.keys():
                await self._users[username].send({
                    "type": "answer",
                    "answer": data["answer"],
                    "name": self.username
                    })
        elif data["type"] == "candidate":
            self.log.warn(f"RECEIVED candidate\n {message}\n")
            username = data["name"]
            if username in self._users.keys():
                await self._users[username].send({
                    "type": "candidate",
                    "candidate": data["candidate"],
                    "name": self.username
                })


    async def send(self, message):
        """
        Send a message to the client.
        """
        # needed to be compatible with WebsocketServer (websocket.send)
        try:
            self.write_message(message, binary=False)
        except Exception as e:
            self.log.debug("Failed to write message", exc_info=e)


def setup_handlers(web_app):
    host_pattern = ".*$"

    base_url = web_app.settings["base_url"]
    route_pattern = url_path_join(base_url, "webrtc_chat")
    handlers = [(route_pattern, RouteHandler)]
    web_app.add_handlers(host_pattern, handlers)


