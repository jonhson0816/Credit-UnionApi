const { Location, LocationReview, FavoriteLocation, LocationSearch } = require('../models/ATMLocator');

// ==================== LOCATION SEARCH & DISCOVERY ====================

// Search locations near coordinates
exports.searchNearby = async (req, res) => {
  try {
    const { latitude, longitude, radius = 25, type, services } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    const radiusInMeters = parseFloat(radius) * 1609.34; // Convert miles to meters

    // Build query
    const query = {
      status: 'active',
      coordinates: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lon, lat]
          },
          $maxDistance: radiusInMeters
        }
      }
    };

    if (type && type !== 'all') {
      query.locationType = type === 'both' ? 'both' : type;
    }

    if (services) {
      const serviceArray = Array.isArray(services) ? services : [services];
      query.services = { $in: serviceArray };
    }

    const locations = await Location.find(query).limit(50).lean();

    // Calculate distances and add to results
    const locationsWithDistance = locations.map(location => ({
      ...location,
      distance: calculateDistance(lat, lon, location.coordinates.coordinates[1], location.coordinates.coordinates[0])
    }));

    // Sort by distance
    locationsWithDistance.sort((a, b) => a.distance - b.distance);

    // Log search (async)
    if (req.user) {
      LocationSearch.create({
        userId: req.user._id,
        searchType: 'nearby',
        coordinates: { latitude: lat, longitude: lon },
        filters: { locationType: type, services, radius },
        resultsCount: locationsWithDistance.length
      }).catch(err => console.error('Search logging error:', err));
    }

    res.status(200).json({
      success: true,
      count: locationsWithDistance.length,
      data: locationsWithDistance
    });
  } catch (error) {
    console.error('Search Nearby Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search locations',
      error: error.message
    });
  }
};

// Search by address/city/zip
exports.searchByAddress = async (req, res) => {
  try {
    const { query, type, services, limit = 20 } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters'
      });
    }

    // Build search query
    const searchQuery = {
      status: 'active',
      $or: [
        { 'address.street': { $regex: query, $options: 'i' } },
        { 'address.city': { $regex: query, $options: 'i' } },
        { 'address.zipCode': { $regex: query, $options: 'i' } },
        { name: { $regex: query, $options: 'i' } }
      ]
    };

    if (type && type !== 'all') {
      searchQuery.locationType = type;
    }

    if (services) {
      const serviceArray = Array.isArray(services) ? services : [services];
      searchQuery.services = { $in: serviceArray };
    }

    const locations = await Location.find(searchQuery)
      .limit(parseInt(limit))
      .lean();

    // Log search
    if (req.user) {
      LocationSearch.create({
        userId: req.user._id,
        searchType: 'address',
        searchQuery: query,
        filters: { locationType: type, services },
        resultsCount: locations.length
      }).catch(err => console.error('Search logging error:', err));
    }

    res.status(200).json({
      success: true,
      count: locations.length,
      data: locations
    });
  } catch (error) {
    console.error('Search By Address Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search locations',
      error: error.message
    });
  }
};

// Get single location by ID
exports.getLocationById = async (req, res) => {
  try {
    const { locationId } = req.params;

    const location = await Location.findOne({
      _id: locationId,
      status: 'active'
    }).lean();

    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }

    // Get reviews for this location
    const reviews = await LocationReview.find({ locationId })
      .populate('userId', 'firstName lastName')
      .sort('-createdAt')
      .limit(10)
      .lean();

    // Check if user has favorited this location
    let isFavorite = false;
    if (req.user) {
      const favorite = await FavoriteLocation.findOne({
        userId: req.user._id,
        locationId
      });
      isFavorite = !!favorite;
    }

    res.status(200).json({
      success: true,
      data: {
        ...location,
        reviews,
        isFavorite
      }
    });
  } catch (error) {
    console.error('Get Location Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch location',
      error: error.message
    });
  }
};

// Get all states with locations
exports.getAvailableStates = async (req, res) => {
  try {
    const states = await Location.distinct('address.state', { status: 'active' });
    
    res.status(200).json({
      success: true,
      data: states.sort()
    });
  } catch (error) {
    console.error('Get States Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch states',
      error: error.message
    });
  }
};

// Get cities by state
exports.getCitiesByState = async (req, res) => {
  try {
    const { state } = req.params;

    const cities = await Location.distinct('address.city', {
      'address.state': state,
      status: 'active'
    });

    res.status(200).json({
      success: true,
      data: cities.sort()
    });
  } catch (error) {
    console.error('Get Cities Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cities',
      error: error.message
    });
  }
};

