const mongoose = require('mongoose');

// ATM/Branch Location Schema
const locationSchema = new mongoose.Schema({
  locationType: {
    type: String,
    required: true,
    enum: ['atm', 'branch', 'both']
  },
  name: {
    type: String,
    required: [true, 'Location name is required'],
    trim: true
  },
  address: {
    street: {
      type: String,
      required: true,
      trim: true
    },
    city: {
      type: String,
      required: true,
      trim: true
    },
    state: {
      type: String,
      required: true,
      trim: true
    },
    zipCode: {
      type: String,
      required: true,
      trim: true
    },
    country: {
      type: String,
      default: 'United States',
      trim: true
    }
  },
  coordinates: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
      required: true
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  phone: {
    type: String,
    trim: true
  },
  hours: {
    monday: { open: String, close: String },
    tuesday: { open: String, close: String },
    wednesday: { open: String, close: String },
    thursday: { open: String, close: String },
    friday: { open: String, close: String },
    saturday: { open: String, close: String },
    sunday: { open: String, close: String }
  },
  services: [{
    type: String,
    enum: [
      'atm',
      'drive-thru-atm',
      'deposit-atm',
      'cash-only-atm',
      'full-service-branch',
      'notary-service',
      'safe-deposit-boxes',
      'financial-advisors',
      'coin-machine',
      'night-deposit',
      'handicap-accessible',
      '24-hour-access',
      'military-base',
      'video-teller'
    ]
  }],
  atmDetails: {
    atmId: String,
    brand: {
      type: String,
      default: 'Navy Federal'
    },
    depositEnabled: {
      type: Boolean,
      default: true
    },
    cashWithdrawal: {
      type: Boolean,
      default: true
    },
    checkDeposit: {
      type: Boolean,
      default: true
    },
    transferFunds: {
      type: Boolean,
      default: true
    },
    balanceInquiry: {
      type: Boolean,
      default: true
    },
    billPayment: {
      type: Boolean,
      default: false
    },
    driveThru: {
      type: Boolean,
      default: false
    },
    indoor: {
      type: Boolean,
      default: true
    },
    surchargeFreeCoop: {
      type: Boolean,
      default: true
    }
  },
  branchDetails: {
    branchCode: String,
    manager: String,
    appointmentRequired: {
      type: Boolean,
      default: false
    },
    languagesSpoken: [{
      type: String,
      default: ['English']
    }],
    specialServices: [String]
  },
  status: {
    type: String,
    enum: ['active', 'temporarily-closed', 'permanently-closed', 'maintenance'],
    default: 'active'
  },
  accessibility: {
    wheelchairAccessible: {
      type: Boolean,
      default: true
    },
    parkingAvailable: {
      type: Boolean,
      default: true
    },
    publicTransportNearby: {
      type: Boolean,
      default: false
    }
  },
  amenities: [{
    type: String,
    enum: [
      'parking',
      'wifi',
      'waiting-area',
      'children-play-area',
      'coffee-station',
      'private-offices',
      'atm-lobby',
      'outdoor-atm',
      'night-deposit-box'
    ]
  }],
  network: {
    type: String,
    enum: ['navy-federal', 'co-op', 'allpoint', 'partner'],
    default: 'navy-federal'
  },
  militaryBase: {
    onBase: {
      type: Boolean,
      default: false
    },
    baseName: String,
    accessRequirements: String
  },
  ratings: {
    average: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    count: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  images: [{
    url: String,
    caption: String,
    type: {
      type: String,
      enum: ['exterior', 'interior', 'atm', 'parking', 'other']
    }
  }],
  lastVerified: {
    type: Date,
    default: Date.now
  },
  additionalNotes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// INDEXES - Consolidated to avoid duplicates
locationSchema.index({ coordinates: '2dsphere' });
locationSchema.index({ locationType: 1, status: 1 });
locationSchema.index({ 'address.city': 1, 'address.state': 1 });
locationSchema.index({ 'address.zipCode': 1 });
locationSchema.index({ network: 1 });

// Virtual for formatted address
locationSchema.virtual('formattedAddress').get(function() {
  return `${this.address.street}, ${this.address.city}, ${this.address.state} ${this.address.zipCode}`;
});

// Virtual to check if open now
locationSchema.virtual('isOpenNow').get(function() {
  if (!this.hours) return false;
  
  const now = new Date();
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const today = days[now.getDay()];
  const currentTime = now.getHours() * 60 + now.getMinutes();
  
  const todayHours = this.hours[today];
  if (!todayHours || !todayHours.open || !todayHours.close) return false;
  
  const [openHour, openMin] = todayHours.open.split(':').map(Number);
  const [closeHour, closeMin] = todayHours.close.split(':').map(Number);
  
  const openTime = openHour * 60 + openMin;
  const closeTime = closeHour * 60 + closeMin;
  
  return currentTime >= openTime && currentTime <= closeTime;
});

// Method to calculate distance from a point
locationSchema.methods.distanceFrom = function(longitude, latitude) {
  const R = 3958.8;
  const lat1 = latitude * Math.PI / 180;
  const lat2 = this.coordinates.coordinates[1] * Math.PI / 180;
  const deltaLat = (this.coordinates.coordinates[1] - latitude) * Math.PI / 180;
  const deltaLon = (this.coordinates.coordinates[0] - longitude) * Math.PI / 180;
  
  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return (R * c).toFixed(2);
};

// User Review Schema
const locationReviewSchema = new mongoose.Schema({
  locationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    trim: true,
    maxlength: [1000, 'Comment cannot exceed 1000 characters']
  },
  categories: {
    cleanliness: { type: Number, min: 1, max: 5 },
    service: { type: Number, min: 1, max: 5 },
    accessibility: { type: Number, min: 1, max: 5 },
    waitTime: { type: Number, min: 1, max: 5 }
  },
  verified: {
    type: Boolean,
    default: false
  },
  helpful: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true
});

locationReviewSchema.index({ locationId: 1, userId: 1 }, { unique: true });

locationReviewSchema.post('save', async function() {
  const Location = mongoose.model('Location');
  const reviews = await mongoose.model('LocationReview').find({ 
    locationId: this.locationId 
  });
  
  if (reviews.length > 0) {
    const avgRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
    await Location.findByIdAndUpdate(this.locationId, {
      'ratings.average': avgRating.toFixed(1),
      'ratings.count': reviews.length
    });
  }
});

// User Favorites Schema
const favoriteLocationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  locationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    required: true,
    index: true
  },
  nickname: {
    type: String,
    trim: true,
    maxlength: 50
  }
}, {
  timestamps: true
});

favoriteLocationSchema.index({ userId: 1, locationId: 1 }, { unique: true });

// Search History Schema
const locationSearchSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  searchType: {
    type: String,
    enum: ['address', 'city', 'zipcode', 'coordinates', 'nearby'],
    required: true
  },
  searchQuery: {
    type: String,
    trim: true
  },
  coordinates: {
    latitude: Number,
    longitude: Number
  },
  filters: {
    locationType: String,
    services: [String],
    radius: Number
  },
  resultsCount: {
    type: Number,
    default: 0
  },
  selectedLocationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location'
  }
}, {
  timestamps: true
});

locationSearchSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

const Location = mongoose.model('Location', locationSchema);
const LocationReview = mongoose.model('LocationReview', locationReviewSchema);
const FavoriteLocation = mongoose.model('FavoriteLocation', favoriteLocationSchema);
const LocationSearch = mongoose.model('LocationSearch', locationSearchSchema);

module.exports = {
  Location,
  LocationReview,
  FavoriteLocation,
  LocationSearch
};