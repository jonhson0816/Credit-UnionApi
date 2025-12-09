require('dotenv').config();
const mongoose = require('mongoose');
const { HelpArticle } = require('../models/HelpCenter');

const seedArticles = [
  // Account Management
  {
    title: 'How to Open a New Account',
    slug: 'how-to-open-new-account',
    category: 'account-management',
    categoryTitle: 'Account Management',
    excerpt: 'Learn the step-by-step process to open a new Navy Federal account online or in person.',
    content: `Opening a new account with Navy Federal is simple and straightforward.\n\n**Eligibility Requirements:**\n- Active duty, retired, or veteran of any branch of armed forces\n- Department of Defense civilian personnel\n- Family members of eligible members\n\n**Steps to Open an Account:**\n1. Verify your eligibility\n2. Gather required documents (ID, Social Security number)\n3. Choose your account type (checking, savings, money market)\n4. Complete the online application or visit a branch\n5. Make your initial deposit (as low as $5)\n\n**Required Documents:**\n- Government-issued photo ID\n- Social Security number\n- Proof of military affiliation\n- Initial deposit\n\n**Account Types Available:**\n- Free EveryDay Checking\n- Free Active Duty Checking\n- Savings Account\n- Money Market Savings Account\n\nYour account will typically be opened within 24 hours of application approval.`,
    tags: ['account opening', 'new member', 'eligibility', 'checking account', 'savings account'],
    readTime: 5,
    featured: true,
    views: 12540,
    helpful: 1840,
    notHelpful: 45
  },
  {
    title: 'Update Your Personal Information',
    slug: 'update-personal-information',
    category: 'account-management',
    categoryTitle: 'Account Management',
    excerpt: 'Keep your account secure and up-to-date by updating your contact information and preferences.',
    content: `Keeping your personal information current ensures you receive important account notifications.\n\n**What You Can Update:**\n- Mailing address\n- Email address\n- Phone numbers\n- Employment information\n- Beneficiaries\n\n**How to Update Online:**\n1. Log in to your account\n2. Navigate to Settings > Profile\n3. Select the information you want to update\n4. Enter new information\n5. Click Save Changes\n\n**How to Update by Phone:**\nCall Member Services at 1-888-842-6328 (available 24/7)\n\n**Important Notes:**\n- Address changes may require documentation\n- Legal name changes require supporting documents\n- Some changes may require identity verification\n\n**Security Tip:**\nAlways verify you're on our official website before entering personal information.`,
    tags: ['profile update', 'address change', 'contact information', 'personal info'],
    readTime: 4,
    views: 8920,
    helpful: 1234,
    notHelpful: 28
  },
  
  // Online & Mobile Banking
  {
    title: 'Reset Your Online Banking Password',
    slug: 'reset-online-banking-password',
    category: 'digital-banking',
    categoryTitle: 'Online & Mobile Banking',
    excerpt: 'Forgot your password? Follow these steps to securely reset your online banking credentials.',
    content: `Resetting your password is quick and secure.\n\n**Online Password Reset:**\n1. Go to navyfederal.org\n2. Click "Forgot Password?"\n3. Enter your Access Number or username\n4. Verify your identity with security questions\n5. Create a new password\n\n**Password Requirements:**\n- 8-20 characters\n- At least one uppercase letter\n- At least one lowercase letter\n- At least one number\n- At least one special character (!@#$%)\n\n**Password Reset by Phone:**\nCall 1-888-842-6328 for assistance\n\n**Security Best Practices:**\n- Don't reuse old passwords\n- Use a unique password for Navy Federal\n- Enable two-factor authentication\n- Never share your password\n\n**Locked Account?**\nAfter 3 failed login attempts, your account will be locked for security. Call Member Services to unlock.`,
    tags: ['password reset', 'login issues', 'security', 'access'],
    readTime: 3,
    featured: true,
    views: 45200,
    helpful: 6780,
    notHelpful: 120
  },
  {
    title: 'Mobile Check Deposit Guide',
    slug: 'mobile-check-deposit-guide',
    category: 'digital-banking',
    categoryTitle: 'Online & Mobile Banking',
    excerpt: 'Deposit checks anytime, anywhere using your mobile device with our easy mobile deposit feature.',
    content: `Deposit checks instantly using your smartphone.\n\n**Before You Start:**\n- Download the Navy Federal mobile app\n- Ensure you have a compatible device\n- Have your check ready\n\n**Step-by-Step Instructions:**\n1. Open the Navy Federal app\n2. Log in to your account\n3. Tap "Deposit" on the home screen\n4. Select the account for deposit\n5. Enter the check amount\n6. Take a photo of the front of the check\n7. Take a photo of the back of the check\n8. Review and submit\n\n**Check Requirements:**\n- Endorse the back: "For mobile deposit only at Navy Federal Credit Union"\n- Check must be made payable to you\n- Check must be in US dollars\n- Check cannot be post-dated\n\n**Deposit Limits:**\n- Daily limit: $50,000\n- Monthly limit: $250,000\n\n**Availability:**\nFunds typically available within 1-2 business days\n\n**After Deposit:**\nWrite "Deposited [date]" on the check and keep it for 14 days.`,
    tags: ['mobile deposit', 'check deposit', 'mobile app', 'remote deposit'],
    readTime: 4,
    featured: true,
    views: 38700,
    helpful: 5420,
    notHelpful: 98
  },
  
  // Cards & Payments
  {
    title: 'Report a Lost or Stolen Card',
    slug: 'report-lost-stolen-card',
    category: 'cards-payments',
    categoryTitle: 'Cards & Payments',
    excerpt: 'Act quickly to protect your account by reporting a lost or stolen debit or credit card immediately.',
    content: `Report lost or stolen cards immediately to prevent unauthorized use.\n\n**Immediate Actions:**\n1. Call 1-888-842-6328 (24/7 service)\n2. Report the card as lost or stolen\n3. Review recent transactions\n4. Request a replacement card\n\n**Using the Mobile App:**\n1. Log in to the Navy Federal app\n2. Go to Cards\n3. Select the affected card\n4. Tap "Report Lost or Stolen"\n5. Confirm the report\n\n**Temporary Solution:**\nFreeze your card instantly in the app while you search for it\n\n**Replacement Card:**\n- Standard delivery: 7-10 business days (free)\n- Expedited delivery: 2-3 business days ($15 fee)\n- Emergency cash available at branches\n\n**Fraud Protection:**\n- Zero liability for unauthorized transactions\n- 24/7 fraud monitoring\n- Real-time transaction alerts\n\n**After Reporting:**\n- Update automatic payments\n- Monitor your account for suspicious activity\n- Update digital wallet credentials`,
    tags: ['lost card', 'stolen card', 'card security', 'fraud', 'replacement card'],
    readTime: 3,
    featured: true,
    views: 28900,
    helpful: 4120,
    notHelpful: 67
  },
  {
    title: 'How to Activate Your New Card',
    slug: 'activate-new-card',
    category: 'cards-payments',
    categoryTitle: 'Cards & Payments',
    excerpt: 'Activate your new Navy Federal debit or credit card quickly and securely.',
    content: `Activate your card before first use.\n\n**Activation Methods:**\n\n**Method 1: Mobile App (Recommended)**\n1. Open the Navy Federal app\n2. Go to Cards section\n3. Select your new card\n4. Tap "Activate Card"\n5. Confirm activation\n\n**Method 2: Online**\n1. Log in at navyfederal.org\n2. Go to Account Services\n3. Select "Activate Card"\n4. Enter card details\n5. Submit\n\n**Method 3: Phone**\nCall the number on the sticker attached to your card\n\n**What You'll Need:**\n- Your new card\n- Last 4 digits of Social Security number\n- Card expiration date\n- CVV code\n\n**After Activation:**\n- Destroy your old card by cutting through the chip and magnetic stripe\n- Set up your PIN at any ATM\n- Add card to digital wallets (Apple Pay, Google Pay)\n- Update automatic payments\n\n**Activation Issues?**\nContact Member Services at 1-888-842-6328`,
    tags: ['card activation', 'new card', 'debit card', 'credit card'],
    readTime: 3,
    views: 19850,
    helpful: 2940,
    notHelpful: 41
  },
  
  // Loans & Credit
  {
    title: 'Auto Loan Application Process',
    slug: 'auto-loan-application',
    category: 'loans-credit',
    categoryTitle: 'Loans & Credit',
    excerpt: 'Get pre-approved for an auto loan and learn about our competitive rates and flexible terms.',
    content: `Finance your vehicle with competitive rates and flexible terms.\n\n**Before You Apply:**\n- Check your credit score\n- Determine your budget\n- Know the vehicle you're interested in\n- Gather required documents\n\n**Required Documents:**\n- Government-issued ID\n- Proof of income (pay stubs, tax returns)\n- Proof of residence\n- Vehicle information (VIN, mileage, purchase price)\n- Trade-in details (if applicable)\n\n**Application Process:**\n1. Get pre-approved online or in-branch\n2. Shop for your vehicle\n3. Finalize loan details\n4. Sign documents\n5. Receive funds\n\n**Loan Features:**\n- Rates as low as 4.99% APR\n- Terms up to 96 months\n- No prepayment penalties\n- Refinancing available\n- New and used vehicles eligible\n\n**Loan Amounts:**\n- New vehicles: Up to 110% of MSRP\n- Used vehicles: Up to 125% of NADA value\n\n**Pre-Approval Benefits:**\n- Know your budget\n- Negotiate with confidence\n- Shop like a cash buyer\n- Valid for 60 days`,
    tags: ['auto loan', 'car loan', 'vehicle financing', 'pre-approval'],
    readTime: 6,
    views: 22800,
    helpful: 3210,
    notHelpful: 54
  },
  {
    title: 'Understanding Your Credit Score',
    slug: 'understanding-credit-score',
    category: 'loans-credit',
    categoryTitle: 'Loans & Credit',
    excerpt: 'Learn what affects your credit score and how to improve it for better loan rates.',
    content: `Your credit score impacts your ability to get loans and favorable rates.\n\n**What is a Credit Score?**\nA three-digit number (300-850) representing your creditworthiness\n\n**Score Ranges:**\n- 800-850: Exceptional\n- 740-799: Very Good\n- 670-739: Good\n- 580-669: Fair\n- 300-579: Poor\n\n**Factors Affecting Your Score:**\n1. Payment History (35%)\n   - On-time payments boost score\n   - Late payments hurt score\n\n2. Credit Utilization (30%)\n   - Keep balances below 30% of limits\n   - Lower is better\n\n3. Length of Credit History (15%)\n   - Older accounts help\n   - Keep accounts open\n\n4. Credit Mix (10%)\n   - Variety of credit types\n   - Cards, loans, mortgages\n\n5. New Credit (10%)\n   - Recent inquiries\n   - New accounts\n\n**How to Improve Your Score:**\n- Pay bills on time, every time\n- Reduce credit card balances\n- Don't close old accounts\n- Limit new credit applications\n- Check your credit report regularly\n- Dispute errors promptly\n\n**Free Credit Score:**\nMembers can check their score free through Navy Federal online banking`,
    tags: ['credit score', 'credit report', 'FICO', 'credit improvement'],
    readTime: 7,
    featured: true,
    views: 32100,
    helpful: 4890,
    notHelpful: 78
  },
  
  // Security & Fraud
  {
    title: 'Enable Two-Factor Authentication',
    slug: 'enable-two-factor-authentication',
    category: 'security-fraud',
    categoryTitle: 'Security & Fraud',
    excerpt: 'Add an extra layer of security to your account with two-factor authentication.',
    content: `Two-factor authentication (2FA) provides additional security for your account.\n\n**What is 2FA?**\nA second verification step beyond your password, typically a code sent to your phone\n\n**Benefits:**\n- Prevents unauthorized access\n- Protects against stolen passwords\n- Required for high-risk transactions\n- Peace of mind\n\n**How to Enable 2FA:**\n1. Log in to your account\n2. Go to Settings > Security\n3. Select "Two-Factor Authentication"\n4. Choose your preferred method:\n   - Text message (SMS)\n   - Voice call\n   - Authenticator app\n5. Verify your phone number\n6. Complete setup\n\n**Using Authenticator Apps:**\nSupported apps:\n- Google Authenticator\n- Microsoft Authenticator\n- Authy\n\n**Setup with Authenticator:**\n1. Download authenticator app\n2. Scan QR code in Navy Federal settings\n3. Enter verification code\n4. Save backup codes\n\n**Backup Codes:**\n- Save codes in a secure location\n- Use if you lose your phone\n- Each code works once\n\n**When 2FA is Required:**\n- First login from new device\n- Large transfers\n- Changes to security settings\n- Adding external accounts`,
    tags: ['2fa', 'security', 'authentication', 'account protection'],
    readTime: 5,
    views: 15670,
    helpful: 2340,
    notHelpful: 34
  },
  {
    title: 'Recognize and Avoid Phishing Scams',
    slug: 'recognize-avoid-phishing',
    category: 'security-fraud',
    categoryTitle: 'Security & Fraud',
    excerpt: 'Learn how to identify phishing attempts and protect your account from fraud.',
    content: `Phishing scams trick you into revealing personal information. Stay vigilant.\n\n**What is Phishing?**\nFraudulent attempts to obtain sensitive information by disguising as a trustworthy entity\n\n**Common Phishing Methods:**\n1. Email Phishing\n   - Fake emails appearing to be from Navy Federal\n   - Urgent messages about account problems\n   - Links to fake websites\n\n2. SMS Phishing (Smishing)\n   - Text messages with malicious links\n   - Fake fraud alerts\n   - Prize notifications\n\n3. Voice Phishing (Vishing)\n   - Phone calls pretending to be Navy Federal\n   - Requests for account information\n   - Threats of account closure\n\n**Red Flags:**\n- Urgent or threatening language\n- Requests for passwords or PINs\n- Suspicious sender addresses\n- Poor grammar or spelling\n- Generic greetings ("Dear Customer")\n- Unexpected attachments\n- Too-good-to-be-true offers\n\n**What Navy Federal Will NEVER Do:**\n- Ask for your password or PIN\n- Request your full SSN via email\n- Send unsolicited links\n- Threaten immediate account closure\n\n**If You Receive a Suspicious Message:**\n1. Don't click any links\n2. Don't provide information\n3. Don't download attachments\n4. Forward to abuse@navyfederal.org\n5. Delete the message\n6. Contact Navy Federal directly\n\n**Reporting Fraud:**\nCall 1-888-842-6328 immediately if you suspect fraud`,
    tags: ['phishing', 'scam', 'fraud prevention', 'email security'],
    readTime: 6,
    views: 18450,
    helpful: 2870,
    notHelpful: 42
  },
  
  // Transfers & Bill Pay
  {
    title: 'Set Up Zelle for Quick Transfers',
    slug: 'setup-zelle-transfers',
    category: 'transfers-billpay',
    categoryTitle: 'Transfers & Bill Pay',
    excerpt: 'Send money quickly and securely to friends and family with Zelle.',
    content: `Zelle lets you send money in minutes to almost anyone with a bank account in the U.S.\n\n**What You Need:**\n- Navy Federal checking or savings account\n- U.S. mobile number or email address\n- Recipient's mobile number or email\n\n**First-Time Setup:**\n1. Log in to online banking or mobile app\n2. Select "Send Money with Zelle"\n3. Accept terms and conditions\n4. Enroll your email or mobile number\n5. Verify enrollment via text or email\n\n**Sending Money:**\n1. Select "Send Money with Zelle"\n2. Choose recipient (or add new)\n3. Enter amount\n4. Add a note (optional)\n5. Review and confirm\n6. Money typically arrives in minutes\n\n**Receiving Money:**\n1. Recipient receives notification\n2. They follow instructions to accept\n3. Money deposits automatically if enrolled\n4. Otherwise, they enroll to receive\n\n**Transfer Limits:**\n- Daily limit: $2,000\n- Monthly limit: $10,000\n- Contact us to request higher limits\n\n**Important Notes:**\n- Transfers are typically instant\n- Can't cancel once recipient is enrolled\n- Both parties must have U.S. bank accounts\n- No fees from Navy Federal\n\n**Safety Tips:**\n- Only send money to people you know\n- Double-check recipient information\n- Zelle is not for commercial transactions`,
    tags: ['zelle', 'money transfer', 'send money', 'p2p payment'],
    readTime: 4,
    featured: true,
    views: 25400,
    helpful: 3680,
    notHelpful: 56
  },
  {
    title: 'How to Set Up Bill Pay',
    slug: 'setup-bill-pay',
    category: 'transfers-billpay',
    categoryTitle: 'Transfers & Bill Pay',
    excerpt: 'Pay your bills on time, every time with Navy Federal Bill Pay service.',
    content: `Bill Pay helps you manage all your bills in one convenient place.\n\n**Getting Started:**\n1. Log in to online banking\n2. Navigate to "Bill Pay"\n3. Accept terms and conditions\n4. Add your first payee\n\n**Adding a Payee:**\n1. Click "Add Payee"\n2. Search for company or enter manually\n3. Provide account number\n4. Enter payee address\n5. Save payee\n\n**Making a Payment:**\n1. Select payee from list\n2. Choose payment account\n3. Enter amount\n4. Select payment date\n5. Add memo (optional)\n6. Review and submit\n\n**Payment Options:**\n- One-time payment\n- Recurring payment\n- eBill (electronic bill)\n\n**Setting Up Recurring Payments:**\n1. Select payee\n2. Choose "Set up recurring payment"\n3. Select frequency (weekly, monthly, etc.)\n4. Enter amount or choose "full balance"\n5. Set start and end dates\n6. Save\n\n**Payment Delivery:**\n- Electronic: 1-2 business days\n- Check by mail: 5-7 business days\n- Always schedule in advance\n\n**eBills:**\n- View bills electronically\n- Automatic payment reminders\n- Paperless and convenient\n\n**Payment History:**\nView all past payments and download statements\n\n**No Fees:**\nNavy Federal Bill Pay is free for all members`,
    tags: ['bill pay', 'online bills', 'recurring payments', 'ebill'],
    readTime: 5,
    views: 16780,
    helpful: 2450,
    notHelpful: 38
  },
  
  // Membership
  {
    title: 'Who Can Join Navy Federal',
    slug: 'membership-eligibility',
    category: 'membership',
    categoryTitle: 'Membership & Eligibility',
    excerpt: 'Find out if you\'re eligible to join Navy Federal Credit Union.',
    content: `Navy Federal serves the armed forces community and their families.\n\n**Eligible Members:**\n\n**Active Duty:**\n- Army, Marine Corps, Navy, Air Force, Space Force, Coast Guard\n- National Guard members\n- Reserve members\n\n**Veterans and Retirees:**\n- Honorably discharged veterans\n- Retired military members\n- Annuitants\n\n**Department of Defense:**\n- DoD civilian employees\n- DoD contractors assigned to U.S. government installations\n\n**Family Members:**\n- Spouses, widows, and widowers\n- Parents, grandparents\n- Children, grandchildren (including adopted and stepchildren)\n- Siblings\n\n**How to Verify Eligibility:**\n1. Prepare your documents:\n   - Military ID or DD214\n   - Employment verification (DoD civilians)\n   - Relationship proof (family members)\n2. Apply online or visit a branch\n3. Verification usually takes 24-48 hours\n\n**Joining Process:**\n1. Complete membership application\n2. Open a savings account ($5 minimum)\n3. Become a member-owner\n4. Access all products and services\n\n**Once You're a Member:**\n- Membership for life\n- Keep your account even after service\n- Family members remain eligible\n\n**Questions?**\nCall 1-888-842-6328 to verify your eligibility`,
    tags: ['membership', 'eligibility', 'join', 'military', 'family'],
    readTime: 4,
    views: 31200,
    helpful: 4560,
    notHelpful: 89
  }
];

// Connect to MongoDB and seed data
const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      family: 4
    });

    console.log('✓ Connected to MongoDB');

    // Clear existing articles (optional - comment out if you want to keep existing)
    // await HelpArticle.deleteMany({});
    // console.log('✓ Cleared existing help articles');

    // Insert seed articles
    const insertedArticles = await HelpArticle.insertMany(seedArticles);
    console.log(`✓ Inserted ${insertedArticles.length} help articles`);

    // Display summary
    console.log('\n=== Seed Summary ===');
    const categories = [...new Set(insertedArticles.map(a => a.category))];
    for (const category of categories) {
      const count = insertedArticles.filter(a => a.category === category).length;
      console.log(`${category}: ${count} articles`);
    }

    console.log('\n✓ Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('✗ Seeding error:', error);
    process.exit(1);
  }
};

// Run seeding
seedDatabase();