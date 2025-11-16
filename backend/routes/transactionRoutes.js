const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { addTransaction, getTransactions, deleteTransaction } = require('../controllers/transactionController');

router.post('/', auth, addTransaction);
router.get('/', auth, getTransactions);
router.delete('/:id', auth, deleteTransaction);

module.exports = router;