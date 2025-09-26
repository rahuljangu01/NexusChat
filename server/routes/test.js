// server/routes/test.js

const express = require('express');
const router = express.Router();

router.get('/hello', (req, res) => {
  // Change this message every time you test
  res.send('This is test version 2'); 
});

module.exports = router;