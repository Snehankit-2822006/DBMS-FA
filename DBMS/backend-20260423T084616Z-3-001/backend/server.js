const express = require('express');
const cors = require('cors');
const db = require('./db');
const path = require('path');
const multer = require('multer');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Multer Storage config
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../frontend/uploads/'))
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, uniqueSuffix + '-' + file.originalname.replace(/\\s+/g, '-'))
    }
});
const upload = multer({ storage: storage });

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-admin-key';

function authenticateAdmin(req, res, next) {
    const authHeader = req.headers.authorization;
    if (authHeader) {
        const token = authHeader.split(' ')[1];
        jwt.verify(token, JWT_SECRET, (err, user) => {
            if (err) return res.status(403).json({ error: 'Forbidden' });
            next();
        });
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
}

const app = express();
app.use(cors());
app.use(express.json());

// Serve the frontend static files
app.use(express.static(path.join(__dirname, '../frontend')));

// Get all events
app.get('/api/events', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM events ORDER BY event_date ASC');
        res.json(rows);
    } catch (error) {
        console.error('ERROR FETCH EVENTS:', error);
        res.status(500).json({ error: 'Failed to fetch events' });
    }
});

// Get a single event with its seats
app.get('/api/events/:id', async (req, res) => {
    const eventId = req.params.id;
    try {
        const [events] = await db.query('SELECT * FROM events WHERE id = ?', [eventId]);
        if (events.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }
        
        const [seats] = await db.query('SELECT * FROM seats WHERE event_id = ? ORDER BY id ASC', [eventId]);
        res.json({ event: events[0], seats });
    } catch (error) {
        console.error('ERROR FETCH EVENT DETAILS:', error);
        res.status(500).json({ error: 'Failed to fetch event details' });
    }
});

// Book a seat (uses transaction)
app.post('/api/bookings', async (req, res) => {
    const { event_id, seat_id, user_name, user_email, amount, payment_method } = req.body;

    if (!event_id || !seat_id || !user_name || !user_email || !amount || !payment_method) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        // Check if the seat is still available (lock for update to prevent race conditions)
        const [seats] = await connection.query(
            'SELECT * FROM seats WHERE id = ? AND event_id = ? FOR UPDATE',
            [seat_id, event_id]
        );

        if (seats.length === 0) {
            await connection.rollback();
            return res.status(404).json({ error: 'Seat not found' });
        }

        if (seats[0].status === 'Booked') {
            await connection.rollback();
            return res.status(400).json({ error: 'Seat is already booked' });
        }

        // Change seat status to booked
        await connection.query(
            'UPDATE seats SET status = "Booked" WHERE id = ?',
            [seat_id]
        );

        // Add the booking
        const [bookingResult] = await connection.query(
            'INSERT INTO bookings (event_id, seat_id, user_name, user_email) VALUES (?, ?, ?, ?)',
            [event_id, seat_id, user_name, user_email]
        );

        const bookingId = bookingResult.insertId;

        // Add the payment record
        await connection.query(
            'INSERT INTO payments (booking_id, amount, payment_method, payment_status) VALUES (?, ?, ?, ?)',
            [bookingId, amount, payment_method, 'Completed']
        );

        await connection.commit();

        res.json({ success: true, booking_id: bookingResult.insertId, message: 'Booking successful!' });
    } catch (error) {
        await connection.rollback();
        console.error('ERROR BOOKING:', error);
        res.status(500).json({ error: 'Booking failed. Try again.' });
    } finally {
        connection.release();
    }
});

// Get user bookings by email
app.get('/api/bookings/user/:email', async (req, res) => {
    try {
        const [bookings] = await db.query(`
            SELECT b.id, b.user_name, b.user_email, b.booking_time, 
                   e.title as event_title, e.event_date, e.location, 
                   s.seat_number, p.amount, p.payment_status, p.payment_method 
            FROM bookings b 
            JOIN events e ON b.event_id = e.id 
            JOIN seats s ON b.seat_id = s.id 
            JOIN payments p ON b.id = p.booking_id
            WHERE b.user_email = ?
            ORDER BY b.booking_time DESC
        `, [req.params.email]);
        res.json(bookings);
    } catch (error) {
        console.error('ERROR FETCH USER BOOKINGS:', error);
        res.status(500).json({ error: 'Failed to fetch user bookings' });
    }
});

// Admin Login
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === 'admin123') {
        const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '12h' });
        res.json({ success: true, token });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

// Admin: Get all bookings
app.get('/api/admin/bookings', authenticateAdmin, async (req, res) => {
    try {
        const [bookings] = await db.query(`
            SELECT b.id, b.user_name, b.user_email, b.booking_time, 
                   e.title as event_title, s.seat_number,
                   p.amount, p.payment_status, p.payment_method 
            FROM bookings b 
            JOIN events e ON b.event_id = e.id 
            JOIN seats s ON b.seat_id = s.id 
            JOIN payments p ON b.id = p.booking_id
            ORDER BY b.booking_time DESC
        `);
        res.json(bookings);
    } catch (error) {
        console.error('ERROR FETCH ADMIN BOOKINGS:', error);
        res.status(500).json({ error: 'Failed to fetch admin bookings' });
    }
});

// Admin: Add new event
app.post('/api/admin/events', authenticateAdmin, upload.single('image'), async (req, res) => {
    const { title, description, event_date, location, seat_capacity } = req.body;
    
    // Check if file was uploaded, map to web readable path
    const image_url = req.file ? '/uploads/' + req.file.filename : null;
    
    if (!title || !event_date || !location || !seat_capacity) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [eventResult] = await connection.query(
            'INSERT INTO events (title, description, event_date, location, image_url) VALUES (?, ?, ?, ?, ?)',
            [title, description, event_date, location, image_url]
        );
        
        const eventId = eventResult.insertId;
        const totalSeats = parseInt(seat_capacity);
        const seatsData = [];
        
        for (let i = 1; i <= totalSeats; i++) {
            seatsData.push([eventId, `S-${i}`, 'Available']);
        }

        if (seatsData.length > 0) {
            await connection.query(
                'INSERT INTO seats (event_id, seat_number, status) VALUES ?',
                [seatsData]
            );
        }

        await connection.commit();
        res.json({ success: true, message: 'Event and seats created' });
    } catch (error) {
        await connection.rollback();
        console.error('ERROR CREATE EVENT:', error);
        res.status(500).json({ error: 'Failed to create event' });
    } finally {
        connection.release();
    }
});

// Admin: Delete event
app.delete('/api/admin/events/:id', authenticateAdmin, async (req, res) => {
    try {
        await db.query('DELETE FROM events WHERE id = ?', [req.params.id]);
        res.json({ success: true, message: 'Event deleted' });
    } catch (error) {
        console.error('ERROR DELETE EVENT:', error);
        res.status(500).json({ error: 'Failed to delete event' });
    }
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('GLOBAL ERROR:', err);
    res.status(500).json({ 
        error: 'Internal Server Error',
        message: err.message
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
