import mongoose from 'mongoose';
import argon2 from 'argon2';

const userSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a name'],
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
    age: {
      type: Number,
    },
    income: {
      type: Number,
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
userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }
  try {
    this.password = await argon2.hash(this.password);
  } catch (err) {
    throw new Error(err);
  }
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await argon2.verify(this.password, enteredPassword);
};

export default mongoose.model('User', userSchema);
