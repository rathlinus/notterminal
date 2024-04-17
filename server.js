const express = require("express");
const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server);
const pty = require("node-pty");
const fs = require("fs");

const PORT = 3012;

app.use(express.static("public"));

// Handling server errors
server.on("error", (error) => {
  console.error(`Server error: ${error}`);
});

io.on("connection", (socket) => {
  console.log("Client connected");

  try {
    const shell = pty.spawn("ssh", ["terminal.shop"], {
      name: "xterm-color",
      cols: 80,
      rows: 30,
      cwd: process.env.HOME,
      env: process.env,
    });

    shell.on("data", (data) => {
      socket.emit("data", data);
    });

    shell.on("error", (error) => {
      console.error("Shell error:", error);
      socket.emit("error", "Terminal error.");
    });

    shell.on("exit", (code, signal) => {
      console.log(`Shell exited with code ${code} and signal ${signal}`);
      socket.emit("exit", { code, signal });
    });

    socket.on("data", (data) => {
      shell.write(data);
    });

    socket.on("resize", ({ cols, rows }) => {
      try {
        shell.resize(cols, rows);
      } catch (error) {
        console.error("Error resizing shell:", error);
      }
    });

    socket.on("disconnect", () => {
      shell.kill();
      console.log("Client disconnected");
    });
  } catch (error) {
    console.error("Failed to start shell:", error);
    socket.emit("error", "Failed to start terminal session.");
  }
});

server
  .listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  })
  .on("error", (error) => {
    console.error(`Error starting server: ${error}`);
  });
