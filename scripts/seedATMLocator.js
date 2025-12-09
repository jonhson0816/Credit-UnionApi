require('dotenv').config();
const mongoose = require('mongoose');
const { Location } = require('../models/ATMLocator');

const improvedSeedLocations = [
  // MORE NYC LOCATIONS - Added to fix "no locations found" issue
  {
    locationType: 'atm',
    name: 'Navy Federal ATM - Manhattan Downtown',
    address: {
      street: '150 Broadway',
      city: 'New York',
      state: 'NY',
      zipCode: '10038'
    },
    coordinates: {
      type: 'Point',
      coordinates: [-74.0099, 40.7092]
    },
    hours: {
      monday: { open: '00:00', close: '23:59' },
      tuesday: { open: '00:00', close: '23:59' },
      wednesday: { open: '00:00', close: '23:59' },
      thursday: { open: '00:00', close: '23:59' },
      friday: { open: '00:00', close: '23:59' },
      saturday: { open: '00:00', close: '23:59' },
      sunday: { open: '00:00', close: '23:59' }
    },
    services: ['atm', 'deposit-atm', '24-hour-access', 'handicap-accessible'],
    atmDetails: {
      atmId: 'NFCU-NY-002',
      depositEnabled: true,
      cashWithdrawal: true,
      checkDeposit: true,
      driveThru: false,
      indoor: true,
      surchargeFreeCoop: true
    },
    accessibility: {
      wheelchairAccessible: true,
      parkingAvailable: false,
      publicTransportNearby: true
    },
    network: 'navy-federal',
    ratings: {
      average: 4.6,
      count: 54
    }
  },
  {
    locationType: 'atm',
    name: 'Navy Federal ATM - Upper East Side',
    address: {
      street: '1040 3rd Ave',
      city: 'New York',
      state: 'NY',
      zipCode: '10065'
    },
    coordinates: {
      type: 'Point',
      coordinates: [-73.9628, 40.7642]
    },
    hours: {
      monday: { open: '00:00', close: '23:59' },
      tuesday: { open: '00:00', close: '23:59' },
      wednesday: { open: '00:00', close: '23:59' },
      thursday: { open: '00:00', close: '23:59' },
      friday: { open: '00:00', close: '23:59' },
      saturday: { open: '00:00', close: '23:59' },
      sunday: { open: '00:00', close: '23:59' }
    },
    services: ['atm', 'deposit-atm', '24-hour-access', 'handicap-accessible'],
    atmDetails: {
      atmId: 'NFCU-NY-003',
      depositEnabled: true,
      cashWithdrawal: true,
      checkDeposit: true,
      driveThru: false,
      indoor: true,
      surchargeFreeCoop: true
    },
    accessibility: {
      wheelchairAccessible: true,
      parkingAvailable: false,
      publicTransportNearby: true
    },
    network: 'co-op',
    ratings: {
      average: 4.4,
      count: 32
    }
  },
  {
    locationType: 'both',
    name: 'Navy Federal Credit Union - Brooklyn Branch',
    address: {
      street: '625 Fulton St',
      city: 'Brooklyn',
      state: 'NY',
      zipCode: '11217'
    },
    coordinates: {
      type: 'Point',
      coordinates: [-73.9742, 40.6862]
    },
    phone: '1-888-842-6328',
    hours: {
      monday: { open: '09:00', close: '17:00' },
      tuesday: { open: '09:00', close: '17:00' },
      wednesday: { open: '09:00', close: '17:00' },
      thursday: { open: '09:00', close: '17:00' },
      friday: { open: '09:00', close: '17:00' },
      saturday: { open: '09:00', close: '13:00' },
      sunday: { open: null, close: null }
    },
    services: [
      'atm',
      'full-service-branch',
      'notary-service',
      'safe-deposit-boxes',
      'financial-advisors',
      'handicap-accessible',
      'deposit-atm'
    ],
    atmDetails: {
      atmId: 'NFCU-NY-004',
      depositEnabled: true,
      cashWithdrawal: true,
      checkDeposit: true,
      driveThru: false,
      indoor: true,
      surchargeFreeCoop: true
    },
    branchDetails: {
      branchCode: 'NFCU-BROOKLYN',
      appointmentRequired: false,
      languagesSpoken: ['English', 'Spanish'],
      specialServices: ['Financial Planning', 'Home Loan Specialists']
    },
    accessibility: {
      wheelchairAccessible: true,
      parkingAvailable: true,
      publicTransportNearby: true
    },
    amenities: ['parking', 'wifi', 'waiting-area', 'atm-lobby'],
    network: 'navy-federal',
    ratings: {
      average: 4.7,
      count: 128
    }
  },
  // ORIGINAL SEED LOCATIONS (keeping all your existing data)
  {
    locationType: 'both',
    name: 'Navy Federal Credit Union - Pentagon Branch',
    address: {
      street: '1 Navy Federal Drive',
      city: 'Vienna',
      state: 'VA',
      zipCode: '22180'
    },
    coordinates: {
      type: 'Point',
      coordinates: [-77.1774, 38.9007]
    },
    phone: '1-888-842-6328',
    hours: {
      monday: { open: '09:00', close: '17:00' },
      tuesday: { open: '09:00', close: '17:00' },
      wednesday: { open: '09:00', close: '17:00' },
      thursday: { open: '09:00', close: '17:00' },
      friday: { open: '09:00', close: '17:00' },
      saturday: { open: '09:00', close: '13:00' },
      sunday: { open: null, close: null }
    },
    services: [
      'atm',
      'full-service-branch',
      'notary-service',
      'safe-deposit-boxes',
      'financial-advisors',
      'drive-thru-atm',
      'handicap-accessible',
      'deposit-atm'
    ],
    atmDetails: {
      atmId: 'NFCU-VA-001',
      depositEnabled: true,
      cashWithdrawal: true,
      checkDeposit: true,
      driveThru: true,
      indoor: true,
      surchargeFreeCoop: true
    },
    branchDetails: {
      branchCode: 'NFCU-PENTAGON',
      appointmentRequired: false,
      languagesSpoken: ['English', 'Spanish'],
      specialServices: ['Military Financial Advisors', 'VA Loan Specialists']
    },
    accessibility: {
      wheelchairAccessible: true,
      parkingAvailable: true,
      publicTransportNearby: true
    },
    amenities: ['parking', 'wifi', 'waiting-area', 'coffee-station', 'atm-lobby'],
    network: 'navy-federal',
    ratings: {
      average: 4.8,
      count: 245
    }
  },
  {
    locationType: 'both',
    name: 'Navy Federal Credit Union - San Diego Branch',
    address: {
      street: '820 W Harbor Dr',
      city: 'San Diego',
      state: 'CA',
      zipCode: '92101'
    },
    coordinates: {
      type: 'Point',
      coordinates: [-117.1734, 32.7157]
    },
    phone: '1-888-842-6328',
    hours: {
      monday: { open: '09:00', close: '17:00' },
      tuesday: { open: '09:00', close: '17:00' },
      wednesday: { open: '09:00', close: '17:00' },
      thursday: { open: '09:00', close: '17:00' },
      friday: { open: '09:00', close: '17:00' },
      saturday: { open: '09:00', close: '13:00' },
      sunday: { open: null, close: null }
    },
    services: [
      'atm',
      'full-service-branch',
      'notary-service',
      'safe-deposit-boxes',
      'financial-advisors',
      'handicap-accessible',
      'deposit-atm'
    ],
    atmDetails: {
      atmId: 'NFCU-CA-001',
      depositEnabled: true,
      cashWithdrawal: true,
      checkDeposit: true,
      driveThru: false,
      indoor: true,
      surchargeFreeCoop: true
    },
    branchDetails: {
      branchCode: 'NFCU-SANDIEGO',
      appointmentRequired: false,
      languagesSpoken: ['English', 'Spanish'],
      specialServices: ['Navy Financial Advisors', 'Home Loan Specialists']
    },
    accessibility: {
      wheelchairAccessible: true,
      parkingAvailable: true,
      publicTransportNearby: true
    },
    amenities: ['parking', 'wifi', 'waiting-area', 'private-offices', 'atm-lobby'],
    network: 'navy-federal',
    ratings: {
      average: 4.7,
      count: 189
    }
  },
  {
    locationType: 'both',
    name: 'Navy Federal Credit Union - Norfolk Branch',
    address: {
      street: '1500 E Little Creek Rd',
      city: 'Norfolk',
      state: 'VA',
      zipCode: '23518'
    },
    coordinates: {
      type: 'Point',
      coordinates: [-76.1866, 36.9152]
    },
    phone: '1-888-842-6328',
    hours: {
      monday: { open: '09:00', close: '17:00' },
      tuesday: { open: '09:00', close: '17:00' },
      wednesday: { open: '09:00', close: '17:00' },
      thursday: { open: '09:00', close: '17:00' },
      friday: { open: '09:00', close: '17:00' },
      saturday: { open: '09:00', close: '13:00' },
      sunday: { open: null, close: null }
    },
    services: [
      'atm',
      'full-service-branch',
      'notary-service',
      'safe-deposit-boxes',
      'financial-advisors',
      'drive-thru-atm',
      'handicap-accessible',
      'deposit-atm',
      'coin-machine'
    ],
    atmDetails: {
      atmId: 'NFCU-VA-002',
      depositEnabled: true,
      cashWithdrawal: true,
      checkDeposit: true,
      driveThru: true,
      indoor: true,
      surchargeFreeCoop: true
    },
    branchDetails: {
      branchCode: 'NFCU-NORFOLK',
      appointmentRequired: false,
      languagesSpoken: ['English'],
      specialServices: ['Military Financial Planning', 'Deployment Assistance']
    },
    accessibility: {
      wheelchairAccessible: true,
      parkingAvailable: true,
      publicTransportNearby: false
    },
    amenities: ['parking', 'wifi', 'waiting-area', 'atm-lobby', 'outdoor-atm'],
    network: 'navy-federal',
    militaryBase: {
      onBase: true,
      baseName: 'Naval Station Norfolk',
      accessRequirements: 'Military ID Required'
    },
    ratings: {
      average: 4.9,
      count: 312
    }
  },
  {
    locationType: 'atm',
    name: 'Navy Federal ATM - Times Square',
    address: {
      street: '1500 Broadway',
      city: 'New York',
      state: 'NY',
      zipCode: '10036'
    },
    coordinates: {
      type: 'Point',
      coordinates: [-73.9855, 40.7580]
    },
    hours: {
      monday: { open: '00:00', close: '23:59' },
      tuesday: { open: '00:00', close: '23:59' },
      wednesday: { open: '00:00', close: '23:59' },
      thursday: { open: '00:00', close: '23:59' },
      friday: { open: '00:00', close: '23:59' },
      saturday: { open: '00:00', close: '23:59' },
      sunday: { open: '00:00', close: '23:59' }
    },
    services: ['atm', 'deposit-atm', '24-hour-access', 'handicap-accessible'],
    atmDetails: {
      atmId: 'NFCU-NY-001',
      depositEnabled: true,
      cashWithdrawal: true,
      checkDeposit: true,
      driveThru: false,
      indoor: true,
      surchargeFreeCoop: true
    },
    accessibility: {
      wheelchairAccessible: true,
      parkingAvailable: false,
      publicTransportNearby: true
    },
    network: 'navy-federal',
    ratings: {
      average: 4.5,
      count: 87
    }
  },
  {
    locationType: 'both',
    name: 'Navy Federal Credit Union - Jacksonville Branch',
    address: {
      street: '6797 N Main St',
      city: 'Jacksonville',
      state: 'FL',
      zipCode: '32208'
    },
    coordinates: {
      type: 'Point',
      coordinates: [-81.6587, 30.3372]
    },
    phone: '1-888-842-6328',
    hours: {
      monday: { open: '09:00', close: '17:00' },
      tuesday: { open: '09:00', close: '17:00' },
      wednesday: { open: '09:00', close: '17:00' },
      thursday: { open: '09:00', close: '17:00' },
      friday: { open: '09:00', close: '17:00' },
      saturday: { open: '09:00', close: '13:00' },
      sunday: { open: null, close: null }
    },
    services: [
      'atm',
      'full-service-branch',
      'notary-service',
      'safe-deposit-boxes',
      'financial-advisors',
      'drive-thru-atm',
      'handicap-accessible',
      'deposit-atm',
      'coin-machine'
    ],
    atmDetails: {
      atmId: 'NFCU-FL-001',
      depositEnabled: true,
      cashWithdrawal: true,
      checkDeposit: true,
      driveThru: true,
      indoor: true,
      surchargeFreeCoop: true
    },
    branchDetails: {
      branchCode: 'NFCU-JACKSONVILLE',
      appointmentRequired: false,
      languagesSpoken: ['English', 'Spanish'],
      specialServices: ['Mortgage Specialists', 'Auto Loan Experts']
    },
    accessibility: {
      wheelchairAccessible: true,
      parkingAvailable: true,
      publicTransportNearby: false
    },
    amenities: ['parking', 'wifi', 'waiting-area', 'coffee-station', 'atm-lobby'],
    network: 'navy-federal',
    ratings: {
      average: 4.6,
      count: 156
    }
  },
  {
    locationType: 'atm',
    name: 'Navy Federal ATM - Chicago Downtown',
    address: {
      street: '233 S Wacker Dr',
      city: 'Chicago',
      state: 'IL',
      zipCode: '60606'
    },
    coordinates: {
      type: 'Point',
      coordinates: [-87.6362, 41.8781]
    },
    hours: {
      monday: { open: '00:00', close: '23:59' },
      tuesday: { open: '00:00', close: '23:59' },
      wednesday: { open: '00:00', close: '23:59' },
      thursday: { open: '00:00', close: '23:59' },
      friday: { open: '00:00', close: '23:59' },
      saturday: { open: '00:00', close: '23:59' },
      sunday: { open: '00:00', close: '23:59' }
    },
    services: ['atm', 'cash-only-atm', '24-hour-access', 'handicap-accessible'],
    atmDetails: {
      atmId: 'NFCU-IL-001',
      depositEnabled: false,
      cashWithdrawal: true,
      checkDeposit: false,
      driveThru: false,
      indoor: true,
      surchargeFreeCoop: true
    },
    accessibility: {
      wheelchairAccessible: true,
      parkingAvailable: false,
      publicTransportNearby: true
    },
    network: 'co-op',
    ratings: {
      average: 4.2,
      count: 43
    }
  },
  {
    locationType: 'both',
    name: 'Navy Federal Credit Union - San Antonio Branch',
    address: {
      street: '8610 N New Braunfels Ave',
      city: 'San Antonio',
      state: 'TX',
      zipCode: '78217'
    },
    coordinates: {
      type: 'Point',
      coordinates: [-98.4303, 29.5149]
    },
    phone: '1-888-842-6328',
    hours: {
      monday: { open: '09:00', close: '17:00' },
      tuesday: { open: '09:00', close: '17:00' },
      wednesday: { open: '09:00', close: '17:00' },
      thursday: { open: '09:00', close: '17:00' },
      friday: { open: '09:00', close: '17:00' },
      saturday: { open: '09:00', close: '13:00' },
      sunday: { open: null, close: null }
    },
    services: [
      'atm',
      'full-service-branch',
      'notary-service',
      'safe-deposit-boxes',
      'financial-advisors',
      'drive-thru-atm',
      'handicap-accessible',
      'deposit-atm'
    ],
    atmDetails: {
      atmId: 'NFCU-TX-001',
      depositEnabled: true,
      cashWithdrawal: true,
      checkDeposit: true,
      driveThru: true,
      indoor: true,
      surchargeFreeCoop: true
    },
    branchDetails: {
      branchCode: 'NFCU-SANANTONIO',
      appointmentRequired: false,
      languagesSpoken: ['English', 'Spanish'],
      specialServices: ['Air Force Financial Planning', 'VA Loan Services']
    },
    accessibility: {
      wheelchairAccessible: true,
      parkingAvailable: true,
      publicTransportNearby: false
    },
    amenities: ['parking', 'wifi', 'waiting-area', 'private-offices', 'atm-lobby'],
    network: 'navy-federal',
    ratings: {
      average: 4.7,
      count: 201
    }
  },
  {
    locationType: 'atm',
    name: 'Navy Federal ATM - Los Angeles Airport',
    address: {
      street: '1 World Way',
      city: 'Los Angeles',
      state: 'CA',
      zipCode: '90045'
    },
    coordinates: {
      type: 'Point',
      coordinates: [-118.4085, 33.9416]
    },
    hours: {
      monday: { open: '00:00', close: '23:59' },
      tuesday: { open: '00:00', close: '23:59' },
      wednesday: { open: '00:00', close: '23:59' },
      thursday: { open: '00:00', close: '23:59' },
      friday: { open: '00:00', close: '23:59' },
      saturday: { open: '00:00', close: '23:59' },
      sunday: { open: '00:00', close: '23:59' }
    },
    services: ['atm', 'cash-only-atm', '24-hour-access', 'handicap-accessible'],
    atmDetails: {
      atmId: 'NFCU-CA-002',
      depositEnabled: false,
      cashWithdrawal: true,
      checkDeposit: false,
      driveThru: false,
      indoor: true,
      surchargeFreeCoop: true
    },
    accessibility: {
      wheelchairAccessible: true,
      parkingAvailable: true,
      publicTransportNearby: true
    },
    network: 'allpoint',
    ratings: {
      average: 4.3,
      count: 67
    }
  },
  {
    locationType: 'both',
    name: 'Navy Federal Credit Union - Seattle Branch',
    address: {
      street: '3400 SW Alaska St',
      city: 'Seattle',
      state: 'WA',
      zipCode: '98126'
    },
    coordinates: {
      type: 'Point',
      coordinates: [-122.3668, 47.5609]
    },
    phone: '1-888-842-6328',
    hours: {
      monday: { open: '09:00', close: '17:00' },
      tuesday: { open: '09:00', close: '17:00' },
      wednesday: { open: '09:00', close: '17:00' },
      thursday: { open: '09:00', close: '17:00' },
      friday: { open: '09:00', close: '17:00' },
      saturday: { open: '09:00', close: '13:00' },
      sunday: { open: null, close: null }
    },
    services: [
      'atm',
      'full-service-branch',
      'notary-service',
      'safe-deposit-boxes',
      'financial-advisors',
      'handicap-accessible',
      'deposit-atm'
    ],
    atmDetails: {
      atmId: 'NFCU-WA-001',
      depositEnabled: true,
      cashWithdrawal: true,
      checkDeposit: true,
      driveThru: false,
      indoor: true,
      surchargeFreeCoop: true
    },
    branchDetails: {
      branchCode: 'NFCU-SEATTLE',
      appointmentRequired: false,
      languagesSpoken: ['English'],
      specialServices: ['Coast Guard Financial Services', 'Investment Planning']
    },
    accessibility: {
      wheelchairAccessible: true,
      parkingAvailable: true,
      publicTransportNearby: true
    },
    amenities: ['parking', 'wifi', 'waiting-area', 'coffee-station', 'atm-lobby'],
    network: 'navy-federal',
    ratings: {
      average: 4.8,
      count: 178
    }
  },
  {
    locationType: 'atm',
    name: 'Navy Federal ATM - Miami Beach',
    address: {
      street: '1701 Collins Ave',
      city: 'Miami Beach',
      state: 'FL',
      zipCode: '33139'
    },
    coordinates: {
      type: 'Point',
      coordinates: [-80.1298, 25.7907]
    },
    hours: {
      monday: { open: '00:00', close: '23:59' },
      tuesday: { open: '00:00', close: '23:59' },
      wednesday: { open: '00:00', close: '23:59' },
      thursday: { open: '00:00', close: '23:59' },
      friday: { open: '00:00', close: '23:59' },
      saturday: { open: '00:00', close: '23:59' },
      sunday: { open: '00:00', close: '23:59' }
    },
    services: ['atm', 'deposit-atm', '24-hour-access', 'handicap-accessible'],
    atmDetails: {
      atmId: 'NFCU-FL-002',
      depositEnabled: true,
      cashWithdrawal: true,
      checkDeposit: true,
      driveThru: false,
      indoor: false,
      surchargeFreeCoop: true
    },
    accessibility: {
      wheelchairAccessible: true,
      parkingAvailable: false,
      publicTransportNearby: true
    },
    network: 'navy-federal',
    ratings: {
      average: 4.4,
      count: 92
    }
  }
];

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      family: 4
    });

    console.log('✓ Connected to MongoDB');

    // Clear existing locations (optional - remove comment to clear)
    // await Location.deleteMany({});
    // console.log('✓ Cleared existing locations');

    const insertedLocations = await Location.insertMany(improvedSeedLocations);
    console.log(`✓ Inserted ${insertedLocations.length} locations`);

    console.log('\n=== Seed Summary ===');
    const atmCount = insertedLocations.filter(l => l.locationType === 'atm').length;
    const branchCount = insertedLocations.filter(l => l.locationType === 'branch').length;
    const bothCount = insertedLocations.filter(l => l.locationType === 'both').length;
    
    console.log(`ATMs: ${atmCount}`);
    console.log(`Branches: ${branchCount}`);
    console.log(`Both: ${bothCount}`);
    
    const states = [...new Set(insertedLocations.map(l => l.address.state))];
    console.log(`States covered: ${states.join(', ')}`);

    const nycLocations = insertedLocations.filter(l => 
      l.address.city === 'New York' || l.address.city === 'Brooklyn'
    );
    console.log(`\n🗽 NYC Area Locations: ${nycLocations.length}`);

    console.log('\n✓ Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('✗ Seeding error:', error);
    process.exit(1);
  }
};

seedDatabase();