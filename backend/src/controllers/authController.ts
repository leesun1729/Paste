import { Request, Response } from 'express';
import { authService } from '../services/authService';
import { asyncHandler } from '../middleware/errorHandler';

export const authController = {
  register: asyncHandler(async (req: Request, res: Response) => {
    const { email, username, password } = req.body;
    const result = await authService.register(email, username, password);
    res.status(201).json({ success: true, data: result });
  }),

  login: asyncHandler(async (req: Request, res: Response) => {
    const { email, password, deviceId, deviceName } = req.body;
    const result = await authService.login(email, password, deviceId, deviceName);
    res.json({ success: true, data: result });
  }),

  refresh: asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    const tokens = await authService.refreshToken(refreshToken);
    res.json({ success: true, data: tokens });
  }),

  logout: asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    await authService.logout(req.user!.userId, refreshToken);
    res.json({ success: true, message: 'Logged out successfully' });
  }),

  getProfile: asyncHandler(async (req: Request, res: Response) => {
    const user = await authService.getProfile(req.user!.userId);
    res.json({ success: true, data: user });
  }),

  updateProfile: asyncHandler(async (req: Request, res: Response) => {
    const user = await authService.updateProfile(req.user!.userId, req.body);
    res.json({ success: true, data: user });
  }),
};
