# Αρχείο Setup Frontend

Το frontend της εφαρμογής δημιουργήθηκε με React και Vite.
Χρησιμοποιήθηκαν συγκεκριμένα πακέτα npm για routing, HTTP requests, UI components, ημερολόγιο και χάρτη.

## Δημιουργία Project

Για τη δημιουργία του project χρησιμοποιήθηκε η εξής εντολή:

    `npm create vite@latest . -- --template react`

Αυτή η εντολή δημιουργεί τη βασική δομή του project (index.html, src/,
vite.config.js, package.json κ.λπ.) και καταγράφει το Vite ως devDependency
στο package.json.

Στη συνέχεια, με την εντολή `npm install`, εγκαθίσταται το Vite μαζί με όλα
τα υπόλοιπα πακέτα.

## Τεχνολογίες που χρησιμοποιήθηκαν

1. React                 - Βιβλιοθήκη για το UI
2. Vite                  - Εργαλείο ανάπτυξης / build tool
3. React Router DOM      - Πλοήγηση μεταξύ σελίδων (routing)
4. Axios                 - HTTP requests προς το backend REST API
5. MUI (Material UI)     - Έτοιμα UI components και εικονίδια
6. Leaflet               - Χάρτης OpenStreetMap
7. React Datepicker      - Ημερολόγιο επιλογής ημερομηνίας

## Dependencies που εγκαταστάθηκαν

| Πακέτο                  | Εντολή εγκατάστασης                        | Σκοπός 			  |
|-------------------------|--------------------------------------------|----------------------|
| react, react-dom        | (αυτόματα από το Vite template)            | UI 				  |
| vite                    | (αυτόματα ως devDependency, με npm install)| Build tool 		  |
| react-router-dom        | npm install react-router-dom               | Routing 			  |
| axios                   | npm install axios                          | HTTP requests 		  |
| @mui/material           | npm install @mui/material                  | UI components 		  |
| @mui/icons-material     | npm install @mui/icons-material            | Εικονίδια 			  |
| @emotion/react          | npm install @emotion/react                 | Απαραίτητο για MUI   |
| @emotion/styled         | npm install @emotion/styled                | Απαραίτητο για MUI   |
| leaflet                 | npm install leaflet                        | Χάρτης OpenStreetMap |
| react-datepicker        | npm install react-datepicker               | Ημερολόγιο 		  |

## Εντολές εκκίνησης

1. cd frontend
2. npm install
3. npm run dev