/* Vercel serverless entry. All `/api/*` requests are rewritten here
   (see vercel.json) and handled by the Express app. */
module.exports = require('../server/src/app');
