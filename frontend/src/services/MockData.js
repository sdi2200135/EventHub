// src/services/mockData.js

export const mockUsers = [
  {
    id: 1,
    username: 'admin',
    password: 'qwe123',
    email: 'admin@example.com',
    first_name: 'Admin',
    last_name: 'User',
    role: 'ADMIN',
    approval_status: 'APPROVED',
    is_staff: true,
    is_superuser: true
  },
  {
    id: 2,
    username: 'organizer',
    password: 'qwe123',
    email: 'organizer@example.com',
    first_name: 'John',
    last_name: 'Organizer',
    role: 'ORGANIZER',
    approval_status: 'APPROVED',
    phone: '6969696969',
    address: 'zografou',
    city: 'athens',
    afm: '555555555'
  },
  {
    id: 3,
    username: 'participant',
    password: 'qwe123',
    email: 'participant@example.com',
    first_name: 'Jane',
    last_name: 'Participant',
    role: 'USER',
    approval_status: 'APPROVED',
    phone: '6988888888',
    address: 'Kallithea 10',
    city: 'Athens',
    afm: '123456789'
  },
    {
    id: 4,
    username: 'organizer2',
    password: 'qwe123',
    email: 'organizer2@example.com',
    first_name: 'Maria',
    last_name: 'Events',
    role: 'ORGANIZER',
    approval_status: 'APPROVED',
    phone: '6977777777',
    address: 'Syntagma 5',
    city: 'Athens',
    afm: '666666666'
  },
  {
    id: 5,
    username: 'participant2',
    password: 'qwe123',
    email: 'participant2@example.com',
    first_name: 'Bob',
    last_name: 'Smith',
    role: 'USER',
    approval_status: 'APPROVED',
    phone: '6955555555',
    address: 'Patision 100',
    city: 'Athens',
    afm: '999999999'
  }
];

// ============================================
// VENUES - ΧΩΡΟΙ ΔΙΕΞΑΓΩΓΗΣ ΑΝΑ ΚΑΤΗΓΟΡΙΑ
// ============================================

export const mockVenues = {
  'Theater': {
    type: 'stage',
    name: 'OAKA Theater Hall',
    address: 'OAKA Cultural Center 10',
    city: 'OAKA',
    totalSeats: 300,
    seats: {}
  },
  'Cinema': {
    type: 'stage',
    name: 'OAKA Open Air Cinema',
    address: 'OAKA Park 15',
    city: 'OAKA',
    totalSeats: 300,
    seats: {}
  },
  'Sports': {
    type: 'boxes',
    name: 'OAKA Arena',
    address: 'Λεωφ. Ολυμπιονίκου Σπύρου Λούη 1',
    city: 'Μαρούσι',
    totalSeats: 46,
    boxes: {}
  }
};

// Γέμισμα θέσεων για Theater και Cinema (20 σειρές x 15 θέσεις = 300)
const rows = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T'];
const seatsPerRow = 15;

// Theater seats
rows.forEach(row => {
  for (let i = 1; i <= seatsPerRow; i++) {
    const key = `${row}${i}`;
    let ticketType = 'Regular';
    if (['A','B','C','D','E'].includes(row)) ticketType = 'VIP';
    mockVenues['Theater'].seats[key] = { row, number: i, available: true, ticketType };
  }
});

// Cinema seats
rows.forEach(row => {
  for (let i = 1; i <= seatsPerRow; i++) {
    const key = `${row}${i}`;
    let ticketType = 'Regular';
    if (['A','B','C','D','E'].includes(row)) ticketType = 'VIP';
    mockVenues['Cinema'].seats[key] = { row, number: i, available: true, ticketType };
  }
});

