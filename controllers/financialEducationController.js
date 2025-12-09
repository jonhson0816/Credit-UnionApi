const { Article, Quiz, UserProgress } = require('../models/FinancialEducation');

const financialEducationController = {
  // Get all articles
  getAllArticles: async (req, res) => {
    try {
      const { category, difficulty, featured, search } = req.query;
      
      let query = { published: true };
      
      if (category) query.category = category;
      if (difficulty) query.difficulty = difficulty;
      if (featured === 'true') query.featured = true;
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { content: { $regex: search, $options: 'i' } },
          { tags: { $in: [new RegExp(search, 'i')] } }
        ];
      }
      
      const articles = await Article.find(query)
        .sort({ createdAt: -1 })
        .select('-content');
      
      res.json({
        success: true,
        data: articles
      });
    } catch (error) {
      console.error('Get articles error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch articles',
        error: error.message
      });
    }
  },

  // Get single article
  getArticleById: async (req, res) => {
    try {
      const { id } = req.params;
      
      const article = await Article.findById(id);
      
      if (!article) {
        return res.status(404).json({
          success: false,
          message: 'Article not found'
        });
      }
      
      // Increment views
      article.views += 1;
      await article.save();
      
      res.json({
        success: true,
        data: article
      });
    } catch (error) {
      console.error('Get article error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch article',
        error: error.message
      });
    }
  },

  // Create article (admin only)
  createArticle: async (req, res) => {
    try {
      const articleData = req.body;
      
      const article = new Article(articleData);
      await article.save();
      
      res.status(201).json({
        success: true,
        message: 'Article created successfully',
        data: article
      });
    } catch (error) {
      console.error('Create article error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create article',
        error: error.message
      });
    }
  },

  // Like/unlike article
  toggleLikeArticle: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user._id;
      
      const article = await Article.findById(id);
      
      if (!article) {
        return res.status(404).json({
          success: false,
          message: 'Article not found'
        });
      }
      
      const likeIndex = article.likes.indexOf(userId);
      
      if (likeIndex > -1) {
        article.likes.splice(likeIndex, 1);
      } else {
        article.likes.push(userId);
      }
      
      await article.save();
      
      res.json({
        success: true,
        message: likeIndex > -1 ? 'Article unliked' : 'Article liked',
        data: { likes: article.likes.length }
      });
    } catch (error) {
      console.error('Toggle like error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to toggle like',
        error: error.message
      });
    }
  },

  // Get all quizzes
  getAllQuizzes: async (req, res) => {
    try {
      const { category, difficulty } = req.query;
      
      let query = {};
      
      if (category) query.category = category;
      if (difficulty) query.difficulty = difficulty;
      
      const quizzes = await Quiz.find(query)
        .select('-questions.correctAnswer -questions.explanation')
        .sort({ createdAt: -1 });
      
      res.json({
        success: true,
        data: quizzes
      });
    } catch (error) {
      console.error('Get quizzes error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch quizzes',
        error: error.message
      });
    }
  },

  // Get single quiz
  getQuizById: async (req, res) => {
    try {
      const { id } = req.params;
      
      const quiz = await Quiz.findById(id)
        .select('-questions.correctAnswer -questions.explanation');
      
      if (!quiz) {
        return res.status(404).json({
          success: false,
          message: 'Quiz not found'
        });
      }
      
      res.json({
        success: true,
        data: quiz
      });
    } catch (error) {
      console.error('Get quiz error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch quiz',
        error: error.message
      });
    }
  },

  // Submit quiz answers
  submitQuiz: async (req, res) => {
    try {
      const { id } = req.params;
      const { answers } = req.body;
      const userId = req.user._id;
      
      const quiz = await Quiz.findById(id);
      
      if (!quiz) {
        return res.status(404).json({
          success: false,
          message: 'Quiz not found'
        });
      }
      
      // Calculate score
      let correctAnswers = 0;
      const results = quiz.questions.map((question, index) => {
        const isCorrect = question.correctAnswer === answers[index];
        if (isCorrect) correctAnswers++;
        
        return {
          question: question.question,
          userAnswer: answers[index],
          correctAnswer: question.correctAnswer,
          isCorrect,
          explanation: question.explanation
        };
      });
      
      const score = Math.round((correctAnswers / quiz.questions.length) * 100);
      const passed = score >= quiz.passingScore;
      
      // Update user progress
      let userProgress = await UserProgress.findOne({ userId });
      
      if (!userProgress) {
        userProgress = new UserProgress({ userId });
      }
      
      const quizProgress = userProgress.completedQuizzes.find(
        q => q.quizId.toString() === id
      );
      
      if (quizProgress) {
        quizProgress.attempts += 1;
        quizProgress.score = Math.max(quizProgress.score, score);
        quizProgress.lastAttempt = new Date();
      } else {
        userProgress.completedQuizzes.push({
          quizId: id,
          score,
          attempts: 1,
          lastAttempt: new Date()
        });
      }
      
      // Award points
      if (passed) {
        userProgress.totalPoints += score;
        userProgress.level = Math.floor(userProgress.totalPoints / 500) + 1;
      }
      
      await userProgress.save();
      
      res.json({
        success: true,
        data: {
          score,
          passed,
          correctAnswers,
          totalQuestions: quiz.questions.length,
          results
        }
      });
    } catch (error) {
      console.error('Submit quiz error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to submit quiz',
        error: error.message
      });
    }
  },

  // Get user progress
  getUserProgress: async (req, res) => {
    try {
      const userId = req.user._id;
      
      let userProgress = await UserProgress.findOne({ userId })
        .populate('savedArticles', 'title category imageUrl')
        .populate('completedArticles.articleId', 'title category');
      
      if (!userProgress) {
        userProgress = new UserProgress({ userId });
        await userProgress.save();
      }
      
      res.json({
        success: true,
        data: userProgress
      });
    } catch (error) {
      console.error('Get user progress error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user progress',
        error: error.message
      });
    }
  },

  // Mark article as completed
  markArticleCompleted: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user._id;
      
      let userProgress = await UserProgress.findOne({ userId });
      
      if (!userProgress) {
        userProgress = new UserProgress({ userId });
      }
      
      const alreadyCompleted = userProgress.completedArticles.some(
        a => a.articleId.toString() === id
      );
      
      if (!alreadyCompleted) {
        userProgress.completedArticles.push({
          articleId: id,
          completedAt: new Date()
        });
        
        userProgress.totalPoints += 10;
        userProgress.level = Math.floor(userProgress.totalPoints / 500) + 1;
        
        // Update streak
        const today = new Date().toDateString();
        const lastActivity = userProgress.streak.lastActivity 
          ? new Date(userProgress.streak.lastActivity).toDateString() 
          : null;
        
        if (lastActivity !== today) {
          userProgress.streak.current += 1;
          userProgress.streak.longest = Math.max(
            userProgress.streak.current,
            userProgress.streak.longest
          );
          userProgress.streak.lastActivity = new Date();
        }
        
        await userProgress.save();
      }
      
      res.json({
        success: true,
        message: 'Article marked as completed',
        data: userProgress
      });
    } catch (error) {
      console.error('Mark completed error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to mark article as completed',
        error: error.message
      });
    }
  },

  // Save/unsave article
  toggleSaveArticle: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user._id;
      
      let userProgress = await UserProgress.findOne({ userId });
      
      if (!userProgress) {
        userProgress = new UserProgress({ userId });
      }
      
      const savedIndex = userProgress.savedArticles.indexOf(id);
      
      if (savedIndex > -1) {
        userProgress.savedArticles.splice(savedIndex, 1);
      } else {
        userProgress.savedArticles.push(id);
      }
      
      await userProgress.save();
      
      res.json({
        success: true,
        message: savedIndex > -1 ? 'Article removed from saved' : 'Article saved',
        data: userProgress
      });
    } catch (error) {
      console.error('Toggle save error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to toggle save',
        error: error.message
      });
    }
  },

  // Get categories with article counts
  getCategories: async (req, res) => {
    try {
      const categories = await Article.aggregate([
        { $match: { published: true } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]);
      
      res.json({
        success: true,
        data: categories.map(c => ({ category: c._id, count: c.count }))
      });
    } catch (error) {
      console.error('Get categories error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch categories',
        error: error.message
      });
    }
  }
};

module.exports = financialEducationController;