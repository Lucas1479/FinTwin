import mongoose from 'mongoose';
import argon2 from 'argon2';

// --- Sub-schemas for better organization (The FinTwin Vision) ---

const RiskProfileSchema = new mongoose.Schema({
  level: {
    type: String,
    enum: ['Conservative', 'Balanced', 'Growth', 'High Growth'],
    default: 'Balanced',
  },
  maxDrawdown: { type: Number, default: 20 }, // 最大回撤容忍度 %
  volatilityTolerance: { type: Number, default: 15 }, // 波动率偏好 %
  retirementAge: { type: Number, default: 65 },
  planningAge: { type: Number, default: 90 }, // 预期寿命
  investmentExperience: { 
    type: String, 
    enum: ['Novice', 'Intermediate', 'Advanced'], 
    default: 'Intermediate' 
  }, // 新增：投资经验
  nzMarketKnowledge: { 
    type: String, 
    enum: ['Low', 'Medium', 'High'], 
    default: 'Medium' 
  }, // 新增：新西兰市场熟悉程度
}, { _id: false });

const HouseholdSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['Single', 'Couple', 'Family', 'Other'],
    default: 'Single',
  },
  dependents: { type: Number, default: 0 },
  region: {
    type: String,
    enum: [
      'Northland', 'Auckland', 'Waikato', 'Bay of Plenty', 'Gisborne', 
      'Hawke\'s Bay', 'Taranaki', 'Manawatu-Whanganui', 'Wellington', 
      'Tasman', 'Nelson', 'Marlborough', 'West Coast', 'Canterbury', 
      'Otago', 'Southland', 'Other'
    ],
    default: 'Auckland',
  },
  occupation: { type: String, default: '' },
  dob: { type: Date }, // Date of Birth
  statement: { type: String, default: '' }, // Financial vision statement for AI context
}, { _id: false });

const ComplianceSchema = new mongoose.Schema({
  pirRate: {
    type: Number,
    enum: [0.105, 0.175, 0.28],
    default: 0.28,
  },
  taxResidency: { type: String, default: 'New Zealand' },
  kiwiSaverContribution: {
    type: Number,
    enum: [0, 0.03, 0.04, 0.06, 0.08, 0.10],
    default: 0.03,
  },
}, { _id: false });

const AllocationSchema = new mongoose.Schema({
  debtVsInvest: {
    type: String,
    enum: ['Aggressive Debt', 'Balanced', 'Aggressive Invest'],
    default: 'Balanced',
  },
  emergencyBufferMonths: { type: Number, default: 3 }, // 预留几个月的支出作为缓冲
  goalPriorities: {
    type: Map,
    of: Number,
    default: {}, // Goal ID -> Weight (0-100)
  },
}, { _id: false });

const UserSettingsSchema = new mongoose.Schema({
  theme: { type: String, default: 'light' },
  currency: { type: String, default: 'NZD' },
  avatar_url: { type: String, default: '' },
}, { _id: false });

const PrivacySchema = new mongoose.Schema({
  isPrivateMode: { type: Boolean, default: false },
  shareWithAI: { type: Boolean, default: true },
  shareWithPartners: { type: Boolean, default: false },
}, { _id: false });

const SecuritySchema = new mongoose.Schema({
  twoFactorEnabled: { type: Boolean, default: false },
  loginAlerts: { type: Boolean, default: true },
  lastPasswordChange: { type: Date, default: Date.now },
}, { _id: false });

const UserSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a name'],
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [3, 'Username must be at least 3 characters long.'],
      maxlength: [15, 'Username cannot exceed 15 characters.'],
      validate: {
        validator: function(v) {
          return /^[a-z0-9_]+$/.test(v); 
        },
        message: props => `${props.value} is not a valid format. Usernames can only contain letters, numbers, and underscores.`
      }
    },
    email: {
      type: String,
      required: [true, 'Please add an email'],
      unique: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please add a valid email',
      ],
    },
    password: {
      type: String,
      required: [true, 'Please add a password'],
      minlength: 6,
      select: false,
    },

    // --- Structured Profile Data ---
    riskProfile: { type: RiskProfileSchema, default: () => ({}) },
    household: { type: HouseholdSchema, default: () => ({}) },
    compliance: { type: ComplianceSchema, default: () => ({}) },
    allocation: { type: AllocationSchema, default: () => ({}) },
    settings: { type: UserSettingsSchema, default: () => ({}) },
    privacy: { type: PrivacySchema, default: () => ({}) },
    security: { type: SecuritySchema, default: () => ({}) },

    // 预留 Shadow Accounts 数据结构
    shadowAccounts: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Encrypt password using argon2
UserSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  try {
    this.password = await argon2.hash(this.password);
  } catch (err) {
    throw new Error(err);
  }
});

// Helper function: Generate a random alphanumeric string
function generateRandomString(length = 4) {
    return Math.random().toString(36).substring(2, length + 2).toUpperCase();
}

// Pre-validate Hook: Automatically generate a unique username if not provided

UserSchema.pre('validate', async function() {
    const user = this;

    // Run this logic if no username exists (handles new users and legacy users)
    if (!user.username) {
        const emailPrefix = user.email.split('@')[0];
        let isUnique = false;
        let attempts = 0;
        const MAX_ATTEMPTS = 5; // Safety limit to prevent infinite loops

        // Loop to generate and check for a unique username
        while (!isUnique && attempts < MAX_ATTEMPTS) {
            // Generate a candidate: email prefix + underscore + random string
            let candidateUsername = `${emailPrefix}_${generateRandomString(4)}`;
            
            // Enforce Schema constraints (truncate to max length of 15, convert to lowercase)
            candidateUsername = candidateUsername.substring(0, 15).toLowerCase();

            // Check the database to ensure this username doesn't already exist
            const existingUser = await this.constructor.findOne({ username: candidateUsername });

            if (!existingUser) {
                // Success: The username is unique
                user.username = candidateUsername;
                isUnique = true;
            }
            attempts++;
        }

        // If we failed to find a unique username after maximum attempts, throw an error
        if (!isUnique) {
            throw new Error('Failed to generate a unique username after multiple attempts.');
        }
    }
});

// Match user entered password to hashed password in database
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await argon2.verify(this.password, enteredPassword);
};

export default mongoose.model('User', UserSchema);
