from jupyter_server.serverapp import ServerApp
import sys

if __name__ == "__main__":
    app = ServerApp()
    app.initialize(sys.argv[1:])
    app.start()
    print(app.display_url.splitlines()[0])
