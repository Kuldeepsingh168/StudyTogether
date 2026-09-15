import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import "./App.css";

const socket = io("https://studytogether-5faaum8d.b4a.run");

function App() {
  const [name, setName] = useState("");
  const [quickMatch, setQuickMatch] = useState(false);
  const [room, setRoom] = useState("");
  const [joined, setJoined] = useState(false);

  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(true);

  const [students, setStudents] = useState([]);
  const [liveStudents, setLiveStudents] = useState(0);

  const [roomTimer, setRoomTimer] = useState(null);

  useEffect(() => {
    if (!joined || !isRunning) return;

    const timer = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [joined, isRunning]);

  useEffect(() => {
    const handleRoomUsers = (users) => {
      setStudents(users);
    };

    socket.on("room-users", handleRoomUsers);

    return () => {
      socket.off("room-users", handleRoomUsers);
    };
  }, []);

  useEffect(() => {
    const handleQuickMatch = (data) => {
      setRoom(data.room);
      setStudents(data.users);
      setJoined(true);
      setQuickMatch(true);
      setIsRunning(true);
    };

    socket.on("quick-match-found", handleQuickMatch);

    return () => {
      socket.off("quick-match-found", handleQuickMatch);
    };
  }, []);

  useEffect(() => {
    const handleLiveStudents = (count) => {
      setLiveStudents(count);
    };

    socket.on("live-student-count", handleLiveStudents);

    return () => {
      socket.off("live-student-count", handleLiveStudents);
    };
  }, []);

  useEffect(() => {
    const handleRoomTimer = (timer) => {
      setRoomTimer(timer);
    };

    socket.on("room-timer", handleRoomTimer);

    return () => {
      socket.off("room-timer", handleRoomTimer);
    };
  }, []);

  const joinRoom = () => {
    if (!name.trim() || !room.trim()) {
      alert("Please enter your name and room name");
      return;
    }

    socket.emit("join-room", {
      room: room.trim(),
      name: name.trim(),
    });

    setStudents([
      {
        name: name.trim(),
        status: "studying",
      },
    ]);

    setJoined(true);
    setQuickMatch(false);
    setIsRunning(true);
  };

  const startQuickMatch = () => {
    if (!name.trim()) {
      alert("Please enter your name first");
      return;
    }

    socket.emit("quick-match", {
      name: name.trim(),
    });

    setQuickMatch(true);
  };

  const startTimer = () => {
    setIsRunning(true);

    socket.emit("study-status", {
      status: "studying",
    });
  };

  const pauseTimer = () => {
    setIsRunning(false);

    socket.emit("study-status", {
      status: "paused",
    });
  };

  const resetTimer = () => {
    setSeconds(0);
    setIsRunning(false);

    socket.emit("study-status", {
      status: "paused",
    });
  };

  const leaveRoom = () => {
    socket.emit("leave-room");

    setJoined(false);
    setQuickMatch(false);
    setRoom("");
    setStudents([]);
    setSeconds(0);
    setIsRunning(false);
    setRoomTimer(null);
  };

  const formatTime = () => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return (
      String(hours).padStart(2, "0") +
      ":" +
      String(minutes).padStart(2, "0") +
      ":" +
      String(secs).padStart(2, "0")
    );
  };

  if (quickMatch && !joined) {
    return (
      <div className="app">
        <div className="home">
          <div className="logo">🎯</div>

          <h1>Quick Match</h1>

          <p className="subtitle">
            Finding another student for you...
          </p>

          <div className="card">
            <h2>⏳ Please wait</h2>

            <p>
              You will automatically join another student
              when someone is available.
            </p>

            <button onClick={leaveRoom}>
              ❌ Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (joined) {
    return (
      <div className="app">
        <div className="dashboard">
          <h1>📚 StudyTogether</h1>

          <p className="room">
            Room: <strong>{room}</strong>
          </p>

          {quickMatch && (
            <p className="studying">
              🎯 Quick Match successful!
            </p>
          )}

          <div className="timer-card">
            <p>🌍 Students Studying Globally</p>

            <div className="timer">
              {liveStudents}
            </div>

            <p className="studying">
              🟢 Students currently studying
            </p>
          </div>

          <div className="timer-card">
            <p>⏱️ Your Study Time</p>

            <div className="timer">
              {formatTime()}
            </div>

            <p className="studying">
              {isRunning
                ? "🔥 You are studying"
                : "⏸️ Study paused"}
            </p>

            <div className="timer-buttons">
              <button onClick={startTimer}>
                ▶️ Start
              </button>

              <button onClick={pauseTimer}>
                ⏸️ Pause
              </button>

              <button onClick={resetTimer}>
                🔄 Reset
              </button>
            </div>
          </div>

          {roomTimer && (
            <div className="timer-card">
              <p>👥 Room Study Session</p>

              <p className="studying">
                🟢 Shared room timer connected
              </p>
            </div>
          )}

          <div className="students-card">
            <h2>👥 Students Studying</h2>

            <p className="count">
              🟢 {students.length}{" "}
              {students.length === 1
                ? "student"
                : "students"}{" "}
              online
            </p>

            <div className="student-list">
              {students.map((student, index) => (
                <div
                  className="student"
                  key={student.name + "-" + index}
                >
                  <div className="avatar">
                    {student.name
                      .charAt(0)
                      .toUpperCase()}
                  </div>

                  <div>
                    <strong>
                      {student.name}
                      {student.name === name &&
                        " (You)"}
                    </strong>

                    <p>
                      {student.status === "studying"
                        ? "🟢 Studying now"
                        : "⏸️ Paused"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={leaveRoom}
            className="leave-button"
          >
            🚪 Leave Room
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="home">
        <div className="logo">📚</div>

        <h1>StudyTogether</h1>

        <p className="subtitle">
          Study together. Stay focused. Achieve more.
        </p>

        <div className="card">
          <h2>🚀 Join Study Room</h2>

          <input
            type="text"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <input
            type="text"
            placeholder="Enter room name"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
          />

          <button onClick={joinRoom}>
            Join Room
          </button>

          <button onClick={startQuickMatch}>
            🎯 Quick Match
          </button>
        </div>

        <div className="features">
          <div>
            <span>⏱️</span>
            <h3>Live Timer</h3>
            <p>Track your study time</p>
          </div>

          <div>
            <span>👥</span>
            <h3>Study Together</h3>
            <p>Study with real students</p>
          </div>

          <div>
            <span>🔥</span>
            <h3>Stay Focused</h3>
            <p>Study with other students</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;