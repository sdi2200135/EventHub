// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar, Footer } from './components/common';
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
import MessageView from './pages/profile/common/MessageView';
import NewMessage from './pages/profile/common/NewMessage';
import CreateEvent from './pages/profile/organizer/CreateEvent';
import EventDetailsOrganizer from './pages/profile/organizer/EventDetailsOrganizer';
import EditEvent from './pages/profile/organizer/EditEvent';
import ReservationsDetails from './pages/profile/organizer/ReservationsDetails';

function App() {
  return (
    <AuthProvider>
      <Router>
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
                    <Route
                      path="/profile/messages/:id"
                      element={
                        <RequireRole roles={['USER']}>
                          <MessageView />
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