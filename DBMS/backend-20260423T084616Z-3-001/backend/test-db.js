const mysql = require('mysql2/promise');

async function test() {
    const pool = mysql.createPool({
        host: 'localhost',
        user: 'root',
        password: 'Harshal@97',
        database: 'event_booking_system'
    });
    try {
        const [rows] = await pool.query('SELECT * FROM events ORDER BY event_date ASC');
        console.log('SUCCESS:', rows.length);
    } catch (err) {
        console.log('ERROR:', JSON.stringify(err, null, 2));
    } finally {
        await pool.end();
    }
}

test();
