const { HelpArticle, HelpFeedback, SearchHistory, SupportTicket } = require('../models/HelpCenter');
const mongoose = require('mongoose');

// ==================== HELP ARTICLES ====================

// Get all help categories with article counts
exports.getCategories = async (req, res) => {
  try {
    const categories = [
      {
        id: 'account-management',
        title: 'Account Management',
        description: 'Manage your accounts, update information, and view statements'
      },
      {
        id: 'digital-banking',
        title: 'Online & Mobile Banking',
        description: 'Learn about digital banking features and troubleshooting'
      },
      {
        id: 'cards-payments',
        title: 'Cards & Payments',
        description: 'Credit cards, debit cards, and payment solutions'
      },
      {
        id: 'loans-credit',
        title: 'Loans & Credit',
        description: 'Auto loans, mortgages, personal loans, and credit options'
      },
      {
        id: 'security-fraud',
        title: 'Security & Fraud',
        description: 'Protect your account and report suspicious activity'
      },
      {
        id: 'transfers-billpay',
        title: 'Transfers & Bill Pay',
        description: 'Send money, pay bills, and manage transfers'
      },
      {
        id: 'membership',
        title: 'Membership & Eligibility',
        description: 'Join Navy Federal and membership benefits'
      },
      {
        id: 'financial-tools',
        title: 'Financial Tools',
        description: 'Calculators, budgeting tools, and financial planning'
      }
    ];

    // Get article counts for each category
    const categoriesWithCounts = await Promise.all(
      categories.map(async (category) => {
        const count = await HelpArticle.countDocuments({
          category: category.id,
          status: 'published'
        });
        return { ...category, articleCount: count };
      })
    );

    res.status(200).json({
      success: true,
      data: categoriesWithCounts
    });
  } catch (error) {
    console.error('Get Categories Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
      error: error.message
    });
  }
};

// Get articles by category
exports.getArticlesByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { page = 1, limit = 20, sort = '-views' } = req.query;

    const articles = await HelpArticle.find({
      category: categoryId,
      status: 'published'
    })
      .select('title slug excerpt views helpful notHelpful readTime tags lastUpdated featured')
      .sort(sort)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    const total = await HelpArticle.countDocuments({
      category: categoryId,
      status: 'published'
    });

    res.status(200).json({
      success: true,
      data: articles,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get Articles By Category Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch articles',
      error: error.message
    });
  }
};

// Get single article by slug
exports.getArticleBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const article = await HelpArticle.findOne({ slug, status: 'published' })
      .populate('relatedArticles', 'title slug excerpt readTime')
      .lean();

    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }

    // Increment view count (async, don't wait)
    HelpArticle.findByIdAndUpdate(article._id, { $inc: { views: 1 } }).exec();

    res.status(200).json({
      success: true,
      data: article
    });
  } catch (error) {
    console.error('Get Article Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch article',
      error: error.message
    });
  }
};

// Search help articles
exports.searchArticles = async (req, res) => {
  try {
    const { q, category, page = 1, limit = 20 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters'
      });
    }

    const query = {
      status: 'published',
      $text: { $search: q }
    };

    if (category) {
      query.category = category;
    }

    const articles = await HelpArticle.find(query, {
      score: { $meta: 'textScore' }
    })
      .select('title slug excerpt category categoryTitle views readTime tags')
      .sort({ score: { $meta: 'textScore' }, views: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    const total = await HelpArticle.countDocuments(query);

    // Log search (async, don't wait)
    SearchHistory.create({
      userId: req.user?._id,
      query: q,
      resultsCount: total,
      sessionId: req.sessionID || req.ip
    }).catch(err => console.error('Search logging error:', err));

    res.status(200).json({
      success: true,
      data: articles,
      query: q,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Search Articles Error:', error);
    res.status(500).json({
      success: false,
      message: 'Search failed',
      error: error.message
    });
  }
};

// Get popular/featured articles
exports.getPopularArticles = async (req, res) => {
  try {
    const { limit = 6 } = req.query;

    const articles = await HelpArticle.find({ status: 'published' })
      .select('title slug excerpt views readTime category categoryTitle')
      .sort('-views')
      .limit(parseInt(limit))
      .lean();

    res.status(200).json({
      success: true,
      data: articles
    });
  } catch (error) {
    console.error('Get Popular Articles Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch popular articles',
      error: error.message
    });
  }
};

// Get featured articles
exports.getFeaturedArticles = async (req, res) => {
  try {
    const { limit = 5 } = req.query;

    const articles = await HelpArticle.find({
      status: 'published',
      featured: true
    })
      .select('title slug excerpt views readTime category categoryTitle')
      .sort('-views')
      .limit(parseInt(limit))
      .lean();

    res.status(200).json({
      success: true,
      data: articles
    });
  } catch (error) {
    console.error('Get Featured Articles Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch featured articles',
      error: error.message
    });
  }
};

