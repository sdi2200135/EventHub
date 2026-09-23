// src/App.jsx
import { AuthProvider } from './context/AuthContext';
import { Navbar, Footer } from './components/common';
import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';

import RequireRole from './components/RequireRole';
import './App.css';

import WelcomePage from './pages/WelcomePage';
import HomePage from './pages/HomePage';
import SignIn from './pages/auth/SignIn';
import ForgotPwd from './pages/auth/ForgotPwd';
import SignUp from './pages/auth/SignUp';
import EventsPage from './pages/events/EventsPage';
import EventDetails from './pages/events/EventDetails';
import BookingPage from './pages/events/BookingPage';
import ProfilePage from './pages/profile/ProfilePage';
import EditProfile from './pages/profile/EditProfile';
import NewMessage from './pages/profile/common/NewMessage';
import CreateEvent from './pages/profile/organizer/CreateEvent';
import EventDetailsOrganizer from './pages/profile/organizer/EventDetailsOrganizer';
import EditEvent from './pages/profile/organizer/EditEvent';
import ReservationsDetails from './pages/profile/organizer/ReservationsDetails';
// keeps the browser tab title in sync with the route
const PageTitle = () => {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;
    const tab = new URLSearchParams(location.search).get('tab');
    const tabTitles = {
      messages: 'Messages',
      bookings: 'My Bookings',
      events: 'My Events',
      reservations: 'Reservations',
      users: 'User Management',
    };

    let title = 'EventHub';
    if (path.startsWith('/events/details')) title = 'Event';
    else if (path.startsWith('/events')) title = 'Find Events';
    else if (path.startsWith('/profile/messages/new')) title = 'New Message';
    else if (path.startsWith('/profile/events/new')) title = 'Create Event';
    else if (path.startsWith('/profile/events/edit')) title = 'Edit Event';
    else if (path.startsWith('/profile/edit')) title = 'Edit Profile';
    else if (path.startsWith('/profile')) title = tabTitles[tab] || 'My Account';
    else if (path === '/homepage') title = 'Home';
    else if (path === '/signin') title = 'Sign In';
    else if (path === '/signup') title = 'Sign Up';
    else if (path === '/') title = 'Welcome';


    document.title = title === 'EventHub' ? 'EventHub' : `${title} · EventHub`;
  }, [location]);

  return null;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <PageTitle />
        <Routes>
          {/* ============================================
              WELCOME (χωρίς Navbar/Footer - fullscreen)
              ============================================ */}
          <Route path="/" element={<WelcomePage />} />

          {/* ============================================
              ΟΛΕΣ ΟΙ ΑΛΛΕΣ ROUTES (με Navbar/Footer)
              ============================================ */}
          <Route
            path="*"
            element={
              <>
                <Navbar />
                <main>
                  <Routes>
                    {/* PUBLIC */}
                    <Route path="/homepage" element={<HomePage />} />
                    <Route path="/signin" element={<SignIn />} />
                    <Route path="/signin/forgot-password" element={<ForgotPwd />} />
                    <Route path="/signup" element={<SignUp />} />
                    <Route path="/events" element={<EventsPage />} />
                    <Route path="/events/details/:id" element={<EventDetails />} />

                    {/* AUTHENTICATED */}
                    <Route
                      path="/events/details/:id/booking"
                      element={
                        <RequireRole roles={['USER']}>
                          <BookingPage />
                        </RequireRole>
                      }
                    />
                    <Route
                      path="/profile"
                      element={
                        <RequireRole roles={['USER']}>
                          <ProfilePage />
                        </RequireRole>
                      }
                    />
                    <Route
                      path="/profile/edit"
                      element={
                        <RequireRole roles={['USER']}>
                          <EditProfile />
                        </RequireRole>
                      }
                    />
                    <Route
                      path="/profile/messages/new"
                      element={
                        <RequireRole roles={['USER']}>
                          <NewMessage />
                        </RequireRole>
                      }
                    />


                    {/* ORGANIZER */}
                    <Route
                      path="/profile/events/new"
                      element={
                        <RequireRole roles={['USER']}>
                          <CreateEvent />
                        </RequireRole>
                      }
                    />
                    <Route
                      path="/profile/events/edit/:id"
                      element={
                        <RequireRole roles={['USER']}>
                          <EditEvent />
                        </RequireRole>
                      }
                    />
                    <Route
                      path="/profile/events/:id"
                      element={
                        <RequireRole roles={['USER']}>
                          <EventDetailsOrganizer />
                        </RequireRole>
                      }
                    />
                    <Route
                      path="/profile/reservations/:id"
                      element={
                        <RequireRole roles={['USER']}>
                          <ReservationsDetails />
                        </RequireRole>
                      }
                    />
                  </Routes>
                </main>
                <Footer />
              </>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;