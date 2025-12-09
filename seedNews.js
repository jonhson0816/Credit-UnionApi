require('dotenv').config();
const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✓ Connected to MongoDB'))
  .catch(err => {
    console.error('✗ MongoDB connection error:', err);
    process.exit(1);
  });

// Define the News Schema (inline)
const newsSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  subtitle: {
    type: String,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['Press Release', 'Company News', 'Community', 'Awards', 'Financial Tips', 'Product Updates']
  },
  author: {
    type: String,
    default: 'Navy Federal Credit Union'
  },
  featured: {
    type: Boolean,
    default: false
  },
  imageUrl: {
    type: String
  },
  tags: [{
    type: String
  }],
  views: {
    type: Number,
    default: 0
  },
  publishDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'published'
  }
}, {
  timestamps: true
});

// Auto-generate slug from title
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

const News = mongoose.model('News', newsSchema);

// Sample news articles
const sampleNewsArticles = [
  // Press Release Category
  {
    title: "Navy Federal Reaches 13 Million Members Milestone",
    subtitle: "Credit union celebrates unprecedented growth while maintaining member-first commitment",
    content: "Navy Federal Credit Union proudly announces reaching 13 million members, solidifying its position as the world's largest credit union. This milestone reflects our unwavering commitment to serving the military community and their families with exceptional financial services. Our growth is driven by member trust and our dedication to providing competitive rates, innovative digital banking solutions, and personalized service. We continue to invest in technology and expand our branch network to better serve our members wherever they are stationed around the world.",
    category: "Press Release",
    author: "Navy Federal Communications Team",
    featured: true,
    imageUrl: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800",
    tags: ["milestone", "growth", "members", "achievement"],
    publishDate: new Date("2024-10-15"),
    status: "published"
  },
  {
    title: "Navy Federal Launches Enhanced Mobile Banking App",
    subtitle: "New features include biometric security and instant account alerts",
    content: "Navy Federal Credit Union unveils a completely redesigned mobile banking application featuring cutting-edge security and user-friendly interface. The new app includes facial recognition, fingerprint authentication, real-time transaction notifications, and enhanced budgeting tools. Members can now deposit checks, transfer funds, pay bills, and manage their accounts with unprecedented ease. The update also introduces a new financial wellness dashboard that provides personalized insights and recommendations to help members achieve their financial goals.",
    category: "Press Release",
    author: "Navy Federal Technology Division",
    featured: false,
    imageUrl: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800",
    tags: ["mobile banking", "technology", "security", "innovation"],
    publishDate: new Date("2024-10-20"),
    status: "published"
  },
  {
    title: "Record-Breaking Member Savings in 2024",
    subtitle: "Navy Federal members saved over $2 billion in fees and interest",
    content: "Navy Federal Credit Union announces that members saved a record-breaking $2 billion in 2024 through competitive loan rates, reduced fees, and dividend returns. This achievement demonstrates our commitment to putting members first and returning profits to those who own the credit union. Members benefit from no monthly service fees on checking accounts, competitive auto loan rates averaging 2% below industry standards, and mortgage rates that have helped thousands of military families achieve homeownership. Our not-for-profit structure ensures that success is measured by member benefits, not corporate profits.",
    category: "Press Release",
    author: "Navy Federal Financial Services",
    featured: false,
    imageUrl: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800",
    tags: ["savings", "rates", "member benefits", "value"],
    publishDate: new Date("2024-10-25"),
    status: "published"
  },

  // Company News Category
  {
    title: "New Branch Openings Across Military Installations",
    subtitle: "Expanding our presence to serve military families where they need us most",
    content: "Navy Federal Credit Union announces the opening of 15 new branch locations at military installations nationwide. These new branches will provide full-service banking to service members and their families, offering everything from account opening to financial counseling. Each location is staffed with financial specialists who understand the unique challenges of military life, including frequent relocations, deployments, and irregular income schedules. The branches feature state-of-the-art technology, private consultation rooms, and extended hours to accommodate military schedules.",
    category: "Company News",
    author: "Navy Federal Branch Operations",
    featured: true,
    imageUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800",
    tags: ["branches", "expansion", "military", "service"],
    publishDate: new Date("2024-10-18"),
    status: "published"
  },
  {
    title: "Navy Federal Named Best Credit Union for Military Members",
    subtitle: "Third consecutive year receiving top industry recognition",
    content: "For the third consecutive year, Navy Federal Credit Union has been named the Best Credit Union for Military Members by Financial Services Review. The award recognizes our comprehensive suite of military-friendly products, including VA loans with no down payment, competitive SCRA benefits, and specialized deployment support services. Our commitment extends beyond traditional banking to include financial education programs, emergency assistance funds, and career transition support for veterans entering civilian life.",
    category: "Company News",
    author: "Navy Federal Public Relations",
    featured: false,
    imageUrl: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=800",
    tags: ["award", "recognition", "military", "excellence"],
    publishDate: new Date("2024-10-22"),
    status: "published"
  },
  {
    title: "Digital Banking Transformation Initiative Complete",
    subtitle: "Investment in technology ensures world-class digital experience",
    content: "Navy Federal Credit Union successfully completes a comprehensive three-year digital transformation initiative, investing over $500 million in technology infrastructure and digital services. The transformation includes enhanced cybersecurity measures, artificial intelligence-powered fraud detection, real-time payment processing, and seamless integration across all digital platforms. Members now enjoy faster transaction processing, improved mobile app functionality, and 24/7 access to virtual financial advisors through secure video conferencing.",
    category: "Company News",
    author: "Navy Federal Innovation Team",
    featured: false,
    imageUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800",
    tags: ["technology", "digital", "innovation", "transformation"],
    publishDate: new Date("2024-10-28"),
    status: "published"
  },

  // Community Category
  {
    title: "Military Spouse Employment Initiative Launches",
    subtitle: "Supporting career development for military spouses nationwide",
    content: "Navy Federal Credit Union launches a comprehensive employment initiative designed to support military spouses facing unique career challenges due to frequent relocations. The program includes job placement assistance, skills training, remote work opportunities, and partnerships with major employers committed to hiring military spouses. Additionally, we're offering small business loans with favorable terms for military spouse entrepreneurs. This initiative recognizes the sacrifice and resilience of military families and aims to provide tangible career support.",
    category: "Community",
    author: "Navy Federal Community Relations",
    featured: true,
    imageUrl: "https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800",
    tags: ["military spouses", "employment", "community", "support"],
    publishDate: new Date("2024-10-12"),
    status: "published"
  },
  {
    title: "$10 Million Donated to Veterans Organizations",
    subtitle: "Annual giving program supports military families in need",
    content: "Navy Federal Credit Union announces $10 million in charitable contributions to veterans organizations and military family support programs. Recipients include wounded warrior programs, scholarship funds for military children, emergency financial assistance programs, and mental health services for veterans. Our charitable giving reflects our mission to support the military community beyond financial services. We're proud to partner with organizations making real differences in the lives of those who have served our nation.",
    category: "Community",
    author: "Navy Federal Foundation",
    featured: false,
    imageUrl: "https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800",
    tags: ["charity", "veterans", "giving", "community support"],
    publishDate: new Date("2024-10-16"),
    status: "published"
  },
  {
    title: "Financial Literacy Program Reaches 50,000 Students",
    subtitle: "Free education initiative teaches money management to military families",
    content: "Navy Federal's financial literacy program celebrates reaching 50,000 students at military base schools nationwide. The program provides free curriculum, interactive workshops, and digital resources teaching essential money management skills. Topics include budgeting, saving, credit management, and investing basics. The program is specially designed to address financial challenges unique to military families, such as managing finances during deployments and planning for transitions between duty stations.",
    category: "Community",
    author: "Navy Federal Education Team",
    featured: false,
    imageUrl: "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=800",
    tags: ["education", "financial literacy", "youth", "community"],
    publishDate: new Date("2024-10-24"),
    status: "published"
  },

  // Awards Category
  {
    title: "Excellence in Digital Banking Award 2024",
    subtitle: "Industry recognition for innovative mobile and online banking solutions",
    content: "Navy Federal Credit Union receives the prestigious Excellence in Digital Banking Award from the National Banking Association. The award recognizes our innovative approach to digital services, including our AI-powered virtual assistant, seamless mobile check deposit, and integrated financial planning tools. Our digital banking platform serves millions of members worldwide, providing secure, convenient access to accounts 24/7. The judges particularly noted our commitment to accessibility and user experience design.",
    category: "Awards",
    author: "Navy Federal Communications",
    featured: false,
    imageUrl: "https://images.unsplash.com/photo-1567427017947-545c5f8d16ad?w=800",
    tags: ["award", "digital banking", "innovation", "recognition"],
    publishDate: new Date("2024-10-10"),
    status: "published"
  },
  {
    title: "Top Employer for Veterans - Fifth Consecutive Year",
    subtitle: "Commitment to hiring and supporting veteran employees recognized nationally",
    content: "Navy Federal Credit Union honored as a Top Employer for Veterans for the fifth consecutive year. Currently, over 40% of our workforce consists of veterans and military spouses, reflecting our deep commitment to the military community. We offer comprehensive transition programs for veterans entering civilian careers, including mentorship, skills training, and career development opportunities. Our veteran employees bring invaluable perspectives and leadership skills that strengthen our organization.",
    category: "Awards",
    author: "Navy Federal Human Resources",
    featured: false,
    imageUrl: "https://images.unsplash.com/photo-1573164713714-d95e436ab8d6?w=800",
    tags: ["veterans", "employment", "award", "workplace"],
    publishDate: new Date("2024-10-19"),
    status: "published"
  },
  {
    title: "Customer Service Excellence Award",
    subtitle: "Highest member satisfaction scores in credit union industry",
    content: "Navy Federal Credit Union receives the Customer Service Excellence Award, achieving the highest member satisfaction scores in the credit union industry. Our member service representatives undergo extensive training to understand military life and provide empathetic, knowledgeable support. We maintain a 96% member satisfaction rating and industry-leading response times. This award validates our commitment to treating every member interaction as an opportunity to demonstrate our core values of service and respect.",
    category: "Awards",
    author: "Navy Federal Member Services",
    featured: false,
    imageUrl: "https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800",
    tags: ["customer service", "award", "satisfaction", "excellence"],
    publishDate: new Date("2024-10-26"),
    status: "published"
  },

  // Financial Tips Category
  {
    title: "Smart Saving Strategies for Military Families",
    subtitle: "Expert tips to build emergency funds and achieve financial goals",
    content: "Military families face unique financial challenges, but with the right strategies, you can build substantial savings. Start by automating savings transfers on payday, even if it's just $50 per month. Take advantage of military-specific benefits like the Savings Deposit Program during deployments, which offers 10% annual interest. Create separate savings accounts for different goals: emergency fund, deployment fund, PCS moves, and long-term savings. Consider setting aside bonuses, tax refunds, and special pays directly into savings. Aim for 3-6 months of expenses in your emergency fund before tackling other financial goals.",
    category: "Financial Tips",
    author: "Navy Federal Financial Advisors",
    featured: true,
    imageUrl: "https://images.unsplash.com/photo-1579621970795-87facc2f976d?w=800",
    tags: ["savings", "budgeting", "financial planning", "tips"],
    publishDate: new Date("2024-10-14"),
    status: "published"
  },
  {
    title: "Understanding Your Credit Score During Military Service",
    subtitle: "How to maintain excellent credit while serving",
    content: "Your credit score impacts everything from loan rates to security clearances. Military members should regularly monitor their credit reports using AnnualCreditReport.com. Set up automatic payments to avoid missed payments during deployments or training. Utilize SCRA benefits to reduce interest rates on pre-service debts. Keep credit card balances below 30% of limits and maintain diverse credit types. If deploying, consider setting up a power of attorney for financial matters. Remember that length of credit history matters, so keep your oldest accounts open even if you don't use them regularly.",
    category: "Financial Tips",
    author: "Navy Federal Credit Counselors",
    featured: false,
    imageUrl: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800",
    tags: ["credit", "financial health", "military", "advice"],
    publishDate: new Date("2024-10-21"),
    status: "published"
  },
  {
    title: "Home Buying Guide for First-Time Military Buyers",
    subtitle: "Navigate the home buying process with confidence",
    content: "VA loans offer incredible benefits for military home buyers: no down payment, no PMI, and competitive rates. Start by obtaining your Certificate of Eligibility through the VA. Get pre-approved to understand your budget and strengthen your offers. Consider the BAH rates for your duty station and whether buying or renting makes more sense for your timeline. Factor in potential PCS moves – can you rent the property if you transfer? Work with a real estate agent experienced with military buyers. Don't waive inspection contingencies, and budget for closing costs, moving expenses, and initial home maintenance.",
    category: "Financial Tips",
    author: "Navy Federal Mortgage Specialists",
    featured: false,
    imageUrl: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800",
    tags: ["homebuying", "VA loans", "real estate", "military"],
    publishDate: new Date("2024-10-27"),
    status: "published"
  },

  // Product Updates Category
  {
    title: "New High-Yield Savings Account Launched",
    subtitle: "Earn competitive rates with no minimum balance requirements",
    content: "Navy Federal introduces a new High-Yield Savings Account offering industry-leading interest rates with no minimum balance requirements and no monthly fees. The account features tiered interest rates, with higher balances earning premium rates up to 4.5% APY. Members can open an account with just $5 and enjoy unlimited transfers between Navy Federal accounts. The savings account integrates seamlessly with our mobile app, providing real-time balance updates and savings goal tracking. This product is designed to help military families build emergency funds and achieve financial security.",
    category: "Product Updates",
    author: "Navy Federal Product Development",
    featured: false,
    imageUrl: "https://images.unsplash.com/photo-1579621970588-a35d0e7ab9b6?w=800",
    tags: ["savings", "new product", "interest rates", "accounts"],
    publishDate: new Date("2024-10-11"),
    status: "published"
  },
  {
    title: "Enhanced Auto Loan Program with Military Benefits",
    subtitle: "Special rates and flexible terms for all vehicle types",
    content: "Our enhanced auto loan program now offers rates as low as 1.99% APR for qualified members, with flexible terms up to 96 months. New features include GAP insurance options, deployment protection that allows payment deferrals during active duty deployments, and a simple online application process with same-day approvals. We've expanded coverage to include motorcycles, RVs, and boats. Military members can also take advantage of our car-buying service that negotiates prices with dealerships on your behalf, potentially saving thousands on vehicle purchases.",
    category: "Product Updates",
    author: "Navy Federal Lending Services",
    featured: false,
    imageUrl: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800",
    tags: ["auto loans", "products", "rates", "vehicles"],
    publishDate: new Date("2024-10-23"),
    status: "published"
  },
  {
    title: "Credit Card Rewards Program Expanded",
    subtitle: "More ways to earn and redeem points on everyday purchases",
    content: "Navy Federal's credit card rewards program receives major upgrades with expanded earning categories and enhanced redemption options. Members now earn 3x points on gas and groceries, 2x points on military exchange and commissary purchases, and 1x points on all other purchases. New redemption options include statement credits, travel bookings through our portal, gift cards, and direct transfers to popular airline and hotel partners. All Navy Federal credit cards feature no annual fees, no foreign transaction fees, and comprehensive travel protections including rental car insurance and trip cancellation coverage.",
    category: "Product Updates",
    author: "Navy Federal Card Services",
    featured: false,
    imageUrl: "https://images.unsplash.com/photo-1556742111-a301076d9d18?w=800",
    tags: ["credit cards", "rewards", "benefits", "products"],
    publishDate: new Date("2024-10-29"),
    status: "published"
  }
];

