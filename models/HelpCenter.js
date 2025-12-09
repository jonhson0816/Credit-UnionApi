const mongoose = require('mongoose');

// Help Article Schema
const helpArticleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Article title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
      'account-management',
      'digital-banking',
      'cards-payments',
      'loans-credit',
      'security-fraud',
      'transfers-billpay',
      'membership',
      'financial-tools'
    ],
    index: true
  },
  categoryTitle: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: [true, 'Article content is required']
  },
  excerpt: {
    type: String,
    required: [true, 'Article excerpt is required'],
    maxlength: [300, 'Excerpt cannot exceed 300 characters']
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  relatedArticles: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HelpArticle'
  }],
  views: {
    type: Number,
    default: 0,
    min: 0
  },
  helpful: {
    type: Number,
    default: 0,
    min: 0
  },
  notHelpful: {
    type: Number,
    default: 0,
    min: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  author: {
    type: String,
    default: 'Navy Federal Support Team'
  },
  featured: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'published'
  },
  readTime: {
    type: Number, // in minutes
    default: 5
  },
  videoUrl: {
    type: String,
    trim: true
  },
  attachments: [{
    name: String,
    url: String,
    type: String,
    size: Number
  }],
  faqItems: [{
    question: {
      type: String,
      required: true
    },
    answer: {
      type: String,
      required: true
    }
  }],
  metadata: {
    searchKeywords: [String],
    difficulty: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced'],
      default: 'beginner'
    },
    platform: [{
      type: String,
      enum: ['web', 'mobile', 'both'],
      default: 'both'
    }]
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
helpArticleSchema.index({ title: 'text', content: 'text', tags: 'text' });
helpArticleSchema.index({ category: 1, status: 1 });
helpArticleSchema.index({ featured: 1, views: -1 });
helpArticleSchema.index({ createdAt: -1 });

// Virtual for helpfulness rating
helpArticleSchema.virtual('helpfulnessRating').get(function() {
  const total = this.helpful + this.notHelpful;
  if (total === 0) return 0;
  return ((this.helpful / total) * 100).toFixed(1);
});

// Generate slug before saving
helpArticleSchema.pre('save', function(next) {
  if (this.isModified('title') && !this.slug) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
  next();
});

// User Feedback Schema
const helpFeedbackSchema = new mongoose.Schema({
  articleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HelpArticle',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Allow anonymous feedback
  },
  helpful: {
    type: Boolean,
    required: true
  },
  comment: {
    type: String,
    trim: true,
    maxlength: [1000, 'Comment cannot exceed 1000 characters']
  },
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  category: {
    type: String,
    enum: ['accuracy', 'clarity', 'completeness', 'relevance', 'other']
  },
  userAgent: String,
  ipAddress: String
}, {
  timestamps: true
});

// Index for preventing duplicate feedback
helpFeedbackSchema.index({ articleId: 1, userId: 1 }, { sparse: true });

// Search History Schema
const searchHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false, // Allow anonymous searches
    index: true
  },
  query: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  resultsCount: {
    type: Number,
    default: 0
  },
  clickedArticle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HelpArticle'
  },
  sessionId: {
    type: String,
    index: true
  }
}, {
  timestamps: true
});

// Index for search analytics
searchHistorySchema.index({ query: 1, createdAt: -1 });
searchHistorySchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days TTL

// Support Ticket Schema
const supportTicketSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  ticketNumber: {
    type: String,
    required: false, // Changed to false, will be set in pre-save
    unique: true,
    index: true
  },
  category: {
    type: String,
    required: true,
    enum: [
      'account-management',
      'digital-banking',
      'cards-payments',
      'loans-credit',
      'security-fraud',
      'transfers-billpay',
      'membership',
      'financial-tools',
      'technical-issue',
      'billing',
      'other'
    ]
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true,
    maxlength: [200, 'Subject cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [5000, 'Description cannot exceed 5000 characters']
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['open', 'in-progress', 'pending', 'resolved', 'closed'],
    default: 'open',
    index: true
  },
  assignedTo: {
    type: String,
    default: null
  },
  relatedArticles: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HelpArticle'
  }],
  messages: [{
    sender: {
      type: String,
      enum: ['user', 'support'],
      required: true
    },
    message: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    attachments: [{
      name: String,
      url: String,
      type: String
    }],
    isInternal: {
      type: Boolean,
      default: false
    }
  }],
  attachments: [{
    name: String,
    url: String,
    type: String,
    size: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  resolution: {
    type: String,
    trim: true
  },
  resolvedAt: Date,
  closedAt: Date,
  rating: {
    score: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
    ratedAt: Date
  },
  metadata: {
    source: {
      type: String,
      enum: ['web', 'mobile', 'phone', 'email', 'chat'],
      default: 'web'
    },
    userAgent: String,
    ipAddress: String,
    responseTime: Number // in hours
  }
}, {
  timestamps: true
});

// Generate ticket number before saving
supportTicketSchema.pre('save', async function(next) {
  if (this.isNew && !this.ticketNumber) {
    try {
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const count = await this.constructor.countDocuments();
      this.ticketNumber = `NFCU-${year}${month}-${String(count + 1).padStart(6, '0')}`;
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

// Update resolvedAt when status changes to resolved
supportTicketSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    if (this.status === 'resolved' && !this.resolvedAt) {
      this.resolvedAt = new Date();
    }
    if (this.status === 'closed' && !this.closedAt) {
      this.closedAt = new Date();
    }
  }
  next();
});

// Indexes for support tickets
supportTicketSchema.index({ userId: 1, status: 1 });
supportTicketSchema.index({ createdAt: -1 });
supportTicketSchema.index({ status: 1, priority: -1 });

// Export models
const HelpArticle = mongoose.model('HelpArticle', helpArticleSchema);
const HelpFeedback = mongoose.model('HelpFeedback', helpFeedbackSchema);
const SearchHistory = mongoose.model('SearchHistory', searchHistorySchema);
const SupportTicket = mongoose.model('SupportTicket', supportTicketSchema);

module.exports = {
  HelpArticle,
  HelpFeedback,
  SearchHistory,
  SupportTicket
};