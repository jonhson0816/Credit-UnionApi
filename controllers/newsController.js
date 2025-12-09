const News = require('../models/newsModel');

// Get all news articles with filtering, pagination, and search
exports.getAllNews = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 12, 
      category, 
      search, 
      featured,
      status = 'published',
      sortBy = 'publishDate',
      order = 'desc'
    } = req.query;

    // Build query
    const query = { status };

    if (category && category !== 'All') {
      query.category = category;
    }

    if (featured !== undefined) {
      query.featured = featured === 'true';
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { subtitle: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOrder = order === 'desc' ? -1 : 1;

    // Execute query
    const news = await News.find(query)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v');

    // Get total count for pagination
    const total = await News.countDocuments(query);

    res.status(200).json({
      status: 'success',
      results: news.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      data: news
    });

  } catch (error) {
    console.error('Get all news error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch news articles',
      error: error.message
    });
  }
};

// Get single news article by ID or slug
exports.getNewsById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Try to find by ID first, then by slug
    let news = await News.findById(id);
    
    if (!news) {
      news = await News.findOne({ slug: id, status: 'published' });
    }

    if (!news) {
      return res.status(404).json({
        status: 'error',
        message: 'News article not found'
      });
    }

    // Increment views
    news.views += 1;
    await news.save();

    res.status(200).json({
      status: 'success',
      data: news
    });

  } catch (error) {
    console.error('Get news by ID error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch news article',
      error: error.message
    });
  }
};

// Get featured news articles
exports.getFeaturedNews = async (req, res) => {
  try {
    const { limit = 3 } = req.query;

    const featuredNews = await News.find({ 
      featured: true, 
      status: 'published' 
    })
      .sort({ publishDate: -1 })
      .limit(parseInt(limit))
      .select('-__v');

    res.status(200).json({
      status: 'success',
      results: featuredNews.length,
      data: featuredNews
    });

  } catch (error) {
    console.error('Get featured news error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch featured news',
      error: error.message
    });
  }
};

// Get news categories with counts
exports.getCategories = async (req, res) => {
  try {
    const categories = await News.aggregate([
      { $match: { status: 'published' } },
      { $group: { 
        _id: '$category', 
        count: { $sum: 1 } 
      }},
      { $sort: { count: -1 } }
    ]);

    res.status(200).json({
      status: 'success',
      data: categories
    });

  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch categories',
      error: error.message
    });
  }
};

// Get recent news articles
exports.getRecentNews = async (req, res) => {
  try {
    const { limit = 5 } = req.query;

    const recentNews = await News.find({ status: 'published' })
      .sort({ publishDate: -1 })
      .limit(parseInt(limit))
      .select('title slug publishDate category');

    res.status(200).json({
      status: 'success',
      results: recentNews.length,
      data: recentNews
    });

  } catch (error) {
    console.error('Get recent news error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch recent news',
      error: error.message
    });
  }
};

// Create news article (Admin only - add auth middleware in routes)
exports.createNews = async (req, res) => {
  try {
    const newsData = {
      title: req.body.title,
      subtitle: req.body.subtitle,
      content: req.body.content,
      category: req.body.category,
      author: req.body.author || 'Navy Federal Credit Union',
      featured: req.body.featured || false,
      imageUrl: req.body.imageUrl,
      tags: req.body.tags || [],
      publishDate: req.body.publishDate || Date.now(),
      status: req.body.status || 'published'
    };

    const news = await News.create(newsData);

    res.status(201).json({
      status: 'success',
      message: 'News article created successfully',
      data: news
    });

  } catch (error) {
    console.error('Create news error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        status: 'error',
        message: 'A news article with this title already exists'
      });
    }

    res.status(500).json({
      status: 'error',
      message: 'Failed to create news article',
      error: error.message
    });
  }
};

// Update news article (Admin only)
exports.updateNews = async (req, res) => {
  try {
    const { id } = req.params;
    
    const news = await News.findByIdAndUpdate(
      id,
      req.body,
      { 
        new: true, 
        runValidators: true 
      }
    );

    if (!news) {
      return res.status(404).json({
        status: 'error',
        message: 'News article not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'News article updated successfully',
      data: news
    });

  } catch (error) {
    console.error('Update news error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update news article',
      error: error.message
    });
  }
};

// Delete news article (Admin only)
exports.deleteNews = async (req, res) => {
  try {
    const { id } = req.params;
    
    const news = await News.findByIdAndDelete(id);

    if (!news) {
      return res.status(404).json({
        status: 'error',
        message: 'News article not found'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'News article deleted successfully'
    });

  } catch (error) {
    console.error('Delete news error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete news article',
      error: error.message
    });
  }
};