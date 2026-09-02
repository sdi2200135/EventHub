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
    approval_status: 'APPROVED'
  },
  {
    id: 2,
    username: 'organizer',
    password: 'qwe123',
    email: 'organizer@example.com',
    first_name: 'John',
    last_name: 'Organizer',
    role: 'ORGANIZER',
    approval_status: 'APPROVED'
  },
  {
    id: 3,
    username: 'participant',
    password: 'qwe123',
    email: 'participant@example.com',
    first_name: 'Jane',
    last_name: 'Participant',
    role: 'USER',
    approval_status: 'APPROVED'
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
// VIP: σειρές A-E (5 σειρές x 15 = 75 θέσεις)
// Regular: σειρές F-T (15 σειρές x 15 = 225 θέσεις)
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

// ============================================
// SPORTS - Boxes με διαφορετικές κατηγορίες
// VIP: Box 1, Box 3, Box 6, Box 8 (πάνω/κάτω γωνίες)
// Regular: Box 2, Box 4, Box 5, Box 7 (πλάγια)
// ============================================
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
// EVENTS
// ============================================

export const mockEvents = [
  // ============================================
  // EVENT 1: CONCERT (Music - ΔΕΝ έχει θέσεις) - AVAILABLE
  // ============================================
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
    bookings: [],
    photos: [
      { id: 1, image: 'https://picsum.photos/seed/concert/400/300', caption: 'Concert stage' }
    ]
  },

  // ============================================
  // EVENT 2: COLOUR FESTIVAL (Music - ΔΕΝ έχει θέσεις) - LIMITED
  // ============================================
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
    available_capacity: 8,  // LIMITED (8/500 = 1.6% < 20%)
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

  // ============================================
  // EVENT 3: MOVIE NIGHT (Cinema) - NOT AVAILABLE
  // ============================================
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
    available_capacity: 0,  // NOT AVAILABLE
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

  // ============================================
  // EVENT 4: BASKETBALL GAME (Sports) - LIMITED
  // ============================================
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
    available_capacity: 9,  // LIMITED (9/46 = 19.5% < 20%)
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
    bookings: [],
    photos: [
      { id: 4, image: 'https://picsum.photos/seed/basketball/400/300', caption: 'Basketball Game' }
    ],
    homeTeam: 'Panathinaikos',
    awayTeam: 'Olympiacos'
  },

  // ============================================
  // EVENT 5: FOOTBALL GAME (Sports) - AVAILABLE
  // ============================================
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
    available_capacity: 30,  // AVAILABLE (30/46 = 65% > 20%)
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

  // ============================================
  // EVENT 6: THEATER PLAY (Theater) - AVAILABLE
  // ============================================
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
    available_capacity: 260,  // AVAILABLE (260/300 = 86% > 20%)
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
    bookings: [],
    photos: [
      { id: 6, image: 'https://picsum.photos/seed/theater/400/300', caption: 'Theater stage' }
    ]
  },

  // ============================================
  // EVENT 7: STAND UP COMEDY (Stand Up Comedy) - AVAILABLE
  // ============================================
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
    available_capacity: 80,  // AVAILABLE (80/150 = 53% > 20%)
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
    bookings: [],
    photos: [
      { id: 7, image: 'https://picsum.photos/seed/comedy/400/300', caption: 'Comedy Club' }
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