// const mongoose = require('mongoose');

// const financialTransferSchema = new mongoose.Schema({
//   userId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User',
//     required: true
//   },
//   from: {
//     type: String,
//     required: [true, 'Source account is required'],
//     trim: true
//   },
//   fromAccountId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'FinancialAccount'
//   },
//   to: {
//     type: String,
//     required: [true, 'Destination account is required'],
//     trim: true
//   },
//   toAccountId: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'FinancialAccount'
//   },
//   amount: {
//     type: Number,
//     required: [true, 'Transfer amount is required'],
//     min: [0.01, 'Transfer amount must be at least 0.01']
//   },
//   description: {
//     type: String,
//     trim: true,
//     maxLength: [200, 'Description cannot exceed 200 characters']
//   },
//   date: {
//     type: Date,
//     default: Date.now,
//     required: true
//   },
//   isExternal: {
//     type: Boolean,
//     default: false
//   }
// }, {
//   timestamps: true
// });

// const FinancialTransfer = mongoose.model('FinancialTransfer', financialTransferSchema);

// module.exports = FinancialTransfer;



const mongoose = require('mongoose');

const financialTransferSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  from: {
    type: String,
    required: true
  },
  to: {
    type: String, 
    required: true
  },
  fromAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User.accounts'
  },
  toAccountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User.accounts'
  },
  amount: {
    type: Number,
    required: true,
    min: 0.01
  },
  date: {
    type: Date,
    default: Date.now
  },
  description: {
    type: String
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'completed'
  }
}, { timestamps: true });

const FinancialTransfer = mongoose.model('FinancialTransfer', financialTransferSchema);
module.exports = FinancialTransfer;