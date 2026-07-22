require('dotenv').config();
const app = require('./app');
const connectDB = require('./db');

const PORT = process.env.PORT || 5001;

if (!process.env.JWT_SECRET) {
  console.error('Missing JWT_SECRET environment variable. Add it to server/.env and restart.');
  process.exit(1);
}

/* -- Local dev server. On Vercel the app is served by api/index.js instead. -- */
connectDB()
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log('Server running on http://localhost:' + PORT);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });
