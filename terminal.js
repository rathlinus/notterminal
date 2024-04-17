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

  // Read user number from file and increment it
  try {
    let usernumber = fs.readFileSync("usernumber.txt", "utf8").trim();
    usernumber = parseInt(usernumber);
    if (isNaN(usernumber)) {
      throw new Error("The content of usernumber.txt is not a valid number.");
    }
    usernumber++;
    console.log(usernumber);
    fs.writeFileSync("usernumber.txt", usernumber.toString());
  } catch (error) {
    console.error("Failed to process usernumber.txt:", error);
    // Optionally, handle the error more specifically e.g., notify the client
    socket.emit("error", "Server error: could not process user number.");
  }

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