// ==================== ARTICLE FEEDBACK ====================

// Submit article feedback
exports.submitFeedback = async (req, res) => {
  try {
    const { articleId, helpful, comment, rating, category } = req.body;

    if (!articleId || helpful === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Article ID and helpful status are required'
      });
    }

    // Check if article exists
    const article = await HelpArticle.findById(articleId);
    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }

    // Check for duplicate feedback (if user is logged in)
    if (req.user) {
      const existingFeedback = await HelpFeedback.findOne({
        articleId,
        userId: req.user._id
      });

      if (existingFeedback) {
        return res.status(409).json({
          success: false,
          message: 'You have already provided feedback for this article'
        });
      }
    }

    // Create feedback
    const feedback = await HelpFeedback.create({
      articleId,
      userId: req.user?._id,
      helpful,
      comment,
      rating,
      category,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip
    });

    // Update article helpful/not helpful count
    const updateField = helpful ? 'helpful' : 'notHelpful';
    await HelpArticle.findByIdAndUpdate(articleId, {
      $inc: { [updateField]: 1 }
    });

    res.status(201).json({
      success: true,
      message: 'Thank you for your feedback!',
      data: feedback
    });
  } catch (error) {
    console.error('Submit Feedback Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit feedback',
      error: error.message
    });
  }
};

// Get article feedback stats
exports.getArticleFeedbackStats = async (req, res) => {
  try {
    const { articleId } = req.params;

    const article = await HelpArticle.findById(articleId)
      .select('helpful notHelpful views')
      .lean();

    if (!article) {
      return res.status(404).json({
        success: false,
        message: 'Article not found'
      });
    }

    const total = article.helpful + article.notHelpful;
    const helpfulPercentage = total > 0 ? ((article.helpful / total) * 100).toFixed(1) : 0;

    res.status(200).json({
      success: true,
      data: {
        helpful: article.helpful,
        notHelpful: article.notHelpful,
        total,
        helpfulPercentage: parseFloat(helpfulPercentage),
        views: article.views
      }
    });
  } catch (error) {
    console.error('Get Feedback Stats Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch feedback stats',
      error: error.message
    });
  }
};

// ==================== SUPPORT TICKETS ====================

// Create support ticket
exports.createSupportTicket = async (req, res) => {
  try {
    const { category, subject, description, priority, attachments } = req.body;

    // Validation
    if (!category || !subject || !description) {
      return res.status(400).json({
        success: false,
        message: 'Category, subject, and description are required'
      });
    }

    const ticket = await SupportTicket.create({
      userId: req.user._id,
      category,
      subject,
      description,
      priority: priority || 'medium',
      attachments: attachments || [],
      messages: [{
        sender: 'user',
        message: description,
        timestamp: new Date()
      }],
      metadata: {
        source: 'web',
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip
      }
    });

    res.status(201).json({
      success: true,
      message: 'Support ticket created successfully',
      data: ticket
    });
  } catch (error) {
    console.error('Create Support Ticket Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create support ticket',
      error: error.message
    });
  }
};