// Sports Boxes
mockVenues['Sports'].boxes = {
  'Gate 1': { capacity: 6, available: 6, label: 'Gate 1', ticketType: 'Regular' },
  'Gate 2': { capacity: 4, available: 4, label: 'Gate 2', ticketType: 'VIP' },
  'Gate 3': { capacity: 8, available: 8, label: 'Gate 3', ticketType: 'Regular' },
  'Gate 4': { capacity: 6, available: 6, label: 'Gate 4', ticketType: 'Regular' },
  'Gate 5': { capacity: 4, available: 4, label: 'Gate 5', ticketType: 'Regular' },
  'Gate 6': { capacity: 8, available: 8, label: 'Gate 6', ticketType: 'Regular' },
  'Gate 7': { capacity: 6, available: 6, label: 'Gate 7', ticketType: 'VIP' },
  'Gate 8': { capacity: 4, available: 4, label: 'Gate 8', ticketType: 'Regular' }
};

// ============================================
// MOCK BOOKINGS
// ============================================
export const mockBookings = [
  {
    id: 1,
    user_id: 3,
    event_id: 1,
    ticket_type_id: 1,
    quantity: 2,
    seats: '',
    status: 'CONFIRMED',
    booking_date: '2026-07-20T14:30:00Z',
    total_price: 36.00,
    event_title: 'Concert',
    event_date: '2026-07-25T20:00:00Z',
    venue: 'Colour Festival Grounds',
    city: 'OAKA'
  },
  {
    id: 2,
    user_id: 3,
    event_id: 4,
    ticket_type_id: 8,
    quantity: 1,
    seats: 'Gate 2:2',
    status: 'CONFIRMED',
    booking_date: '2026-07-22T10:15:00Z',
    total_price: 35.00,
    event_title: 'Basketball Game',
    event_date: '2026-07-27T19:00:00Z',
    venue: 'OAKA Arena',
    city: 'Μαρούσι'
  },
  {
    id: 3,
    user_id: 3,
    event_id: 6,
    ticket_type_id: 13,
    quantity: 3,
    seats: 'A12,A13,A14',
    status: 'PENDING',
    booking_date: '2026-07-23T16:45:00Z',
    total_price: 60.00,
    event_title: 'Theater Play: The Glass Menagerie',
    event_date: '2026-08-05T20:30:00Z',
    venue: 'OAKA Theater Hall',
    city: 'OAKA'
  },
  {
    id: 4,
    user_id: 3,
    event_id: 7,
    ticket_type_id: 14,
    quantity: 2,
    seats: '',
    status: 'CANCELLED',
    booking_date: '2026-07-25T09:00:00Z',
    total_price: 60.00,
    event_title: 'Stand Up Comedy Night',
    event_date: '2026-08-10T21:00:00Z',
    venue: 'Comedy Club Athens',
    city: 'Athens'
  },
  // ← ΝΕΕΣ ΚΡΑΤΗΣΕΙΣ
  {
    id: 5,
    user_id: 3,
    event_id: 2,
    ticket_type_id: 5,
    quantity: 4,
    seats: '',
    status: 'CONFIRMED',
    booking_date: '2026-07-24T18:00:00Z',
    total_price: 100.00,
    event_title: 'Colour Festival',
    event_date: '2026-07-25T10:00:00Z',
    venue: 'Colour Festival Grounds',
    city: 'OAKA'
  },
  {
    id: 6,
    user_id: 3,
    event_id: 5,
    ticket_type_id: 10,
    quantity: 2,
    seats: 'Gate 3:2',
    status: 'CONFIRMED',
    booking_date: '2026-07-26T12:00:00Z',
    total_price: 80.00,
    event_title: 'Football Game',
    event_date: '2026-07-28T20:00:00Z',
    venue: 'OAKA Stadium',
    city: 'OAKA'
  },
    // ← ΝΕΑ: participant (3) έχει κάνει booking σε event του organizer2 (4)
  {
    id: 7,
    user_id: 3,
    event_id: 11,
    ticket_type_id: 20,
    quantity: 2,
    seats: '',
    status: 'CONFIRMED',
    booking_date: '2026-07-28T10:00:00Z',
    total_price: 60.00,
    event_title: 'Rock Concert',
    event_date: '2026-08-20T21:00:00Z',
    venue: 'Rock Stage Athens',
    city: 'Athens'
  },
  // ← ΝΕΑ: participant2 (5) έχει κάνει booking σε event του organizer (2)
  {
    id: 8,
    user_id: 5,
    event_id: 1,
    ticket_type_id: 1,
    quantity: 1,
    seats: '',
    status: 'CONFIRMED',
    booking_date: '2026-07-27T15:00:00Z',
    total_price: 18.00,
    event_title: 'Concert',
    event_date: '2026-07-25T20:00:00Z',
    venue: 'Colour Festival Grounds',
    city: 'OAKA'
  },
  {
    id: 9,
    user_id: 5,
    event_id: 4,
    ticket_type_id: 8,
    quantity: 2,
    seats: 'Gate 1:2',
    status: 'CONFIRMED',
    booking_date: '2026-07-28T11:00:00Z',
    total_price: 70.00,
    event_title: 'Basketball Game',
    event_date: '2026-07-27T19:00:00Z',
    venue: 'OAKA Arena',
    city: 'Μαρούσι'
  }
];

