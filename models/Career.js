const mongoose = require('mongoose');

const careerSchema = new mongoose.Schema({
  jobTitle: {
    type: String,
    required: [true, 'Job title is required'],
    trim: true
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    enum: ['Technology', 'Banking Operations', 'Customer Service', 'Risk Management', 'Human Resources', 'Marketing', 'Finance', 'Legal', 'Cybersecurity', 'Data Analytics']
  },
  location: {
    type: String,
    required: [true, 'Location is required'],
    trim: true
  },
  employmentType: {
    type: String,
    required: [true, 'Employment type is required'],
    enum: ['Full-Time', 'Part-Time', 'Contract', 'Internship']
  },
  experienceLevel: {
    type: String,
    required: [true, 'Experience level is required'],
    enum: ['Entry Level', 'Mid Level', 'Senior Level', 'Executive']
  },
  salary: {
    min: {
      type: Number,
      required: true
    },
    max: {
      type: Number,
      required: true
    }
  },
  description: {
    type: String,
    required: [true, 'Job description is required']
  },
  responsibilities: [{
    type: String,
    required: true
  }],
  qualifications: [{
    type: String,
    required: true
  }],
  benefits: [{
    type: String
  }],
  postedDate: {
    type: Date,
    default: Date.now
  },
  applicationDeadline: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const applicationSchema = new mongoose.Schema({
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Career',
    required: true
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String
  },
  resumeUrl: {
    type: String,
    required: [true, 'Resume is required']
  },
  coverLetter: {
    type: String,
    maxlength: 2000
  },
  yearsOfExperience: {
    type: Number,
    required: true,
    min: 0
  },
  education: {
    degree: {
      type: String,
      required: true
    },
    institution: {
      type: String,
      required: true
    },
    graduationYear: {
      type: Number,
      required: true
    }
  },
  skills: [{
    type: String
  }],
  veteranStatus: {
    type: String,
    enum: ['Yes', 'No', 'Prefer not to say'],
    default: 'Prefer not to say'
  },
  status: {
    type: String,
    enum: ['Submitted', 'Under Review', 'Interview Scheduled', 'Rejected', 'Accepted'],
    default: 'Submitted'
  },
  applicationDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for faster queries
careerSchema.index({ department: 1, location: 1, isActive: 1 });
applicationSchema.index({ jobId: 1, status: 1 });

const Career = mongoose.model('Career', careerSchema);
const Application = mongoose.model('Application', applicationSchema);

module.exports = { Career, Application };