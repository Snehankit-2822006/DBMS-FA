-- Database Creation
CREATE DATABASE IF NOT EXISTS event_booking_system;
USE event_booking_system;

-- Events Table
CREATE TABLE IF NOT EXISTS events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    event_date DATETIME NOT NULL,
    location VARCHAR(255) NOT NULL,
    image_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seats Table
CREATE TABLE IF NOT EXISTS seats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    seat_number VARCHAR(10) NOT NULL,
    status ENUM('Available', 'Booked') DEFAULT 'Available',
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    UNIQUE(event_id, seat_number)
);

-- Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_id INT NOT NULL,
    seat_id INT NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    booking_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (seat_id) REFERENCES seats(id) ON DELETE CASCADE
);

-- Insert Dummy Data for Events
INSERT IGNORE INTO events (id, title, description, event_date, location, image_url) VALUES 
(1, 'Tech Conference 2026', 'A large tech conference describing the future of agentic AI.', '2026-10-15 10:00:00', 'Virtual / Online', 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80'),
(2, 'Music Festival Summer', 'The ultimate music experience with top DJs and artists.', '2026-07-20 18:00:00', 'Central Park Arena', 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800&q=80');

-- Insert Dummy Seats to the first event
INSERT IGNORE INTO seats (event_id, seat_number, status) VALUES 
(1, 'A1', 'Available'), (1, 'A2', 'Available'), (1, 'A3', 'Available'), (1, 'A4', 'Booked'), (1, 'A5', 'Available'),
(1, 'B1', 'Available'), (1, 'B2', 'Available'), (1, 'B3', 'Booked'), (1, 'B4', 'Available'), (1, 'B5', 'Available');

-- Insert Dummy Seats to the second event
INSERT IGNORE INTO seats (event_id, seat_number, status) VALUES 
(2, 'VIP-1', 'Available'), (2, 'VIP-2', 'Available'), (2, 'VIP-3', 'Available'),
(2, 'Gen-1', 'Available'), (2, 'Gen-2', 'Booked'), (2, 'Gen-3', 'Available');

-- Payments Table
CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_status ENUM('Pending', 'Completed', 'Failed') DEFAULT 'Completed',
    payment_method VARCHAR(50) NOT NULL,
    payment_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