// ============================================
// EVENTS
// ============================================

export const mockEvents = [
  // EVENT 1: CONCERT
  {
    id: 1,
    event_id: 'EV1001',
    title: 'Concert',
    description: 'Live music night with local bands.',
    event_type: 'CONCERT',
    venue: 'Colour Festival Grounds',
    address: 'OAKA Park 15',
    city: 'OAKA',
    country: 'Greece',
    latitude: 37.9838,
    longitude: 23.7275,
    start_datetime: '2026-07-25T20:00:00Z',
    end_datetime: '2026-07-25T23:00:00Z',
    capacity: 350,
    status: 'PUBLISHED',
    available_capacity: 180,
    categories: ['Music'],
    organizer: {
      id: 2,
      username: 'organizer',
      first_name: 'John',
      last_name: 'Organizer'
    },
    ticket_types: [
      { id: 1, ticket_type_id: 'T1', name: 'Regular', price: 18.00, quantity: 250, available: 180 }
    ],
    bookings: [
      { id: 1, user_id: 3, status: 'CONFIRMED', quantity: 2 },
      { id: 8, user_id: 5, status: 'CONFIRMED', quantity: 1 }
    ],
    photos: [
      { id: 1, image: 'https://picsum.photos/seed/concert/400/300', caption: 'Concert stage' },
      { id: 2, image: 'https://picsum.photos/seed/concert2/400/300', caption: 'Crowd' },
      { id: 3, image: 'https://picsum.photos/seed/concert3/400/300', caption: 'Live band' }
    ]
  },
  // ... (τα υπόλοιπα events με τις προσθήκες bookings)
  // EVENT 2: COLOUR FESTIVAL
  {
    id: 2,
    event_id: 'EV1002',
    title: 'Colour Festival',
    description: 'Annual colour festival with music and dance.',
    event_type: 'FESTIVAL',
    venue: 'Colour Festival Grounds',
    address: 'OAKA Park 15',
    city: 'OAKA',
    country: 'Greece',
    latitude: 37.9838,
    longitude: 23.7275,
    start_datetime: '2026-07-25T10:00:00Z',
    end_datetime: '2026-07-25T22:00:00Z',
    capacity: 500,
    status: 'PUBLISHED',
    available_capacity: 8,
    categories: ['Music'],
    organizer: {
      id: 2,
      username: 'organizer',
      first_name: 'John',
      last_name: 'Organizer',
      email: 'organizer@example.com'
    },
    ticket_types: [
      { id: 5, ticket_type_id: 'T5', name: 'Regular', price: 25.00, quantity: 500, available: 8 }
    ],
    bookings: [],
    photos: [
      { id: 2, image: 'https://picsum.photos/seed/festival/400/300', caption: 'Colour Festival' }
    ]
  },
  // EVENT 3: MOVIE NIGHT
  {
    id: 3,
    event_id: 'EV1003',
    title: 'Movie Night',
    description: 'Open air cinema screening.',
    event_type: 'MOVIE',
    venue: 'OAKA Open Air Cinema',
    address: 'OAKA Park 15',
    city: 'OAKA',
    country: 'Greece',
    latitude: 37.9838,
    longitude: 23.7275,
    start_datetime: '2026-07-26T21:00:00Z',
    end_datetime: '2026-07-26T23:30:00Z',
    capacity: 300,
    status: 'PUBLISHED',
    available_capacity: 0,
    categories: ['Cinema'],
    organizer: {
      id: 2,
      username: 'organizer',
      first_name: 'John',
      last_name: 'Organizer'
    },
    ticket_types: [
      { id: 6, ticket_type_id: 'T6', name: 'VIP', price: 15.00, quantity: 75, available: 0 },
      { id: 7, ticket_type_id: 'T7', name: 'Regular', price: 10.00, quantity: 225, available: 0 }
    ],
    bookings: [],
    photos: [
      { id: 3, image: 'https://picsum.photos/seed/movie/400/300', caption: 'Movie Night' }
    ]
  },
  // EVENT 4: BASKETBALL GAME
  {
    id: 4,
    event_id: 'EV1004',
    title: 'Basketball Game',
    description: 'Exciting basketball match.',
    event_type: 'SPORTS',
    venue: 'OAKA Arena',
    address: 'Λεωφ. Ολυμπιονίκου Σπύρου Λούη 1',
    city: 'Μαρούσι',
    country: 'Greece',
    latitude: 38.0379,
    longitude: 23.7799,
    start_datetime: '2026-07-27T19:00:00Z',
    end_datetime: '2026-07-27T21:30:00Z',
    capacity: 46,
    status: 'PUBLISHED',
    available_capacity: 9,
    categories: ['Sports'],
    organizer: {
      id: 2,
      username: 'organizer',
      first_name: 'John',
      last_name: 'Organizer',
      email: 'organizer@example.com',
      phone: '6969696969',
      address: 'zografou',
      location: 'athens',
      afm: '555555555'
    },
    ticket_types: [
      { id: 8, ticket_type_id: 'T8', name: 'VIP', price: 35.00, quantity: 20, available: 5 },
      { id: 9, ticket_type_id: 'T9', name: 'Regular', price: 15.00, quantity: 26, available: 4 }
    ],
    bookings: [
      { id: 2, user_id: 3, status: 'CONFIRMED', quantity: 1 },
      { id: 9, user_id: 5, status: 'CONFIRMED', quantity: 2 }
    ],
    photos: [
      { id: 4, image: 'https://picsum.photos/seed/basketball/400/300', caption: 'Basketball Game' }
    ],
    homeTeam: 'Panathinaikos',
    awayTeam: 'Olympiacos'
  },
  // EVENT 5: FOOTBALL GAME
  {
    id: 5,
    event_id: 'EV1005',
    title: 'Football Game',
    description: 'Football match between local teams.',
    event_type: 'SPORTS',
    venue: 'OAKA Stadium',
    address: 'OAKA Park 15',
    city: 'OAKA',
    country: 'Greece',
    latitude: 37.9838,
    longitude: 23.7275,
    start_datetime: '2026-07-28T20:00:00Z',
    end_datetime: '2026-07-28T22:30:00Z',
    capacity: 46,
    status: 'PUBLISHED',
    available_capacity: 30,
    categories: ['Sports'],
    organizer: {
      id: 2,
      username: 'organizer',
      first_name: 'John',
      last_name: 'Organizer'
    },
    ticket_types: [
      { id: 10, ticket_type_id: 'T10', name: 'VIP', price: 40.00, quantity: 20, available: 14 },
      { id: 11, ticket_type_id: 'T11', name: 'Regular', price: 18.00, quantity: 26, available: 16 }
    ],
    bookings: [],
    photos: [
      { id: 5, image: 'https://picsum.photos/seed/football/400/300', caption: 'Football Game' }
    ]
  },
  // EVENT 6: THEATER PLAY
  {
    id: 6,
    event_id: 'EV1006',
    title: 'Theater Play: The Glass Menagerie',
    description: 'A captivating theatrical performance of Tennessee Williams\' classic play.',
    event_type: 'THEATER',
    venue: 'OAKA Theater Hall',
    address: 'OAKA Cultural Center 10',
    city: 'OAKA',
    country: 'Greece',
    latitude: 37.9838,
    longitude: 23.7275,
    start_datetime: '2026-08-05T20:30:00Z',
    end_datetime: '2026-08-05T23:00:00Z',
    capacity: 300,
    status: 'PUBLISHED',
    available_capacity: 260,
    categories: ['Theater'],
    organizer: {
      id: 2,
      username: 'organizer',
      first_name: 'John',
      last_name: 'Organizer'
    },
    ticket_types: [
      { id: 12, ticket_type_id: 'T12', name: 'VIP', price: 45.00, quantity: 75, available: 70 },
      { id: 13, ticket_type_id: 'T13', name: 'Regular', price: 20.00, quantity: 225, available: 190 }
    ],
    bookings: [
      { id: 3, user_id: 3, status: 'PENDING', quantity: 3 }
    ],
    photos: [
      { id: 6, image: 'https://picsum.photos/seed/theater/400/300', caption: 'Theater stage' }
    ]
  },
  // EVENT 7: STAND UP COMEDY
  {
    id: 7,
    event_id: 'EV1007',
    title: 'Stand Up Comedy Night',
    description: 'A hilarious evening with the best comedians.',
    event_type: 'COMEDY',
    venue: 'Comedy Club Athens',
    address: 'Athinas 12',
    city: 'Athens',
    country: 'Greece',
    latitude: 37.9838,
    longitude: 23.7275,
    start_datetime: '2026-08-10T21:00:00Z',
    end_datetime: '2026-08-10T23:30:00Z',
    capacity: 150,
    status: 'PUBLISHED',
    available_capacity: 80,
    categories: ['Stand Up Comedy'],
    organizer: {
      id: 2,
      username: 'organizer',
      first_name: 'John',
      last_name: 'Organizer'
    },
    ticket_types: [
      { id: 14, ticket_type_id: 'T14', name: 'VIP', price: 30.00, quantity: 50, available: 30 },
      { id: 15, ticket_type_id: 'T15', name: 'Regular', price: 15.00, quantity: 100, available: 50 }
    ],
    bookings: [
      { id: 4, user_id: 3, status: 'CANCELLED', quantity: 2 }
    ],
    photos: [
      { id: 7, image: 'https://picsum.photos/seed/comedy/400/300', caption: 'Comedy Club' }
    ]
  },
    // ============================================
  // EVENT 8: DRAFT EVENT (για testing)
  // ============================================
  {
    id: 8,
    event_id: 'EV1008',
    title: 'Summer Music Festival 2026',
    description: 'A three-day summer music festival with top artists.',
    event_type: 'FESTIVAL',
    venue: 'Technopolis',
    address: 'Peiraios 100',
    city: 'Athens',
    country: 'Greece',
    latitude: 37.9780,
    longitude: 23.7150,
    start_datetime: '2026-09-15T18:00:00Z',
    end_datetime: '2026-09-17T23:00:00Z',
    capacity: 2000,
    status: 'DRAFT',
    available_capacity: 2000,
    categories: ['Music'],
    organizer: {
      id: 2,
      username: 'organizer',
      first_name: 'John',
      last_name: 'Organizer'
    },
    ticket_types: [
      { id: 16, ticket_type_id: 'T16', name: 'Regular', price: 50.00, quantity: 1500, available: 1500 },
      { id: 17, ticket_type_id: 'T17', name: 'VIP', price: 120.00, quantity: 500, available: 500 }
    ],
    bookings: [],
    photos: [
      { id: 8, image: 'https://picsum.photos/seed/summerfest/400/300', caption: 'Summer Festival' }
    ]
  },
  // ============================================
  // EVENT 9: COMPLETED EVENT (για testing)
  // ============================================
  {
    id: 9,
    event_id: 'EV1009',
    title: 'Winter Jazz Night',
    description: 'An intimate evening with jazz legends.',
    event_type: 'CONCERT',
    venue: 'Athens Concert Hall',
    address: 'Vas. Sofias 20',
    city: 'Athens',
    country: 'Greece',
    latitude: 37.9780,
    longitude: 23.7480,
    start_datetime: '2025-12-20T20:00:00Z',
    end_datetime: '2025-12-20T23:00:00Z',
    capacity: 500,
    status: 'COMPLETED',
    available_capacity: 120,
    categories: ['Music'],
    organizer: {
      id: 2,
      username: 'organizer',
      first_name: 'John',
      last_name: 'Organizer'
    },
    ticket_types: [
      { id: 18, ticket_type_id: 'T18', name: 'Regular', price: 40.00, quantity: 500, available: 120 }
    ],
    bookings: [],
    photos: [
      { id: 9, image: 'https://picsum.photos/seed/jazz/400/300', caption: 'Jazz Night' }
    ]
  },
  // ============================================
  // EVENT 10: CANCELLED EVENT (για testing)
  // ============================================
  {
    id: 10,
    event_id: 'EV1010',
    title: 'Tech Conference 2026',
    description: 'Annual technology conference (cancelled due to weather).',
    event_type: 'CONFERENCE',
    venue: 'Megaro Mousikis',
    address: 'Vas. Sofias 22',
    city: 'Athens',
    country: 'Greece',
    latitude: 37.9780,
    longitude: 23.7480,
    start_datetime: '2026-10-10T09:00:00Z',
    end_datetime: '2026-10-10T18:00:00Z',
    capacity: 800,
    status: 'CANCELLED',
    available_capacity: 800,
    categories: ['Music'],
    organizer: {
      id: 2,
      username: 'organizer',
      first_name: 'John',
      last_name: 'Organizer'
    },
    ticket_types: [
      { id: 19, ticket_type_id: 'T19', name: 'Regular', price: 30.00, quantity: 800, available: 800 }
    ],
    bookings: [],
    photos: [
      { id: 10, image: 'https://picsum.photos/seed/techconf/400/300', caption: 'Tech Conference' }
    ]
  },
    // ============================================
  // EVENT 11: ROCK CONCERT (organizer2)
  // ============================================
  {
    id: 11,
    event_id: 'EV1011',
    title: 'Rock Concert',
    description: 'Heavy rock night with international bands.',
    event_type: 'CONCERT',
    venue: 'Rock Stage Athens',
    address: 'Pireos 50',
    city: 'Athens',
    country: 'Greece',
    latitude: 37.9780,
    longitude: 23.7150,
    start_datetime: '2026-08-20T21:00:00Z',
    end_datetime: '2026-08-20T23:59:00Z',
    capacity: 200,
    status: 'PUBLISHED',
    available_capacity: 150,
    categories: ['Music'],
    organizer: {
      id: 4,
      username: 'organizer2',
      first_name: 'Maria',
      last_name: 'Events'
    },
    ticket_types: [
      { id: 20, ticket_type_id: 'T20', name: 'Regular', price: 30.00, quantity: 200, available: 150 }
    ],
    bookings: [
      { id: 7, user_id: 3, status: 'CONFIRMED', quantity: 2 }
    ],
    photos: [
      { id: 11, image: 'https://picsum.photos/seed/rock/400/300', caption: 'Rock Concert' }
    ]
  },
  // ============================================
  // EVENT 12: MODERN ART EXHIBITION (organizer2)
  // ============================================
  {
    id: 12,
    event_id: 'EV1012',
    title: 'Modern Art Exhibition',
    description: 'Contemporary art exhibition with local artists.',
    event_type: 'EXHIBITION',
    venue: 'National Gallery',
    address: 'Vas. Konstantinou 50',
    city: 'Athens',
    country: 'Greece',
    latitude: 37.9780,
    longitude: 23.7480,
    start_datetime: '2026-09-01T10:00:00Z',
    end_datetime: '2026-09-30T20:00:00Z',
    capacity: 500,
    status: 'PUBLISHED',
    available_capacity: 500,
    categories: ['Music'],
    organizer: {
      id: 4,
      username: 'organizer2',
      first_name: 'Maria',
      last_name: 'Events'
    },
    ticket_types: [
      { id: 21, ticket_type_id: 'T21', name: 'Regular', price: 10.00, quantity: 500, available: 500 }
    ],
    bookings: [],
    photos: [
      { id: 12, image: 'https://picsum.photos/seed/art/400/300', caption: 'Art Exhibition' }
    ]
  }
];

