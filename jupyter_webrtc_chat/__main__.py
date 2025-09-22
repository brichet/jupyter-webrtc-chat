from jupyter_server.serverapp import ServerApp

if __name__ == "__main__":
    app = ServerApp()
    app.initialize(["--port=8889"])
    app.start()
    print(app.display_url.splitlines()[0])