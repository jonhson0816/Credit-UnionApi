const mongoose = require('mongoose');

const newsSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'News title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  subtitle: {
    type: String,
    trim: true,
    maxlength: [300, 'Subtitle cannot exceed 300 characters']
  },
  content: {
    type: String,
    required: [true, 'News content is required']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['Press Release', 'Company News', 'Community', 'Awards', 'Financial Tips', 'Product Updates'],
    default: 'Company News'
  },
  author: {
    type: String,
    required: [true, 'Author name is required'],
    default: 'Navy Federal Credit Union'
  },
  featured: {
    type: Boolean,
    default: false
  },
  imageUrl: {
    type: String,
    default: '/uploads/news/default-news.jpg'
  },
  tags: [{
    type: String,
    trim: true
  }],
  publishDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'published'
  },
  views: {
    type: Number,
    default: 0
  },
  slug: {
    type: String,
    unique: true,
    trim: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Create slug from title before saving
newsSchema.pre('save', function(next) {
  if (this.isModified('title')) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/--+/g, '-')
      .trim();
  }
  next();
});

// Index for better query performance
newsSchema.index({ publishDate: -1, status: 1 });
newsSchema.index({ category: 1, status: 1 });
newsSchema.index({ slug: 1 });
newsSchema.index({ featured: -1, publishDate: -1 });

// Virtual for formatted date
newsSchema.virtual('formattedDate').get(function() {
  return this.publishDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
});

const News = mongoose.model('News', newsSchema);

module.exports = News;