export const mockCategories = [
  { id: 1, name: 'Music' },
  { id: 2, name: 'Theater' },
  { id: 3, name: 'Cinema' },
  { id: 4, name: 'Sports' },
  { id: 5, name: 'Stand Up Comedy' }
];

export const mockCurrentUser = {
  id: 3,
  username: 'participant',
  email: 'participant@example.com',
  first_name: 'Jane',
  last_name: 'Participant',
  role: 'USER',
  approval_status: 'APPROVED'
};

// ============================================
// MOCK MESSAGES
// ============================================
export const mockMessages = [
  // ----- PARTICIPANT (recipient_id: 3) -----
  {
    id: 1,
    sender_id: 2,
    sender_username: 'organizer',
    sender_name: 'John Organizer',
    recipient_id: 3,
    recipient_username: 'participant',
    subject: 'Your booking is confirmed',
    body: 'Hi Jane, your booking for Concert has been confirmed. See you there!',
    is_read: false,
    is_draft: false,
    is_trash: false,
    created_at: '2026-07-20T15:00:00Z',
    attachments: []
  },
  {
    id: 2,
    sender_id: 1,
    sender_username: 'admin',
    sender_name: 'Admin User',
    recipient_id: 3,
    recipient_username: 'participant',
    subject: 'Welcome to Eventize',
    body: 'Welcome! Your account has been approved. Enjoy browsing events.',
    is_read: false,
    is_draft: false,
    is_trash: false,
    created_at: '2026-07-21T09:30:00Z',
    attachments: []
  },
  {
    id: 3,
    sender_id: 2,
    sender_username: 'organizer',
    sender_name: 'John Organizer',
    recipient_id: 3,
    recipient_username: 'participant',
    subject: 'Basketball Game update',
    body: 'The Basketball Game time has been changed to 19:00. Please check your booking.',
    is_read: true,
    is_draft: false,
    is_trash: false,
    created_at: '2026-07-22T11:00:00Z',
    attachments: []
  },

  // ----- ORGANIZER (recipient_id: 2) -----
  {
    id: 4,
    sender_id: 3,
    sender_username: 'participant',
    sender_name: 'Jane Participant',
    recipient_id: 2,
    recipient_username: 'organizer',
    subject: 'Question about Concert',
    body: 'Hello, I have a question about the Concert event on July 25. Will there be parking available?',
    is_read: false,
    is_draft: false,
    is_trash: false,
    created_at: '2026-07-23T10:00:00Z',
    attachments: []
  },
  {
    id: 5,
    sender_id: 1,
    sender_username: 'admin',
    sender_name: 'Admin User',
    recipient_id: 2,
    recipient_username: 'organizer',
    subject: 'Organizer account approved',
    body: 'Your organizer account has been approved. You can now create events.',
    is_read: false,
    is_draft: false,
    is_trash: false,
    created_at: '2026-07-19T09:00:00Z',
    attachments: []
  },
  {
    id: 6,
    sender_id: 3,
    sender_username: 'participant',
    sender_name: 'Jane Participant',
    recipient_id: 2,
    recipient_username: 'organizer',
    subject: 'Cancellation request',
    body: 'Hello, I would like to cancel my booking for the Basketball Game. Can you help?',
    is_read: true,
    is_draft: false,
    is_trash: false,
    created_at: '2026-07-24T14:30:00Z',
    attachments: []
  },

  // ----- DRAFT (για testing) -----
  {
    id: 7,
    sender_id: 3,
    sender_username: 'participant',
    sender_name: 'Jane Participant',
    recipient_id: 2,
    recipient_username: 'organizer',
    subject: 'Draft: Question about event',
    body: 'Hello, I wanted to ask about... (not finished)',
    is_read: true,
    is_draft: true,
    is_trash: false,
    created_at: '2026-07-25T08:00:00Z',
    attachments: []
  },

  // ----- TRASH (για testing) -----
  {
    id: 8,
    sender_id: 1,
    sender_username: 'admin',
    sender_name: 'Admin User',
    recipient_id: 3,
    recipient_username: 'participant',
    subject: 'Old notification',
    body: 'This is an old message that was moved to trash.',
    is_read: true,
    is_draft: false,
    is_trash: true,
    created_at: '2026-07-15T12:00:00Z',
    attachments: []
  }
];