// Get user's support tickets
exports.getUserTickets = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    const query = { userId: req.user._id };
    if (status) {
      query.status = status;
    }

    const tickets = await SupportTicket.find(query)
      .select('-messages -metadata')
      .sort('-createdAt')
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    const total = await SupportTicket.countDocuments(query);

    res.status(200).json({
      success: true,
      data: tickets,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get User Tickets Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tickets',
      error: error.message
    });
  }
};

// Get single ticket
exports.getTicketById = async (req, res) => {
  try {
    const { ticketId } = req.params;

    const ticket = await SupportTicket.findOne({
      _id: ticketId,
      userId: req.user._id
    }).lean();

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    res.status(200).json({
      success: true,
      data: ticket
    });
  } catch (error) {
    console.error('Get Ticket Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch ticket',
      error: error.message
    });
  }
};

// Add message to ticket
exports.addTicketMessage = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { message, attachments } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }

    const ticket = await SupportTicket.findOne({
      _id: ticketId,
      userId: req.user._id
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    if (ticket.status === 'closed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot add message to closed ticket'
      });
    }

    ticket.messages.push({
      sender: 'user',
      message,
      attachments: attachments || [],
      timestamp: new Date()
    });

    // Update status to in-progress if it was pending
    if (ticket.status === 'pending') {
      ticket.status = 'in-progress';
    }

    await ticket.save();

    res.status(200).json({
      success: true,
      message: 'Message added successfully',
      data: ticket
    });
  } catch (error) {
    console.error('Add Ticket Message Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add message',
      error: error.message
    });
  }
};

// Close ticket
exports.closeTicket = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { rating, comment } = req.body;

    const ticket = await SupportTicket.findOne({
      _id: ticketId,
      userId: req.user._id
    });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }

    ticket.status = 'closed';
    ticket.closedAt = new Date();

    if (rating) {
      ticket.rating = {
        score: rating,
        comment: comment || '',
        ratedAt: new Date()
      };
    }

    await ticket.save();

    res.status(200).json({
      success: true,
      message: 'Ticket closed successfully',
      data: ticket
    });
  } catch (error) {
    console.error('Close Ticket Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to close ticket',
      error: error.message
    });
  }
};

// ==================== ANALYTICS & STATISTICS ====================

// Get help center statistics
exports.getHelpCenterStats = async (req, res) => {
  try {
    const [
      totalArticles,
      totalViews,
      totalTickets,
      openTickets,
      avgResolutionTime,
      topSearches
    ] = await Promise.all([
      HelpArticle.countDocuments({ status: 'published' }),
      HelpArticle.aggregate([
        { $match: { status: 'published' } },
        { $group: { _id: null, total: { $sum: '$views' } } }
      ]),
      SupportTicket.countDocuments({ userId: req.user._id }),
      SupportTicket.countDocuments({ 
        userId: req.user._id, 
        status: { $in: ['open', 'in-progress'] } 
      }),
      SupportTicket.aggregate([
        {
          $match: {
            userId: req.user._id,
            status: 'resolved',
            resolvedAt: { $exists: true }
          }
        },
        {
          $project: {
            resolutionTime: {
              $divide: [
                { $subtract: ['$resolvedAt', '$createdAt'] },
                3600000 // Convert to hours
              ]
            }
          }
        },
        {
          $group: {
            _id: null,
            avgTime: { $avg: '$resolutionTime' }
          }
        }
      ]),
      SearchHistory.aggregate([
        {
          $match: {
            createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
          }
        },
        { $group: { _id: '$query', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ])
    ]);

    res.status(200).json({
      success: true,
      data: {
        articles: {
          total: totalArticles,
          views: totalViews[0]?.total || 0
        },
        tickets: {
          total: totalTickets,
          open: openTickets,
          avgResolutionTime: avgResolutionTime[0]?.avgTime?.toFixed(1) || 0
        },
        topSearches: topSearches.map(s => ({
          query: s._id,
          count: s.count
        }))
      }
    });
  } catch (error) {
    console.error('Get Help Center Stats Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
};