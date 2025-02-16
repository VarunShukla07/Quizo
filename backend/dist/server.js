"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const mysql2_1 = __importDefault(require("mysql2"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const express_session_1 = __importDefault(require("express-session"));
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
}));
app.use(express_1.default.json());
app.use((0, express_session_1.default)({
    secret: "your-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
}));
const db = mysql2_1.default.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME,
});
db.connect((err) => {
    if (err) {
        console.error("Database connection failed:", err);
        process.exit(1);
    }
    console.log("Connected to MySQL database");
});
app.post("/login", (req, res) => {
    const { username, password } = req.body;
    db.query("SELECT * FROM users WHERE username = ? AND password = ?", [username, password], (err, results) => {
        if (err)
            return res.status(500).json({ error: err.message });
        if (results.length > 0) {
            req.session.user = results[0];
            return res.json({ message: "Login successful", user: results[0] });
        }
        else {
            return res.status(401).json({ error: "Invalid credentials" });
        }
    });
});
app.post("/register", (req, res) => {
    const { username, password } = req.body;
    db.query("INSERT INTO users (username, password) VALUES (?, ?)", [username, password], (err, results) => {
        if (err)
            return res.status(500).json({ error: err.message });
        db.query("SELECT id, username FROM users WHERE username = ?", [username], (err, userResults) => {
            if (err)
                return res.status(500).json({ error: err.message });
            const user = userResults[0];
            res.status(201).json({ message: "User registered successfully", user });
        });
    });
});
app.post("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: "Failed to logout" });
        }
        res.clearCookie("connect.sid");
        res.status(200).json({ message: "Logged out successfully" });
    });
});
app.post("/quizzes", (req, res) => {
    const { title, description, teacher_id } = req.body;
    db.query("INSERT INTO quizzes (title, description, teacher_id) VALUES (?, ?, ?)", [title, description, teacher_id], (err, results) => {
        if (err)
            return res.status(500).json({ error: err.message });
        res.status(201).json({ message: "Quiz created successfully" });
    });
});
app.get("/quizzes", (req, res) => {
    try {
        db.query("SELECT id, title, description, teacher_id, DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at FROM quizzes", (err, quizzes) => {
            if (err) {
                return res.status(500).json({ error: "Error fetching quizzes" });
            }
            res.json(quizzes);
        });
    }
    catch (error) {
        res.status(500).json({ error: "Error fetching quizzes" });
    }
});
app.get("/quizzes/:id", (req, res) => {
    const { id } = req.params;
    try {
        db.query("SELECT title, description FROM quizzes WHERE id = ?", [id], (err, results) => {
            if (err) {
                return res.status(500).json({ error: "Error fetching quiz details" });
            }
            if (results.length > 0) {
                res.json(results[0]);
            }
            else {
                res.status(404).json({ error: "Quiz not found" });
            }
        });
    }
    catch (error) {
        res.status(500).json({ error: "Error fetching quiz details" });
    }
});
app.put("/quizzes/:id", (req, res) => {
    const { id } = req.params;
    const { title, description } = req.body;
    db.query("UPDATE quizzes SET title = ?, description = ? WHERE id = ?", [title, description, id], (err, results) => {
        if (err)
            return res.status(500).json({ error: err.message });
        res.json({ message: "Quiz updated successfully" });
    });
});
app.delete("/quizzes/:id", (req, res) => {
    const { id } = req.params;
    db.query("DELETE FROM quizzes WHERE id = ?", [id], (err, results) => {
        if (err)
            return res.status(500).json({ error: err.message });
        res.json({ message: "Quiz deleted successfully" });
    });
});
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
//# sourceMappingURL=server.js.map