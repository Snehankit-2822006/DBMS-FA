const API_URL = 'http://localhost:3000/api';

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
});

function checkAuth() {
    const token = localStorage.getItem('adminToken');
    if (token) {
        document.getElementById('loginOverlay').style.display = 'none';
        document.getElementById('adminApp').style.display = 'block';
        loadAdminEvents();
    } else {
        document.getElementById('loginOverlay').style.display = 'flex';
        document.getElementById('adminApp').style.display = 'none';
    }
}

async function adminLogin(e) {
    e.preventDefault();
    const username = document.getElementById('adminUser').value;
    const password = document.getElementById('adminPass').value;
    
    try {
        const response = await fetch(`${API_URL}/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        if (response.ok) {
            localStorage.setItem('adminToken', data.token);
            checkAuth();
        } else {
            document.getElementById('loginError').innerText = data.error;
        }
    } catch (err) {
        document.getElementById('loginError').innerText = 'Server error.';
    }
}

function adminLogout() {
    localStorage.removeItem('adminToken');
    checkAuth();
}

function switchTab(tabId) {
    document.querySelectorAll('.sidebar button').forEach(btn => btn.classList.remove('active'));
    event.currentTarget.classList.add('active');

    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');

    if (tabId === 'events') {
        loadAdminEvents();
    } else if (tabId === 'bookings') {
        loadAdminBookings();
    }
}

async function loadAdminEvents() {
    const list = document.getElementById('admin-events-list');
    list.innerHTML = '<tr><td colspan="5">Loading events...</td></tr>';
    
    try {
        const response = await fetch(`${API_URL}/events`);
        const events = await response.json();
        if (!response.ok) throw new Error(events.error || 'Failed to load events');
        
        list.innerHTML = '';
        
        events.forEach(ev => {
            const date = new Date(ev.event_date).toLocaleString();
            list.innerHTML += `
                <tr>
                    <td>${ev.id}</td>
                    <td>${ev.title}</td>
                    <td>${date}</td>
                    <td>${ev.location}</td>
                    <td>
                        <button class="btn btn-small btn-danger" onclick="deleteEvent(${ev.id})">Delete</button>
                    </td>
                </tr>
            `;
        });
    } catch (error) {
        console.error(error);
        list.innerHTML = '<tr><td colspan="5" style="color:var(--danger)">Failed to load.</td></tr>';
    }
}

async function addEvent(e) {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append('title', document.getElementById('evTitle').value);
    formData.append('description', "New event description.");
    formData.append('event_date', document.getElementById('evDate').value.replace('T', ' ') + ':00');
    formData.append('location', document.getElementById('evLocation').value);
    formData.append('seat_capacity', document.getElementById('evSeats').value);
    
    // Physical File Bind
    const imageFile = document.getElementById('evImage').files[0];
    if (imageFile) {
        formData.append('image', imageFile);
    }

    try {
        const response = await fetch(`${API_URL}/admin/events`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
                // Do not set Content-Type for FormData, browser does it automatically
            },
            body: formData
        });
        
        if (response.ok) {
            alert('Event and Seats successfully created!');
            document.getElementById('addEventForm').style.display = 'none';
            e.target.reset();
            loadAdminEvents();
        } else {
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const data = await response.json();
                alert('Error: ' + data.error);
            } else {
                const text = await response.text();
                console.error('Server returned non-JSON error:', text);
                alert('Server returned an error page. Check terminal logs.');
            }
            if (response.status === 401 || response.status === 403) adminLogout();
        }
    } catch (error) {
        console.error(error);
        alert('Server error while adding event.');
    }
}

async function deleteEvent(id) {
    if (!confirm('Are you sure you want to delete this event? All associated seats and bookings will be cascaded and deleted automatically!')) return;
    
    try {
        const response = await fetch(`${API_URL}/admin/events/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
        });
        
        if (response.ok) {
            loadAdminEvents();
        } else {
            alert('Failed to delete event');
            if (response.status === 401 || response.status === 403) adminLogout();
        }
    } catch (error) {
        console.error(error);
    }
}

async function loadAdminBookings() {
    const list = document.getElementById('admin-bookings-list');
    list.innerHTML = '<tr><td colspan="6">Loading bookings...</td></tr>';
    
    try {
        const response = await fetch(`${API_URL}/admin/bookings`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` }
        });
        const result = await response.json();
        
        if(response.ok) {
            const bookings = result;
            list.innerHTML = '';
            bookings.forEach(b => {
                const time = new Date(b.booking_time).toLocaleString();
                list.innerHTML += `
                    <tr>
                        <td>#${b.id}</td>
                        <td>${b.user_name}</td>
                        <td>${b.user_email}</td>
                        <td>${b.event_title}</td>
                        <td>${b.seat_number}</td>
                        <td style="color: var(--success); font-weight: bold;">₹${b.amount}</td>
                        <td><span style="background: var(--success); padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; color: white;">${b.payment_status}</span></td>
                        <td>${b.payment_method}</td>
                        <td>${time}</td>
                    </tr>
                `;
            });
        } else {
            console.error('Failed to load bookings:', result);
            if (response.status === 401 || response.status === 403) adminLogout();
        }
    } catch (error) {
        console.error(error);
        list.innerHTML = '<tr><td colspan="6" style="color:var(--danger)">Failed to load.</td></tr>';
    }
}
