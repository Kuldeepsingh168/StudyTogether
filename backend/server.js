const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();

app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 5000;

const rooms = {};
let waitingStudent = null;
const liveStudents = {};
const roomTimers = {};

app.get("/", (req, res) => {
  res.send("StudyTogether Server is Running 🚀");
});

function broadcastLiveStudentCount() {
  const count = Object.values(liveStudents).filter(
    (student) => student.status === "studying"
  ).length;

  io.emit("live-student-count", count);

  console.log("Students currently studying:", count);
}

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // JOIN ROOM
  socket.on("join-room", ({ room, name }) => {
    socket.join(room);

    if (!rooms[room]) {
      rooms[room] = [];
    }

    rooms[room].push({
      id: socket.id,
      name: name,
      status: "studying",
    });

    if (!roomTimers[room]) {
      roomTimers[room] = {
        startedAt: Date.now(),
        running: true,
      };
    }

    liveStudents[socket.id] = {
      name: name,
      room: room,
      status: "studying",
    };

    io.to(room).emit("room-users", rooms[room]);

    io.to(room).emit("room-timer", roomTimers[room]);

    broadcastLiveStudentCount();

    console.log(name + " joined room: " + room);
  });

  // STUDY STATUS
  socket.on("study-status", ({ status }) => {
    console.log("Student " + socket.id + " status: " + status);

    if (liveStudents[socket.id]) {
      liveStudents[socket.id].status = status;
    }

    for (const room in rooms) {
      const student = rooms[room].find(
        (user) => user.id === socket.id
      );

      if (student) {
        student.status = status;

        io.to(room).emit("room-users", rooms[room]);

        break;
      }
    }

    broadcastLiveStudentCount();
  });

  // QUICK MATCH
  socket.on("quick-match", ({ name }) => {
    console.log(name + " wants Quick Match");

    if (!waitingStudent) {
      waitingStudent = {
        id: socket.id,
        name: name,
      };

      console.log(name + " is waiting for a match");

      return;
    }

    const firstStudent = waitingStudent;

    waitingStudent = null;

    const roomName =
      "quick-" + firstStudent.id + "-" + socket.id;

    socket.join(roomName);

    const firstSocket = io.sockets.sockets.get(
      firstStudent.id
    );

    if (firstSocket) {
      firstSocket.join(roomName);
    }

    rooms[roomName] = [
      {
        id: firstStudent.id,
        name: firstStudent.name,
        status: "studying",
      },
      {
        id: socket.id,
        name: name,
        status: "studying",
      },
    ];

    roomTimers[roomName] = {
      startedAt: Date.now(),
      running: true,
    };

    liveStudents[firstStudent.id] = {
      name: firstStudent.name,
      room: roomName,
      status: "studying",
    };

    liveStudents[socket.id] = {
      name: name,
      room: roomName,
      status: "studying",
    };

    io.to(roomName).emit("quick-match-found", {
      room: roomName,
      users: rooms[roomName],
    });

    io.to(roomName).emit(
      "room-timer",
      roomTimers[roomName]
    );

    broadcastLiveStudentCount();

    console.log(
      "Quick Match: " +
        firstStudent.name +
        " + " +
        name
    );
  });

  // LEAVE ROOM
  socket.on("leave-room", () => {
    console.log("Leave room request:", socket.id);

    delete liveStudents[socket.id];

    for (const room in rooms) {
      const userIndex = rooms[room].findIndex(
        (user) => user.id === socket.id
      );

      if (userIndex !== -1) {
        rooms[room].splice(userIndex, 1);

        socket.leave(room);

        io.to(room).emit("room-users", rooms[room]);

        console.log("User left room:", socket.id);

        if (rooms[room].length === 0) {
          delete rooms[room];
          delete roomTimers[room];
        }

        break;
      }
    }

    if (
      waitingStudent &&
      waitingStudent.id === socket.id
    ) {
      waitingStudent = null;

      console.log(
        "Quick Match cancelled:",
        socket.id
      );
    }

    broadcastLiveStudentCount();
  });

  // DISCONNECT
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);

    delete liveStudents[socket.id];

    if (
      waitingStudent &&
      waitingStudent.id === socket.id
    ) {
      waitingStudent = null;

      console.log("Waiting student left");
    }

    for (const room in rooms) {
      const userIndex = rooms[room].findIndex(
        (user) => user.id === socket.id
      );

      if (userIndex !== -1) {
        rooms[room].splice(userIndex, 1);

        io.to(room).emit("room-users", rooms[room]);

        console.log(
          "User removed from room:",
          socket.id
        );

        if (rooms[room].length === 0) {
          delete rooms[room];
          delete roomTimers[room];
        }

        break;
      }
    }

    broadcastLiveStudentCount();
  });
});

server.listen(PORT, () => {
  console.log(
    "StudyTogether server running on port " + PORT
  );
});