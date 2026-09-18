# core/services/export.py
import json
import xml.etree.ElementTree as ET

from django.utils import timezone

from core.models import Event

# the DTD which is given in the assignment used to validate xml 
# json is built based on xml for this reason no validation needed
EVENTS_DTD = """
    <!ELEMENT Events (Event*)>
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
    <!ELEMENT Booking (Attendee, Time, TicketTypeRef, NumberOfTickets,
    TotalCost, BookingStatus)>
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
    <!ELEMENT Media (Photo*)>
    <!ELEMENT Photo (#PCDATA)>
"""


def get_exportable_events(user_id=None):
    # the DTD asks for at least one Category and one TicketType per event(+), so filter out the ones which don't follow DTD

    # if a user id is given return only the ecents of this user as organizer 
    # if no user return all events
    events = Event.objects.filter(categories__isnull=False, ticket_types__isnull=False)

    if user_id is not None:
        events = events.filter(organizer=user_id)
    
    return (
        events
        .distinct()
        .select_related('organizer')
        .prefetch_related('categories', 'ticket_types', 'bookings__attendee', 'bookings__ticket_type', 'photos')     # prefetch everything so the query count stays the same no matter how many events there are
        .order_by('pk')
    )

# the time will be printed in this format  (year-month-dayT20:30:00)
def _datetime(value):
    return timezone.localtime(value).strftime('%Y-%m-%dT%H:%M:%S')


# make sure the money of each boking come as decimal rounded to two significant digits after ,
def _rounded_up_money(value):
    return f'{value:.2f}'


# one dict per event, keys in the order of the DTD, attributes become normal keys
def build_events_data(events):
    data = []
    for event in events:
        item = {
            'EventID': event.event_id,
            'Title': event.title,
            'Category': [category.name for category in event.categories.all()],
            'EventType': event.event_type,
            'Venue': event.venue,
            'Address': event.address,
            'City': event.city,
            'Country': event.country,
        }
        # geolocation is optional
        if event.latitude is not None and event.longitude is not None:
            item['GeoLocation'] = {'Latitude': str(event.latitude), 'Longitude': str(event.longitude)}

        item['StartDateTime'] = _datetime(event.start_datetime)
        item['EndDateTime'] = _datetime(event.end_datetime)

        item['Capacity'] = event.capacity
        item['TicketTypes'] = [
            {
                'TicketTypeID': ticket_type.ticket_type_id,
                'Name': ticket_type.name,
                'Price': _rounded_up_money(ticket_type.price),
                'Quantity': ticket_type.quantity,
                'Available': ticket_type.available,
            }
            for ticket_type in event.ticket_types.all()
        ]
        item['Bookings'] = [
            {
                'BookingID': booking.booking_id,
                'Attendee': {'UserID': booking.attendee.username},
                'Time': _datetime(booking.created_at),
                'TicketTypeRef': booking.ticket_type.ticket_type_id,
                'NumberOfTickets': booking.number_of_tickets,
                'TotalCost': _rounded_up_money(booking.total_cost),
                'BookingStatus': booking.status,
            }
            for booking in event.bookings.all()
        ]
        item['Organizer'] = {'UserID': event.organizer.username}
        item['Status'] = event.status
        item['Description'] = event.description
        
        # photos are optional
        photos = [photo.image.name for photo in event.photos.all()]
        if photos:
            item['Media'] = photos
        data.append(item)
    return data


def _add(parent, tag, value):
    element = ET.SubElement(parent, tag)
    element.text = str(value)
    return element


# ElementTree escapes & and < in the text for us for description title safety
def events_to_xml(data):
    root = ET.Element('Events')
    for item in data:
        event = ET.SubElement(root, 'Event', EventID=item['EventID'])
        _add(event, 'Title', item['Title'])
        for category in item['Category']:
            _add(event, 'Category', category)
        for tag in ('EventType', 'Venue', 'Address', 'City', 'Country'):
            _add(event, tag, item[tag])
        if 'GeoLocation' in item:
            ET.SubElement(event, 'GeoLocation', **item['GeoLocation'])
        for tag in ('StartDateTime', 'EndDateTime', 'Capacity'):
            _add(event, tag, item[tag])

        ticket_types = ET.SubElement(event, 'TicketTypes')
        for ticket_type in item['TicketTypes']:
            element = ET.SubElement(ticket_types, 'TicketType', TicketTypeID=ticket_type['TicketTypeID'])
            for tag in ('Name', 'Price', 'Quantity', 'Available'):
                _add(element, tag, ticket_type[tag])

        bookings = ET.SubElement(event, 'Bookings')
        for booking in item['Bookings']:
            element = ET.SubElement(bookings, 'Booking', BookingID=booking['BookingID'])
            ET.SubElement(element, 'Attendee', UserID=booking['Attendee']['UserID'])
            for tag in ('Time', 'TicketTypeRef', 'NumberOfTickets', 'TotalCost', 'BookingStatus'):
                _add(element, tag, booking[tag])

        ET.SubElement(event, 'Organizer', UserID=item['Organizer']['UserID'])
        _add(event, 'Status', item['Status'])
        _add(event, 'Description', item['Description'])
        if 'Media' in item:
            media = ET.SubElement(event, 'Media')
            for photo in item['Media']:
                _add(media, 'Photo', photo)

    ET.indent(root)
    body = ET.tostring(root, encoding='unicode')
    return f'<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE Events [\n{EVENTS_DTD}\n]>\n{body}\n'


# ensure_ascii=False writes greek as ("Αθήνα") instead of codes (\u0391\u03b8...)
def events_to_json(data):
    return json.dumps({'Events': data}, ensure_ascii=False, indent=2)
