const API_URL = 'http://localhost:3000/api';

// Fetch all events for the homepage
async function fetchEvents() {
    try {
        const response = await fetch(`${API_URL}/events`);
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to fetch events');
        }
        const events = await response.json();
        
        const grid = document.getElementById('events-grid');
        const loader = document.getElementById('loader');
        
        loader.style.display = 'none';
        
        if (events.length === 0) {
            grid.innerHTML = '<p>No upcoming events found.</p>';
            return;
        }

        events.forEach(event => {
            const date = new Date(event.event_date).toLocaleDateString('en-US', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });

            const card = document.createElement('div');
            card.className = 'event-card';
            card.innerHTML = `
                <img src="${event.image_url || 'https://via.placeholder.com/400x200?text=Event'}" alt="${event.title}" class="event-image">
                <div class="event-details">
                    <h3 class="event-title">${event.title}</h3>
                    <div class="event-meta">📅 ${date}</div>
                    <div class="event-meta">📍 ${event.location}</div>
                    <a href="event.html?id=${event.id}" class="btn">View & Book Seats</a>
                </div>
            `;
            grid.appendChild(card);
        });

    } catch (error) {
        console.error('Error fetching events:', error);
        document.getElementById('loader').innerText = 'Failed to load events.';
    }
}

// Variables for state
let currentEventId = null;
let selectedSeatId = null;
let selectedSeatNumber = null;

// Fetch event details and seats
async function fetchEventDetails(id) {
    try {
        const response = await fetch(`${API_URL}/events/${id}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Event not found');
        
        currentEventId = data.event.id;

        document.getElementById('loader').style.display = 'none';
        document.getElementById('event-details-container').style.display = 'block';

        // Render Hero
        const date = new Date(data.event.event_date).toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });

        document.getElementById('event-hero').innerHTML = `
            <img src="${data.event.image_url || 'https://via.placeholder.com/400x200'}" alt="${data.event.title}">
            <div class="event-info">
                <h1>${data.event.title}</h1>
                <p><strong>Date:</strong> ${date}</p>
                <p><strong>Location:</strong> ${data.event.location}</p>
                <p>${data.event.description}</p>
            </div>
        `;

        // Render Seats
        const seatGrid = document.getElementById('seat-grid');
        seatGrid.innerHTML = '';

        data.seats.forEach(seat => {
            const seatEl = document.createElement('div');
            seatEl.className = `seat ${seat.status.toLowerCase()}`;
            seatEl.innerText = seat.seat_number;
            
            if (seat.status === 'Available') {
                seatEl.onclick = () => selectSeat(seatEl, seat.id, seat.seat_number);
            }
            
            seatGrid.appendChild(seatEl);
        });

    } catch (error) {
        console.error(error);
        document.getElementById('loader').innerText = 'Failed to load event details.';
    }
}

function selectSeat(element, id, number) {
    // Deselect previous
    const previous = document.querySelector('.seat.selected');
    if (previous) {
        previous.classList.remove('selected');
    }

    // Select new
    element.classList.add('selected');
    selectedSeatId = id;
    selectedSeatNumber = number;

    // Show form
    const form = document.getElementById('booking-form');
    form.classList.add('visible');
    document.getElementById('selected-seat-label').innerText = number;
    
    // Smooth scroll to form
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function submitBooking(e) {
    e.preventDefault();
    
    if (!selectedSeatId) return alert('Please select a seat');

    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const payment_method = document.getElementById('payment_method').value;
    const amount = document.getElementById('amount').value;
    const btn = document.getElementById('submitBtn');
    const msg = document.getElementById('form-msg');

    btn.disabled = true;
    btn.innerText = 'Processing...';
    msg.innerText = '';
    msg.style.color = '';

    try {
        const response = await fetch(`${API_URL}/bookings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                event_id: currentEventId,
                seat_id: selectedSeatId,
                user_name: name,
                user_email: email,
                payment_method: payment_method,
                amount: amount
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Failed to book');
        }

        msg.style.color = 'var(--success)';
        msg.innerText = '🎉 Booking successful! Refreshing...';
        
        setTimeout(() => {
            window.location.reload();
        }, 2000);

    } catch (error) {
        console.error(error);
        msg.style.color = 'var(--danger)';
        msg.innerText = '❌ ' + error.message;
        btn.disabled = false;
        btn.innerText = 'Confirm Booking';
    }
}