// Seed function
async function seedNewsData() {
  try {
    // Check if news already exists
    const existingNews = await News.countDocuments();
    
    console.log(`📊 Current news articles in database: ${existingNews}`);
    
    if (existingNews > 0) {
      console.log('🗑️  Deleting existing news articles...');
      await News.deleteMany({});
      console.log('✓ Deleted all existing articles');
    }

    // Drop all indexes and recreate them (fixes the slug issue)
    console.log('🔧 Dropping old indexes...');
    await News.collection.dropIndexes();
    console.log('✓ Old indexes dropped');
    
    console.log('🔧 Creating fresh indexes...');
    await News.collection.createIndex({ slug: 1 }, { unique: true, sparse: true });
    console.log('✓ Fresh indexes created');

    // Insert sample news articles
    await News.insertMany(sampleNewsArticles);
    console.log('✓ Successfully seeded news database with sample articles!');
    console.log(`✓ Added ${sampleNewsArticles.length} news articles`);
    
    // Log category breakdown
    const categories = {};
    sampleNewsArticles.forEach(article => {
      categories[article.category] = (categories[article.category] || 0) + 1;
    });
    
    console.log('\n📊 Articles by category:');
    Object.entries(categories).forEach(([category, count]) => {
      console.log(`  - ${category}: ${count} articles`);
    });

    // Verify in database
    const finalCount = await News.countDocuments();
    console.log(`\n✅ Database verification: ${finalCount} articles total\n`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('✗ Error seeding news data:', error);
    process.exit(1);
  }
}

// Run the seed
seedNewsData();