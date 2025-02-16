import express, { Request, Response } from "express";
import mysql from "mysql2";
import dotenv from "dotenv";
import cors from "cors";
import session from "express-session";


dotenv.config();

const app = express();
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000", // Only allow frontend
    credentials: true, // Allow cookies & session auth
  })
);
app.use(express.json());

// Session middleware
app.use(
  session({
    secret: "your-secret-key", // Replace with a secret key
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }, // Set to true for HTTPS
  })
);

declare module 'express-session' {
  interface SessionData {
    user: any;
  }
}

// Database connection
const db = mysql.createConnection({
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

// User Login API
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  db.query(
    "SELECT * FROM users WHERE username = ? AND password = ?",
    [username, password],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });

      if ((results as any[]).length > 0) {
        req.session.user = (results as any[])[0]; // Save user in session
        return res.json({ message: "Login successful", user: (results as any[])[0] });
      } else {
        return res.status(401).json({ error: "Invalid credentials" });
      }
    }
  );
});

// ✅ Register API
app.post("/register", (req, res) => {
  const { username, password } = req.body;

  db.query(
    "INSERT INTO users (username, password) VALUES (?, ?)",
    [username, password],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });

      // Fetch the newly registered user
      db.query(
        "SELECT id, username FROM users WHERE username = ?",
        [username],
        (err, userResults) => {
          if (err) return res.status(500).json({ error: err.message });

          const user = (userResults as any[])[0];

          res.status(201).json({ message: "User registered successfully", user });
        }
      );
    }
  );
});

// Logout API - Clears the session
app.post("/logout", (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: "Failed to logout" });
    }
    res.clearCookie("connect.sid"); // Clear session cookie
    res.status(200).json({ message: "Logged out successfully" });
  });
});

/// Create Quiz API
app.post("/quizzes", (req: Request, res: Response) => {
  const { title, description, teacher_id } = req.body;
  db.query(
    "INSERT INTO quizzes (title, description, teacher_id) VALUES (?, ?, ?)",
    [title, description, teacher_id],
    (err, results) => {
      if (err) return res.status(500).json({ error: err.message });

      res.status(201).json({ message: "Quiz created successfully" });
    }
  );
});

// Get All Quizzes
app.get("/quizzes", (req: Request, res: Response) => {
  try {
    // Query to get all quizzes from the database
    db.query(
      "SELECT id, title, description, teacher_id, DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') AS created_at FROM quizzes",
      (err, quizzes) => {
        if (err) {
          return res.status(500).json({ error: "Error fetching quizzes" });
        }
        // Send the list of all quizzes in response
        res.json(quizzes);
      }
    );
  } catch (error) {
    res.status(500).json({ error: "Error fetching quizzes" });
  }
});



 // Get all quizzes for the logged-in teacher (based on session teacher_id)
// app.get("/quizzes/teacher", (req: Request, res: Response) => {
//     const teacher_id = req.session.user?.id; // Retrieve teacher_id from session
    
//     if (!teacher_id) {
//       return res.status(401).json({ error: "Unauthorized. Please log in." });
//     }
  
//     try {
//       db.query(
//         "SELECT * FROM quizzes WHERE teacher_id = ?",
//         [teacher_id],
//         (err, quizzes) => {
//           if (err) {
//             return res.status(500).json({ error: "Error fetching quizzes" });
//           }
//           res.json(quizzes);  // Return quizzes created by the logged-in teacher
//         }
//       );
//     } catch (error) {
//       res.status(500).json({ error: "Error fetching quizzes" });
//     }
//   });

  
// Get a specific quiz by ID
app.get("/quizzes/:id", (req: Request, res: Response) => {
    const { id } = req.params;  // Retrieve the quiz ID from the URL parameters
  
    try {
      // Query the database to fetch the quiz by its ID
      db.query(
        "SELECT title, description FROM quizzes WHERE id = ?",
        [id],
        (err, results) => {
          if (err) {
            return res.status(500).json({ error: "Error fetching quiz details" });
          }
  
          if ((results as any[]).length > 0) {
            // Return the quiz details (title and description)
            res.json((results as any[])[0]);
          } else {
            // If no quiz is found with the given ID
            res.status(404).json({ error: "Quiz not found" });
          }
        }
      );
    } catch (error) {
      res.status(500).json({ error: "Error fetching quiz details" });
    }
  });
    

// Update Quiz API
app.put("/quizzes/:id", (req: Request, res: Response) => {
    const { id } = req.params;
    const { title, description } = req.body;

    db.query("UPDATE quizzes SET title = ?, description = ? WHERE id = ?", [title, description, id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });

        res.json({ message: "Quiz updated successfully" });
    });
});

// Delete Quiz API
app.delete("/quizzes/:id", (req: Request, res: Response) => {
    const { id } = req.params;

    db.query("DELETE FROM quizzes WHERE id = ?", [id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });

        res.json({ message: "Quiz deleted successfully" });
    });
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
