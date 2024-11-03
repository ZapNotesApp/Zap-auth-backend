import express from 'express';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { readFile, writeFile } from 'fs/promises';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, 'db.json');

// Database operations
async function readDb() {
    try {
        const data = await readFile(DB_PATH, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        // If file doesn't exist or is empty, return default structure
        return { users: [] };
    }
}

async function writeDb(data) {
    await writeFile(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

const app = express();

// Middleware
app.use(express.json());

// CORS middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Auth routes
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const db = await readDb();

        // Check if user exists
        const existingUser = db.users.find(user => user.email === email);
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user
        const newUser = {
            id: Date.now().toString(),
            email,
            password: hashedPassword
        };

        // Add to database
        db.users.push(newUser);
        await writeDb(db);

        // Create JWT
        const token = jwt.sign(
            { userId: newUser.id },
            'your_jwt_secret',
            { expiresIn: '1d' }
        );

        res.status(201).json({
            token,
            user: {
                id: newUser.id,
                email: newUser.email
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Server error during registration' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const db = await readDb();

        // Find user
        const user = db.users.find(user => user.email === email);
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Check password
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Create JWT
        const token = jwt.sign(
            { userId: user.id },
            'your_jwt_secret',
            { expiresIn: '1d' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login' });
    }
});

// Start server
const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Error handling
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection:', error);
});