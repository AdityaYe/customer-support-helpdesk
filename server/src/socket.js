import cookie from 'cookie';
import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import User from './models/User.js';
import { clientUrl, requireEnv } from './config/env.js';

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: clientUrl(),
      credentials: true
    }
  });

  io.use(async (socket, next) => {
    try {
      const cookies = cookie.parse(socket.handshake.headers.cookie || '');
      const token = cookies.token;
      if (!token) throw new Error('Missing token');

      const decoded = jwt.verify(token, requireEnv('JWT_SECRET'));
      const user = await User.findById(decoded.userId).select('-password');
      if (!user || !user.active) throw new Error('Invalid user');

      socket.user = user;
      socket.join(`user:${user._id}`);
      if (user.department) socket.join(`department:${user.department}`);
      if (user.role === 'admin') socket.join('admins');
      next();
    } catch {
      next(new Error('Socket authentication failed'));
    }
  });

  return io;
};

export const emitToUser = (userId, event, payload) => {
  io?.to(`user:${userId}`).emit(event, payload);
};

export const emitToDepartment = (departmentId, event, payload) => {
  io?.to(`department:${departmentId}`).emit(event, payload);
};

export const emitToAdmins = (event, payload) => {
  io?.to('admins').emit(event, payload);
};
