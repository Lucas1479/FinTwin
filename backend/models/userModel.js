import mongoose from 'mongoose';
import argon2 from 'argon2';

const UserSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a name'],
    },
    username: {
      type: String,
      required: true,      // Username is mandatory (auto-generated if not provided)
      unique: true,        // Username must be unique
      trim: true,          // Automatically remove leading/trailing whitespace
      lowercase: true,     // Optional: Convert to lowercase to enforce case-insensitive uniqueness
      minlength: [3, 'Username must be at least 3 characters long.'], // Minimum length constraint
      maxlength: [15, 'Username cannot exceed 15 characters.'], // Maximum length constraint
      // Custom validation using a regular expression to enforce format
      validate: {
        validator: function(v) {
          // Allows only letters (a-z), numbers (0-9), and underscores (_)
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
      select: false, // 默认查询不返回密码
    },
    // 以下为 Proposal Module 4 所需字段


    // profile
    dob: {
      type: Date,
      validate: {
        validator: function (value) {
          if (!value) return true; // allow empty
          const date = new Date(value);
          const today = new Date();
          return (
            value instanceof Date &&
            !isNaN(date.getTime()) &&
            date <= today
          );
        },
        message: 'Date of birth must be a valid date in the past.',
      },
    },
    avatar_url: {
      type: String,
    },
    // user settings
    theme: {
      type: String,
      default: 'light',
    },
    currency: {
      type: String,
      default: 'NZD',
    },
    retirement_age: {
      type: Number,
      default: 65,
      min: [0, 'Retirement age must be a positive number.'],
      max: [120, 'Retirement age must be a realistic value.'],
    },
    riskTolerance: {
      type: String,
      enum: ['Conservative', 'Balanced', 'Growth', 'High Growth'],
      default: 'Balanced',
    },
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

    // Only run this logic if the document is new and no username was manually provided
    if (user.isNew && !user.username) {
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
