const { Location, LocationReview, FavoriteLocation } = require('../models/ATMLocator');

// ==================== BRANCH-SPECIFIC SEARCH & DISCOVERY ====================

// Search branches near coordinates
exports.searchBranchesNearby = async (req, res) => {
  try {
    const { latitude, longitude, radius = 25, services } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    const radiusInMeters = parseFloat(radius) * 1609.34;

    // Query only branches (not ATMs)
    const query = {
      status: 'active',
      locationType: { $in: ['branch', 'both'] }, // Only branches or both
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

    if (services) {
      const serviceArray = Array.isArray(services) ? services : [services];
      query.services = { $in: serviceArray };
    }

    const branches = await Location.find(query).limit(50).lean();

    // Calculate distances
    const branchesWithDistance = branches.map(branch => ({
      ...branch,
      distance: calculateDistance(lat, lon, branch.coordinates.coordinates[1], branch.coordinates.coordinates[0])
    }));

    branchesWithDistance.sort((a, b) => a.distance - b.distance);

    res.status(200).json({
      success: true,
      count: branchesWithDistance.length,
      data: branchesWithDistance
    });
  } catch (error) {
    console.error('Search Branches Nearby Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search branches',
      error: error.message
    });
  }
};

// Search branches by address/city/state
exports.searchBranchesByAddress = async (req, res) => {
  try {
    const { query, services, limit = 20 } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters'
      });
    }

    const searchQuery = {
      status: 'active',
      locationType: { $in: ['branch', 'both'] },
      $or: [
        { 'address.street': { $regex: query, $options: 'i' } },
        { 'address.city': { $regex: query, $options: 'i' } },
        { 'address.state': { $regex: query, $options: 'i' } },
        { 'address.zipCode': { $regex: query, $options: 'i' } },
        { name: { $regex: query, $options: 'i' } }
      ]
    };

    if (services) {
      const serviceArray = Array.isArray(services) ? services : [services];
      searchQuery.services = { $in: serviceArray };
    }

    const branches = await Location.find(searchQuery)
      .limit(parseInt(limit))
      .lean();

    res.status(200).json({
      success: true,
      count: branches.length,
      data: branches
    });
  } catch (error) {
    console.error('Search Branches By Address Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search branches',
      error: error.message
    });
  }
};

// Get single branch details
exports.getBranchById = async (req, res) => {
  try {
    const { branchId } = req.params;

    const branch = await Location.findOne({
      _id: branchId,
      status: 'active',
      locationType: { $in: ['branch', 'both'] }
    }).lean();

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Branch not found'
      });
    }

    // Get reviews
    const reviews = await LocationReview.find({ locationId: branchId })
      .populate('userId', 'firstName lastName')
      .sort('-createdAt')
      .limit(10)
      .lean();

    // Check if favorited
    let isFavorite = false;
    if (req.user) {
      const favorite = await FavoriteLocation.findOne({
        userId: req.user._id,
        locationId: branchId
      });
      isFavorite = !!favorite;
    }

    res.status(200).json({
      success: true,
      data: {
        ...branch,
        reviews,
        isFavorite
      }
    });
  } catch (error) {
    console.error('Get Branch Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch branch',
      error: error.message
    });
  }
};

// Get branches by state
exports.getBranchesByState = async (req, res) => {
  try {
    const { state } = req.params;
    const { limit = 50 } = req.query;

    const branches = await Location.find({
      'address.state': state,
      status: 'active',
      locationType: { $in: ['branch', 'both'] }
    })
      .limit(parseInt(limit))
      .sort('address.city')
      .lean();

    res.status(200).json({
      success: true,
      count: branches.length,
      data: branches
    });
  } catch (error) {
    console.error('Get Branches By State Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch branches',
      error: error.message
    });
  }
};

// Get branches by city
exports.getBranchesByCity = async (req, res) => {
  try {
    const { state, city } = req.params;

    const branches = await Location.find({
      'address.state': state,
      'address.city': city,
      status: 'active',
      locationType: { $in: ['branch', 'both'] }
    })
      .sort('name')
      .lean();

    res.status(200).json({
      success: true,
      count: branches.length,
      data: branches
    });
  } catch (error) {
    console.error('Get Branches By City Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch branches',
      error: error.message
    });
  }
};

