const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const accountSchema = new mongoose.Schema({
  accountType: {
    type: String,
    required: true,
    enum: ['Checking', 'Savings', 'Credit', 'Investment']  // Added more options
  },
  accountNumber: {
    type: String,
    required: true,
    unique: true
  },
  routingNumber: {
    type: String,
    required: true,
    default: '256074974'  // Navy Federal's routing number
  },
  balance: {
    type: Number,
    default: 0
  },
  interestRate: {
    type: Number,
    default: 0.01
  },
  overdraftProtection: {
    type: Boolean,
    default: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'closed'],
    default: 'active'
  },
  openedDate: {
    type: Date,
    default: Date.now
  }
});

const postSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  isModeratorPost: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

const commentSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true
  },
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, { timestamps: true });

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true
  },
  lastName: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  username: {  // ADD THIS NEW FIELD
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    minlength: 3
  },
  password: {
    type: String,
    required: true
  },
  militaryBranch: {
    type: String,
    default: 'Navy'
  },
  rank: {
    type: String,
    default: 'Junior Rank'
  },
  dateOfBirth: {
    type: Date,
    required: true
  },
  age: {
    type: Number,
    required: true
  },
  ssn: {
  type: String,
  required: true,
  unique: true,
  trim: true
},
phoneNumber: {
  type: String,
  required: true,
  trim: true
},
address: {
  street: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true
  },
  state: {
    type: String,
    required: true
  },
  zipCode: {
    type: String,
    required: true
  }
},
employment: {
  status: {
    type: String,
    enum: ['employed', 'self-employed', 'unemployed', 'retired', 'student'],
    required: true
  },
  employer: String,
  annualIncome: Number
},
securityQuestions: [{
  question: {
    type: String,
    required: true
  },
  answer: {
    type: String,
    required: true
  }
}],
termsAccepted: {
  type: Boolean,
  required: true,
  default: false
},
termsAcceptedDate: Date,
  role: {
    type: String,
    enum: ['admin', 'moderator', 'user'],
    default: 'user'
  },
  profileImage: {
    type: String,
    default: null
  },
  cloudinaryImageId: {
    type: String,
    default: null
  },
  accounts: [accountSchema],
  posts: [postSchema],
  comments: [commentSchema],
  resetToken: String,
  resetTokenExpires: Date
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);
module.exports = User;