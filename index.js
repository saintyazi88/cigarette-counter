const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Initialize the database
db.initializeDatabase();

// API Routes
app.get('/api/data', async (req, res) => {
    try {
        const logEntries = await db.getLogEntries();
        const dailyTarget = await db.getDailyTarget();
        
        res.json({
            logEntries,
            dailyTarget
        });
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch data' 
        });
    }
});

app.post('/api/log', async (req, res) => {
    try {
        const timestamp = await db.addLogEntry();
        
        if (timestamp) {
            res.status(200).json({ 
                success: true,
                timestamp
            });
        } else {
            res.status(500).json({ 
                success: false, 
                error: 'Failed to log entry' 
            });
        }
    } catch (error) {
        console.error('Error logging cigarette:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
});

app.post('/api/undo', async (req, res) => {
    try {
        const success = await db.removeLastLogEntry();
        
        if (success) {
            res.status(200).json({ success: true });
        } else {
            res.status(400).json({ 
                success: false, 
                error: 'No entries to remove' 
            });
        }
    } catch (error) {
        console.error('Error undoing log:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error'
        });
    }
});

app.post('/api/target', async (req, res) => {
    const { target } = req.body;
    
    if (target === undefined || target < 0) {
        return res.status(400).json({ 
            success: false, 
            error: 'Invalid target value' 
        });
    }
    
    try {
        const success = await db.setDailyTarget(target);
        
        if (success) {
            res.status(200).json({ success: true });
        } else {
            res.status(500).json({ 
                success: false, 
                error: 'Failed to save target' 
            });
        }
    } catch (error) {
        console.error('Error setting target:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Internal server error' 
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});