// Get all states with branches
exports.getStatesWithBranches = async (req, res) => {
  try {
    const states = await Location.distinct('address.state', {
      status: 'active',
      locationType: { $in: ['branch', 'both'] }
    });

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

// Get cities with branches by state
exports.getCitiesWithBranches = async (req, res) => {
  try {
    const { state } = req.params;

    const cities = await Location.distinct('address.city', {
      'address.state': state,
      status: 'active',
      locationType: { $in: ['branch', 'both'] }
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

// ==================== BRANCH SERVICES & FEATURES ====================

// Get branches with specific services
exports.getBranchesByService = async (req, res) => {
  try {
    const { service } = req.params;
    const { latitude, longitude, radius = 50 } = req.query;

    let query = {
      status: 'active',
      locationType: { $in: ['branch', 'both'] },
      services: service
    };

    let branches;

    if (latitude && longitude) {
      const lat = parseFloat(latitude);
      const lon = parseFloat(longitude);
      const radiusInMeters = parseFloat(radius) * 1609.34;

      query.coordinates = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lon, lat]
          },
          $maxDistance: radiusInMeters
        }
      };

      branches = await Location.find(query).limit(50).lean();

      branches = branches.map(branch => ({
        ...branch,
        distance: calculateDistance(lat, lon, branch.coordinates.coordinates[1], branch.coordinates.coordinates[0])
      }));
    } else {
      branches = await Location.find(query).limit(50).lean();
    }

    res.status(200).json({
      success: true,
      count: branches.length,
      data: branches
    });
  } catch (error) {
    console.error('Get Branches By Service Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch branches',
      error: error.message
    });
  }
};

// Get branches on military bases
exports.getMilitaryBaseBranches = async (req, res) => {
  try {
    const { latitude, longitude, radius = 100 } = req.query;

    let query = {
      status: 'active',
      locationType: { $in: ['branch', 'both'] },
      'militaryBase.onBase': true
    };

    let branches;

    if (latitude && longitude) {
      const lat = parseFloat(latitude);
      const lon = parseFloat(longitude);
      const radiusInMeters = parseFloat(radius) * 1609.34;

      query.coordinates = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [lon, lat]
          },
          $maxDistance: radiusInMeters
        }
      };

      branches = await Location.find(query).limit(50).lean();

      branches = branches.map(branch => ({
        ...branch,
        distance: calculateDistance(lat, lon, branch.coordinates.coordinates[1], branch.coordinates.coordinates[0])
      }));
    } else {
      branches = await Location.find(query).limit(50).lean();
    }

    res.status(200).json({
      success: true,
      count: branches.length,
      data: branches
    });
  } catch (error) {
    console.error('Get Military Base Branches Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch military base branches',
      error: error.message
    });
  }
};

// ==================== BRANCH APPOINTMENTS ====================

// Schedule branch appointment (simplified - you may want to expand this)
exports.scheduleBranchAppointment = async (req, res) => {
  try {
    const { branchId, appointmentDate, appointmentTime, serviceType, notes } = req.body;

    if (!branchId || !appointmentDate || !appointmentTime || !serviceType) {
      return res.status(400).json({
        success: false,
        message: 'Branch, date, time, and service type are required'
      });
    }

    // Verify branch exists
    const branch = await Location.findOne({
      _id: branchId,
      status: 'active',
      locationType: { $in: ['branch', 'both'] }
    });

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: 'Branch not found'
      });
    }

    // Here you would integrate with an appointment system
    // For now, we'll return a success message
    const appointment = {
      appointmentId: `APT-${Date.now()}`,
      userId: req.user._id,
      branchId,
      branchName: branch.name,
      branchAddress: branch.formattedAddress,
      appointmentDate,
      appointmentTime,
      serviceType,
      notes,
      status: 'scheduled',
      createdAt: new Date()
    };

    res.status(201).json({
      success: true,
      message: 'Appointment scheduled successfully',
      data: appointment
    });
  } catch (error) {
    console.error('Schedule Appointment Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to schedule appointment',
      error: error.message
    });
  }
};

// ==================== BRANCH STATISTICS ====================

// Get branch statistics
exports.getBranchStats = async (req, res) => {
  try {
    const [
      totalBranches,
      stateCount,
      topRatedBranches,
      branchesWithFinancialAdvisors,
      branchesWithNotary,
      militaryBaseBranches
    ] = await Promise.all([
      Location.countDocuments({
        status: 'active',
        locationType: { $in: ['branch', 'both'] }
      }),
      Location.distinct('address.state', {
        status: 'active',
        locationType: { $in: ['branch', 'both'] }
      }),
      Location.find({
        status: 'active',
        locationType: { $in: ['branch', 'both'] }
      })
        .sort('-ratings.average')
        .limit(5)
        .select('name address ratings')
        .lean(),
      Location.countDocuments({
        status: 'active',
        locationType: { $in: ['branch', 'both'] },
        services: 'financial-advisors'
      }),
      Location.countDocuments({
        status: 'active',
        locationType: { $in: ['branch', 'both'] },
        services: 'notary-service'
      }),
      Location.countDocuments({
        status: 'active',
        locationType: { $in: ['branch', 'both'] },
        'militaryBase.onBase': true
      })
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalBranches,
        stateCount: stateCount.length,
        topRatedBranches,
        branchesWithFinancialAdvisors,
        branchesWithNotary,
        militaryBaseBranches
      }
    });
  } catch (error) {
    console.error('Get Branch Stats Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
};

// ==================== HELPER FUNCTIONS ====================

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return parseFloat(distance.toFixed(2));
}