import { User, IUserDocument } from '../models/User';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { AppError, UnauthorizedError, ConflictError } from '../utils/errors';
import crypto from 'crypto';

export class AuthService {
  async register(email: string, username: string, password: string) {
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    const user = await User.create({
      email: email.toLowerCase(),
      username,
      password,
    });

    const tokens = this.generateTokens(user);
    await this.saveRefreshToken(user, tokens.refreshToken);

    return {
      user: user.toJSON(),
      ...tokens,
    };
  }

  async login(email: string, password: string, deviceId?: string, deviceName?: string) {
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (deviceId) {
      await this.registerDevice(user, deviceId, deviceName || 'Unknown Device');
    }

    user.lastLoginAt = new Date();
    await user.save();

    const tokens = this.generateTokens(user);
    await this.saveRefreshToken(user, tokens.refreshToken);

    return {
      user: user.toJSON(),
      ...tokens,
    };
  }

  async refreshToken(token: string) {
    try {
      const payload = verifyRefreshToken(token);

      const user = await User.findById(payload.userId);
      if (!user || !user.refreshTokens.includes(token)) {
        throw new UnauthorizedError('Invalid refresh token');
      }

      user.refreshTokens = user.refreshTokens.filter((t) => t !== token);
      const tokens = this.generateTokens(user);
      await this.saveRefreshToken(user, tokens.refreshToken);

      return tokens;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new UnauthorizedError('Invalid refresh token');
    }
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      await User.findByIdAndUpdate(userId, {
        $pull: { refreshTokens: refreshToken },
      });
    } else {
      await User.findByIdAndUpdate(userId, {
        $set: { refreshTokens: [] },
      });
    }
  }

  async getProfile(userId: string) {
    const user = await User.findById(userId);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }
    return user.toJSON();
  }

  async updateProfile(userId: string, updates: Partial<IUserDocument>) {
    const allowedUpdates = ['username', 'avatar', 'preferences'];
    const filtered: Record<string, unknown> = {};

    for (const key of allowedUpdates) {
      if (key in updates) {
        filtered[key] = (updates as Record<string, unknown>)[key];
      }
    }

    const user = await User.findByIdAndUpdate(userId, { $set: filtered }, { new: true });
    if (!user) throw new UnauthorizedError('User not found');
    return user.toJSON();
  }

  async registerDevice(user: IUserDocument, deviceId: string, name: string) {
    const existingDevice = user.devices.find((d) => d.deviceId === deviceId);
    if (existingDevice) {
      existingDevice.lastSyncAt = new Date();
      existingDevice.name = name;
    } else {
      user.devices.push({ deviceId, name, lastSyncAt: new Date() });
    }
    await user.save();
  }

  private generateTokens(user: IUserDocument) {
    const payload = { userId: user._id.toString(), email: user.email };
    return {
      accessToken: signAccessToken(payload),
      refreshToken: signRefreshToken(payload),
    };
  }

  private async saveRefreshToken(user: IUserDocument, token: string) {
    user.refreshTokens.push(token);
    if (user.refreshTokens.length > 5) {
      user.refreshTokens = user.refreshTokens.slice(-5);
    }
    await user.save();
  }
}

export const authService = new AuthService();