// ==================== FAVORITES ====================

// Add location to favorites
exports.addFavorite = async (req, res) => {
  try {
    const { locationId, nickname } = req.body;

    if (!locationId) {
      return res.status(400).json({
        success: false,
        message: 'Location ID is required'
      });
    }

    // Check if location exists
    const location = await Location.findById(locationId);
    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }

    // Check if already favorited
    const existingFavorite = await FavoriteLocation.findOne({
      userId: req.user._id,
      locationId
    });

    if (existingFavorite) {
      return res.status(409).json({
        success: false,
        message: 'Location already in favorites'
      });
    }

    const favorite = await FavoriteLocation.create({
      userId: req.user._id,
      locationId,
      nickname: nickname || location.name
    });

    res.status(201).json({
      success: true,
      message: 'Location added to favorites',
      data: favorite
    });
  } catch (error) {
    console.error('Add Favorite Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add favorite',
      error: error.message
    });
  }
};

// Get user's favorite locations
exports.getFavorites = async (req, res) => {
  try {
    const favorites = await FavoriteLocation.find({ userId: req.user._id })
      .populate('locationId')
      .sort('-createdAt')
      .lean();

    res.status(200).json({
      success: true,
      data: favorites
    });
  } catch (error) {
    console.error('Get Favorites Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch favorites',
      error: error.message
    });
  }
};

// Remove from favorites
exports.removeFavorite = async (req, res) => {
  try {
    const { locationId } = req.params;

    const result = await FavoriteLocation.findOneAndDelete({
      userId: req.user._id,
      locationId
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Favorite not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Location removed from favorites'
    });
  } catch (error) {
    console.error('Remove Favorite Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove favorite',
      error: error.message
    });
  }
};

// ==================== REVIEWS ====================

// Submit review
exports.submitReview = async (req, res) => {
  try {
    const { locationId, rating, comment, categories } = req.body;

    if (!locationId || !rating) {
      return res.status(400).json({
        success: false,
        message: 'Location ID and rating are required'
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    // Check if location exists
    const location = await Location.findById(locationId);
    if (!location) {
      return res.status(404).json({
        success: false,
        message: 'Location not found'
      });
    }

    // Check for duplicate review
    const existingReview = await LocationReview.findOne({
      userId: req.user._id,
      locationId
    });

    if (existingReview) {
      return res.status(409).json({
        success: false,
        message: 'You have already reviewed this location'
      });
    }

    const review = await LocationReview.create({
      locationId,
      userId: req.user._id,
      rating,
      comment,
      categories
    });

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully',
      data: review
    });
  } catch (error) {
    console.error('Submit Review Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit review',
      error: error.message
    });
  }
};

// Get reviews for a location
exports.getLocationReviews = async (req, res) => {
  try {
    const { locationId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const reviews = await LocationReview.find({ locationId })
      .populate('userId', 'firstName lastName')
      .sort('-createdAt')
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    const total = await LocationReview.countDocuments({ locationId });

    res.status(200).json({
      success: true,
      data: reviews,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get Reviews Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reviews',
      error: error.message
    });
  }
};

// Mark review as helpful
exports.markReviewHelpful = async (req, res) => {
  try {
    const { reviewId } = req.params;

    const review = await LocationReview.findByIdAndUpdate(
      reviewId,
      { $inc: { helpful: 1 } },
      { new: true }
    );

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Marked as helpful',
      data: review
    });
  } catch (error) {
    console.error('Mark Helpful Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark review',
      error: error.message
    });
  }
};

// ==================== STATISTICS & ANALYTICS ====================

// Get location statistics
exports.getLocationStats = async (req, res) => {
  try {
    const [
      totalLocations,
      atmCount,
      branchCount,
      stateCount,
      topRatedLocations
    ] = await Promise.all([
      Location.countDocuments({ status: 'active' }),
      Location.countDocuments({ locationType: 'atm', status: 'active' }),
      Location.countDocuments({ locationType: { $in: ['branch', 'both'] }, status: 'active' }),
      Location.distinct('address.state', { status: 'active' }),
      Location.find({ status: 'active' })
        .sort('-ratings.average')
        .limit(5)
        .select('name address ratings')
        .lean()
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalLocations,
        atmCount,
        branchCount,
        stateCount: stateCount.length,
        topRatedLocations
      }
    });
  } catch (error) {
    console.error('Get Stats Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
};

// ==================== HELPER FUNCTIONS ====================

// Calculate distance between two points (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3958.8; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return parseFloat(distance.toFixed(2));
}