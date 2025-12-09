require('dotenv').config();
const mongoose = require('mongoose');
const { Career } = require('./models/Career');

// Sample jobs data
const sampleJobs = [
  {
    jobTitle: "Senior Full Stack Developer",
    department: "Technology",
    location: "Vienna, VA",
    employmentType: "Full-Time",
    experienceLevel: "Senior Level",
    salary: {
      min: 120000,
      max: 160000
    },
    description: "Join our technology team to build innovative banking solutions that serve our military members and their families. You'll work with cutting-edge technologies and make a real impact.",
    responsibilities: [
      "Design and develop scalable web applications using React and Node.js",
      "Collaborate with cross-functional teams to define and implement new features",
      "Write clean, maintainable code and conduct code reviews",
      "Optimize applications for maximum speed and scalability",
      "Mentor junior developers and contribute to technical documentation"
    ],
    qualifications: [
      "5+ years of experience in full-stack development",
      "Strong proficiency in JavaScript, React, Node.js, and MongoDB",
      "Experience with RESTful APIs and microservices architecture",
      "Bachelor's degree in Computer Science or related field",
      "Excellent problem-solving and communication skills"
    ],
    benefits: [
      "Comprehensive health insurance (medical, dental, vision)",
      "401(k) with company match up to 8%",
      "Generous PTO and paid holidays",
      "Professional development opportunities",
      "Remote work flexibility"
    ],
    postedDate: new Date(),
    applicationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    isActive: true
  },
  {
    jobTitle: "Customer Service Representative",
    department: "Customer Service",
    location: "Pensacola, FL",
    employmentType: "Full-Time",
    experienceLevel: "Entry Level",
    salary: {
      min: 42000,
      max: 55000
    },
    description: "Be the friendly voice that helps our members with their banking needs. This role is perfect for someone who loves helping people and wants to start a career in financial services.",
    responsibilities: [
      "Assist members with account inquiries and transactions via phone and chat",
      "Resolve member concerns with professionalism and empathy",
      "Process routine transactions and account updates",
      "Educate members about products and services",
      "Maintain detailed records of member interactions"
    ],
    qualifications: [
      "High school diploma or equivalent required",
      "Strong communication and interpersonal skills",
      "Basic computer proficiency",
      "Ability to multitask in a fast-paced environment",
      "Customer service experience preferred but not required"
    ],
    benefits: [
      "Comprehensive health benefits",
      "Paid training program",
      "Career advancement opportunities",
      "Employee credit union membership",
      "Tuition reimbursement"
    ],
    postedDate: new Date(),
    applicationDeadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
    isActive: true
  },
  {
    jobTitle: "Cybersecurity Analyst",
    department: "Cybersecurity",
    location: "Remote",
    employmentType: "Full-Time",
    experienceLevel: "Mid Level",
    salary: {
      min: 95000,
      max: 125000
    },
    description: "Protect our members' data and our institution's assets by monitoring, detecting, and responding to security threats. Join our dedicated security team making banking safer.",
    responsibilities: [
      "Monitor security systems and investigate potential security incidents",
      "Conduct vulnerability assessments and penetration testing",
      "Develop and implement security policies and procedures",
      "Respond to and remediate security breaches",
      "Collaborate with IT teams to ensure security best practices"
    ],
    qualifications: [
      "3+ years of experience in cybersecurity or information security",
      "Knowledge of security frameworks (NIST, ISO 27001)",
      "Experience with SIEM tools and threat intelligence",
      "Security certifications (CISSP, CEH, or Security+) preferred",
      "Bachelor's degree in Computer Science or related field"
    ],
    benefits: [
      "100% remote work option",
      "Comprehensive benefits package",
      "Certification reimbursement",
      "Professional development budget",
      "Work-life balance focus"
    ],
    postedDate: new Date(),
    applicationDeadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    isActive: true
  },
  {
    jobTitle: "Data Analyst",
    department: "Data Analytics",
    location: "Winchester, VA",
    employmentType: "Full-Time",
    experienceLevel: "Mid Level",
    salary: {
      min: 75000,
      max: 95000
    },
    description: "Turn data into actionable insights that drive business decisions. Work with large datasets to help us better serve our members and improve our operations.",
    responsibilities: [
      "Analyze complex datasets to identify trends and patterns",
      "Create dashboards and reports using Tableau or Power BI",
      "Collaborate with stakeholders to understand business requirements",
      "Develop predictive models to support strategic decisions",
      "Present findings to leadership in clear, actionable formats"
    ],
    qualifications: [
      "2-4 years of experience in data analysis",
      "Proficiency in SQL, Python, and data visualization tools",
      "Strong statistical analysis skills",
      "Bachelor's degree in Statistics, Mathematics, or related field",
      "Experience in financial services is a plus"
    ],
    benefits: [
      "Hybrid work schedule",
      "Health and wellness programs",
      "401(k) matching",
      "Continuing education support",
      "Collaborative team environment"
    ],
    postedDate: new Date(),
    applicationDeadline: new Date(Date.now() + 40 * 24 * 60 * 60 * 1000),
    isActive: true
  },
  {
    jobTitle: "Marketing Manager",
    department: "Marketing",
    location: "Vienna, VA",
    employmentType: "Full-Time",
    experienceLevel: "Senior Level",
    salary: {
      min: 95000,
      max: 120000
    },
    description: "Lead marketing campaigns that connect with our military community. Develop strategies that showcase our commitment to serving those who serve.",
    responsibilities: [
      "Develop and execute comprehensive marketing strategies",
      "Manage digital marketing campaigns across multiple channels",
      "Analyze campaign performance and optimize for ROI",
      "Lead a team of marketing specialists",
      "Collaborate with product teams on go-to-market strategies"
    ],
    qualifications: [
      "5+ years of marketing experience, preferably in financial services",
      "Proven track record of successful campaign management",
      "Strong understanding of digital marketing and analytics",
      "Excellent leadership and project management skills",
      "Bachelor's degree in Marketing or related field"
    ],
    benefits: [
      "Competitive salary with performance bonuses",
      "Comprehensive benefits package",
      "Professional development opportunities",
      "Creative and collaborative work environment",
      "Flexible work arrangements"
    ],
    postedDate: new Date(),
    applicationDeadline: new Date(Date.now() + 50 * 24 * 60 * 60 * 1000),
    isActive: true
  },
  {
    jobTitle: "Risk Management Specialist",
    department: "Risk Management",
    location: "Vienna, VA",
    employmentType: "Full-Time",
    experienceLevel: "Mid Level",
    salary: {
      min: 80000,
      max: 105000
    },
    description: "Help protect our credit union by identifying, assessing, and mitigating risks. Play a crucial role in maintaining our financial stability and regulatory compliance.",
    responsibilities: [
      "Conduct risk assessments across business units",
      "Develop and implement risk management frameworks",
      "Monitor compliance with policies and regulations",
      "Prepare risk reports for senior management",
      "Recommend strategies to minimize risk exposure"
    ],
    qualifications: [
      "3-5 years of experience in risk management or compliance",
      "Knowledge of banking regulations and risk frameworks",
      "Strong analytical and problem-solving skills",
      "Professional certification (FRM, PRM) is a plus",
      "Bachelor's degree in Finance, Business, or related field"
    ],
    benefits: [
      "Comprehensive health coverage",
      "Retirement savings plan with match",
      "Professional certification support",
      "Work-life balance",
      "Career growth opportunities"
    ],
    postedDate: new Date(),
    applicationDeadline: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000),
    isActive: true
  },
  {
    jobTitle: "HR Business Partner",
    department: "Human Resources",
    location: "Pensacola, FL",
    employmentType: "Full-Time",
    experienceLevel: "Senior Level",
    salary: {
      min: 85000,
      max: 110000
    },
    description: "Partner with business leaders to develop HR strategies that support organizational goals. Help build a workplace culture where employees thrive.",
    responsibilities: [
      "Serve as strategic advisor to business unit leaders",
      "Manage employee relations and conflict resolution",
      "Lead talent acquisition and retention initiatives",
      "Develop and implement HR policies and programs",
      "Drive organizational change and development initiatives"
    ],
    qualifications: [
      "5+ years of HR business partner experience",
      "Strong knowledge of employment law and HR best practices",
      "Excellent interpersonal and communication skills",
      "PHR or SPHR certification preferred",
      "Bachelor's degree in HR, Business, or related field"
    ],
    benefits: [
      "Competitive compensation package",
      "Comprehensive benefits",
      "Professional development support",
      "Collaborative work environment",
      "Meaningful mission-driven work"
    ],
    postedDate: new Date(),
    applicationDeadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
    isActive: true
  },
  {
    jobTitle: "Software Engineering Intern",
    department: "Technology",
    location: "Vienna, VA",
    employmentType: "Internship",
    experienceLevel: "Entry Level",
    salary: {
      min: 25,
      max: 35
    },
    description: "Gain real-world experience in software development while contributing to projects that impact millions of members. Perfect for students pursuing computer science degrees.",
    responsibilities: [
      "Assist in developing and testing software applications",
      "Collaborate with experienced developers on team projects",
      "Participate in code reviews and learning sessions",
      "Document code and technical processes",
      "Contribute to agile development sprints"
    ],
    qualifications: [
      "Currently pursuing a degree in Computer Science or related field",
      "Basic knowledge of programming languages (Java, Python, or JavaScript)",
      "Strong problem-solving skills",
      "Ability to work in a team environment",
      "Eagerness to learn and grow"
    ],
    benefits: [
      "Competitive hourly pay",
      "Mentorship from experienced developers",
      "Networking opportunities",
      "Hands-on learning experience",
      "Potential for full-time employment"
    ],
    postedDate: new Date(),
    applicationDeadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
    isActive: true
  },
  {
    jobTitle: "Branch Manager",
    department: "Banking Operations",
    location: "San Diego, CA",
    employmentType: "Full-Time",
    experienceLevel: "Senior Level",
    salary: {
      min: 75000,
      max: 95000
    },
    description: "Lead a branch team dedicated to providing exceptional service to our military members. Drive business growth while maintaining our high service standards.",
    responsibilities: [
      "Oversee daily branch operations and staff management",
      "Achieve sales and service goals",
      "Build relationships with members and the local community",
      "Ensure compliance with policies and regulations",
      "Coach and develop branch team members"
    ],
    qualifications: [
      "5+ years of banking experience with 2+ years in management",
      "Proven track record of meeting sales targets",
      "Strong leadership and team-building skills",
      "Knowledge of banking products and services",
      "Bachelor's degree preferred"
    ],
    benefits: [
      "Performance-based bonuses",
      "Comprehensive benefits package",
      "Leadership development programs",
      "Career advancement opportunities",
      "Supportive company culture"
    ],
    postedDate: new Date(),
    applicationDeadline: new Date(Date.now() + 40 * 24 * 60 * 60 * 1000),
    isActive: true
  },
  {
    jobTitle: "UI/UX Designer",
    department: "Technology",
    location: "Remote",
    employmentType: "Full-Time",
    experienceLevel: "Mid Level",
    salary: {
      min: 85000,
      max: 110000
    },
    description: "Design intuitive, accessible digital experiences for our members. Help make banking simple and delightful through thoughtful design.",
    responsibilities: [
      "Design user interfaces for web and mobile applications",
      "Conduct user research and usability testing",
      "Create wireframes, prototypes, and high-fidelity designs",
      "Collaborate with developers to implement designs",
      "Maintain and evolve the design system"
    ],
    qualifications: [
      "3-5 years of UI/UX design experience",
      "Proficiency in Figma, Sketch, or Adobe XD",
      "Strong portfolio demonstrating user-centered design",
      "Understanding of accessibility standards (WCAG)",
      "Bachelor's degree in Design or related field"
    ],
    benefits: [
      "Remote work flexibility",
      "Creative and supportive team",
      "Professional development budget",
      "Latest design tools and resources",
      "Health and wellness benefits"
    ],
    postedDate: new Date(),
    applicationDeadline: new Date(Date.now() + 55 * 24 * 60 * 60 * 1000),
    isActive: true
  }
];

// Connect to MongoDB and seed data
async function seedDatabase() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    
    await mongoose.connect(process.env.MONGODB_URI);
    
    console.log('✅ Connected to MongoDB successfully');
    
    console.log('🔄 Clearing existing jobs...');
    const deleteResult = await Career.deleteMany({});
    console.log(`🗑️  Deleted ${deleteResult.deletedCount} existing job(s)`);
    
    console.log('🔄 Adding sample jobs...');
    const result = await Career.insertMany(sampleJobs);
    console.log(`✅ Successfully added ${result.length} sample jobs!`);
    
    console.log('\n📊 Jobs added by department:');
    const departments = {};
    result.forEach(job => {
      departments[job.department] = (departments[job.department] || 0) + 1;
    });
    Object.entries(departments).forEach(([dept, count]) => {
      console.log(`   • ${dept}: ${count} job(s)`);
    });
    
    console.log('\n🎉 Database seeding complete!');
    console.log('👉 Now refresh your browser to see the jobs\n');
    
  } catch (error) {
    console.error('❌ Error seeding database:', error.message);
    console.error('Full error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
}

seedDatabase();