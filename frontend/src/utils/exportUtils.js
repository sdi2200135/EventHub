// src/utils/exportUtils.js

// ============================================
// XML ESCAPING - ΑΠΑΡΑΙΤΗΤΟ ΓΙΑ ΕΓΚΥΡΟ XML
// ============================================
export const escapeXml = (str) => {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

// ============================================
// FORMAT DATE ΓΙΑ XML (ISO format χωρίς timezone)
// ============================================
const formatXmlDate = (dateString) => {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '';
  // Επιστρέφουμε ISO 8601: 2025-07-12T20:30:00
  return d.toISOString().slice(0, 19);
};

// ============================================
// ΜΕΤΑΤΡΟΠΗ ΕΝΟΣ EVENT ΣΕ XML (βάσει DTD)
// ============================================
const eventToXml = (event) => {
  const categoriesXml = (event.categories || [])
    .map(cat => `    <Category>${escapeXml(cat)}</Category>`)
    .join('\n');

  const geoLocationXml =
    event.latitude != null && event.longitude != null
      ? `    <GeoLocation Latitude="${escapeXml(event.latitude)}" Longitude="${escapeXml(event.longitude)}"/>`
      : '';

  const ticketTypesXml = (event.ticket_types || [])
    .map(tt => `      <TicketType TicketTypeID="${escapeXml(tt.ticket_type_id || `T${tt.id}`)}">
        <Name>${escapeXml(tt.name)}</Name>
        <Price>${Number(tt.price || 0).toFixed(2)}</Price>
        <Quantity>${tt.quantity || 0}</Quantity>
        <Available>${tt.available || 0}</Available>
      </TicketType>`)
    .join('\n');

  const bookingsXml = (event.bookings || [])
    .map(b => `      <Booking BookingID="${escapeXml(b.booking_id || `B${b.id}`)}">
        <Attendee UserID="${escapeXml(b.user_id)}"/>
        <Time>${escapeXml(formatXmlDate(b.booking_date || b.time))}</Time>
        <TicketTypeRef>${escapeXml(b.ticket_type_ref || `T${b.ticket_type_id || 1}`)}</TicketTypeRef>
        <NumberOfTickets>${b.quantity || 0}</NumberOfTickets>
        <TotalCost>${Number(b.total_price || 0).toFixed(2)}</TotalCost>
        <BookingStatus>${escapeXml(b.status)}</BookingStatus>
      </Booking>`)
    .join('\n');

  const mediaXml =
    event.photos && event.photos.length > 0
      ? `    <Media>
${event.photos.map(p => `      <Photo>${escapeXml(p.image || p.url || '')}</Photo>`).join('\n')}
    </Media>`
      : '';

  return `  <Event EventID="${escapeXml(event.event_id || `EV${event.id}`)}">
    <Title>${escapeXml(event.title)}</Title>
${categoriesXml}
    <EventType>${escapeXml(event.event_type)}</EventType>
    <Venue>${escapeXml(event.venue)}</Venue>
    <Address>${escapeXml(event.address)}</Address>
    <City>${escapeXml(event.city)}</City>
    <Country>${escapeXml(event.country)}</Country>
${geoLocationXml}
    <StartDateTime>${escapeXml(formatXmlDate(event.start_datetime))}</StartDateTime>
    <EndDateTime>${escapeXml(formatXmlDate(event.end_datetime))}</EndDateTime>
    <Capacity>${event.capacity || 0}</Capacity>
    <TicketTypes>
${ticketTypesXml}
    </TicketTypes>
    <Bookings>
${bookingsXml}
    </Bookings>
    <Organizer UserID="${escapeXml(event.organizer?.id || '')}"/>
    <Status>${escapeXml(event.status)}</Status>
    <Description>${escapeXml(event.description || '')}</Description>
${mediaXml}
  </Event>`;
};

// ============================================
// ΔΗΜΙΟΥΡΓΙΑ ΟΛΟΚΛΗΡΟΥ XML ΑΡΧΕΙΟΥ
// ============================================
export const generateEventsXml = (events) => {
  const eventsXml = events.map(eventToXml).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<!--
  Export from Eventize - Διαχείριση Εκδηλώσεων
  Generated: ${new Date().toISOString()}
  Total events: ${events.length}
-->
<Events>
${eventsXml}
</Events>
`;
};

// ============================================
// ΔΗΜΙΟΥΡΓΙΑ JSON ΑΡΧΕΙΟΥ (αντίστοιχη δομή)
// ============================================
export const generateEventsJson = (events) => {
  // Μετατρέπουμε τα events σε δομή που αντικατοπτρίζει το DTD
  const structured = events.map(event => ({
    EventID: event.event_id || `EV${event.id}`,
    Title: event.title || '',
    Category: event.categories || [],
    EventType: event.event_type || '',
    Venue: event.venue || '',
    Address: event.address || '',
    City: event.city || '',
    Country: event.country || '',
    GeoLocation: (event.latitude != null && event.longitude != null)
      ? { Latitude: event.latitude, Longitude: event.longitude }
      : null,
    StartDateTime: formatXmlDate(event.start_datetime),
    EndDateTime: formatXmlDate(event.end_datetime),
    Capacity: event.capacity || 0,
    TicketTypes: (event.ticket_types || []).map(tt => ({
      TicketTypeID: tt.ticket_type_id || `T${tt.id}`,
      Name: tt.name || '',
      Price: Number(tt.price || 0).toFixed(2),
      Quantity: tt.quantity || 0,
      Available: tt.available || 0,
    })),
    Bookings: (event.bookings || []).map(b => ({
      BookingID: b.booking_id || `B${b.id}`,
      Attendee: { UserID: b.user_id },
      Time: formatXmlDate(b.booking_date || b.time),
      TicketTypeRef: b.ticket_type_ref || `T${b.ticket_type_id || 1}`,
      NumberOfTickets: b.quantity || 0,
      TotalCost: Number(b.total_price || 0).toFixed(2),
      BookingStatus: b.status || '',
    })),
    Organizer: { UserID: event.organizer?.id || null },
    Status: event.status || '',
    Description: event.description || '',
    Media: event.photos && event.photos.length > 0
      ? { Photo: event.photos.map(p => p.image || p.url || '') }
      : null,
  }));

  return JSON.stringify({
    _meta: {
      exported_at: new Date().toISOString(),
      total_events: events.length,
      format: 'Eventize JSON Export v1.0',
    },
    Events: structured,
  }, null, 2);
};

// ============================================
// DOWNLOAD HELPER - ΔΗΜΙΟΥΡΓΕΙ ΚΑΙ ΚΑΤΕΒΑΖΕΙ ΑΡΧΕΙΟ
// ============================================
export const downloadFile = (content, filename, mimeType) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// ============================================
// ΤΟ DTD ΑΡΧΕΙΟ (για download ξεχωριστά)
// ============================================
export const EVENTS_DTD = `<!ELEMENT Events (Event*)>
<!ELEMENT Event (Title, Category+, EventType, Venue, Address, City,
Country, GeoLocation?, StartDateTime, EndDateTime, Capacity,
TicketTypes, Bookings, Organizer, Status, Description, Media?)>
<!ATTLIST Event EventID CDATA #REQUIRED>

<!ELEMENT Title (#PCDATA)>
<!ELEMENT Category (#PCDATA)>
<!ELEMENT EventType (#PCDATA)>
<!ELEMENT Venue (#PCDATA)>
<!ELEMENT Address (#PCDATA)>
<!ELEMENT City (#PCDATA)>
<!ELEMENT Country (#PCDATA)>

<!ELEMENT GeoLocation EMPTY>
<!ATTLIST GeoLocation Latitude CDATA #REQUIRED Longitude CDATA #REQUIRED>

<!ELEMENT StartDateTime (#PCDATA)>
<!ELEMENT EndDateTime (#PCDATA)>
<!ELEMENT Capacity (#PCDATA)>

<!ELEMENT TicketTypes (TicketType+)>
<!ELEMENT TicketType (Name, Price, Quantity, Available)>
<!ATTLIST TicketType TicketTypeID CDATA #REQUIRED>

<!ELEMENT Name (#PCDATA)>
<!ELEMENT Price (#PCDATA)>
<!ELEMENT Quantity (#PCDATA)>
<!ELEMENT Available (#PCDATA)>

<!ELEMENT Bookings (Booking*)>
<!ELEMENT Booking (Attendee, Time, TicketTypeRef, NumberOfTickets, TotalCost, BookingStatus)>
<!ATTLIST Booking BookingID CDATA #REQUIRED>

<!ELEMENT Attendee EMPTY>
<!ATTLIST Attendee UserID CDATA #REQUIRED>

<!ELEMENT Time (#PCDATA)>
<!ELEMENT TicketTypeRef (#PCDATA)>
<!ELEMENT NumberOfTickets (#PCDATA)>
<!ELEMENT TotalCost (#PCDATA)>
<!ELEMENT BookingStatus (#PCDATA)>

<!ELEMENT Organizer EMPTY>
<!ATTLIST Organizer UserID CDATA #REQUIRED>

<!ELEMENT Status (#PCDATA)>
<!ELEMENT Description (#PCDATA)>

<!ELEMENT Media (Photo+)>
<!ELEMENT Photo (#PCDATA)>
`;