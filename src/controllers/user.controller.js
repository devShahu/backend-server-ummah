const userService = require('../services/user.service');
const { ApiError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * Controller for handling user operations
 */
class UserController {
  /**
   * Get all users (admin only)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async getAllUsers(req, res, next) {
    try {
      const { page = 1, limit = 20, search = '' } = req.query;
      
      const result = await userService.getAllUsers(
        parseInt(page), 
        parseInt(limit),
        search
      );
      
      res.status(200).json({
        error: false,
        message: 'Users retrieved successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user by ID
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async getUserById(req, res, next) {
    try {
      const { id } = req.params;
      
      const user = await userService.getUserById(id);
      
      res.status(200).json({
        error: false,
        message: 'User retrieved successfully',
        data: { user }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user information (admin or self)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async updateUser(req, res, next) {
    try {
      const { id } = req.params;
      const { name, email, photo, status } = req.body;
      
      const userData = {};
      if (name !== undefined) userData.name = name;
      if (email !== undefined) userData.email = email;
      if (photo !== undefined) userData.photo = photo;
      if (status !== undefined) userData.status = status;
      
      const updatedUser = await userService.updateUser(id, userData);
      
      res.status(200).json({
        error: false,
        message: 'User updated successfully',
        data: { user: updatedUser }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user verification status (admin only)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async updateVerificationStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { verified } = req.body;
      
      if (verified === undefined) {
        throw new ApiError(400, 'Verified status is required');
      }
      
      const updatedUser = await userService.updateVerificationStatus(id, verified);
      
      res.status(200).json({
        error: false,
        message: `User ${verified ? 'verified' : 'unverified'} successfully`,
        data: { user: updatedUser }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user disabled status (admin only)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async updateDisabledStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { disabled } = req.body;
      
      if (disabled === undefined) {
        throw new ApiError(400, 'Disabled status is required');
      }
      
      const updatedUser = await userService.updateDisabledStatus(id, disabled);
      
      res.status(200).json({
        error: false,
        message: `User ${disabled ? 'disabled' : 'enabled'} successfully`,
        data: { user: updatedUser }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete user (admin only)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async deleteUser(req, res, next) {
    try {
      const { id } = req.params;
      
      await userService.deleteUser(id);
      
      res.status(200).json({
        error: false,
        message: 'User deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Report a user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async reportUser(req, res, next) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const reportedBy = req.user.id;
      
      if (!reason) {
        throw new ApiError(400, 'Reason is required');
      }
      
      // Check if user is reporting themselves
      if (id === reportedBy) {
        throw new ApiError(400, 'You cannot report yourself');
      }
      
      // Check if user exists
      await userService.getUserById(id);
      
      // Add report
      await query(
        'INSERT INTO reported_users (user_id, reported_by, reason) VALUES ($1, $2, $3)',
        [id, reportedBy, reason]
      );
      
      res.status(200).json({
        error: false,
        message: 'User reported successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Block a user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async blockUser(req, res, next) {
    try {
      const { id } = req.params;
      const blockedBy = req.user.id;
      
      // Check if user is blocking themselves
      if (id === blockedBy) {
        throw new ApiError(400, 'You cannot block yourself');
      }
      
      // Check if user exists
      await userService.getUserById(id);
      
      // Add to blocked users
      await query(
        'INSERT INTO blocked_users (user_id, blocked_user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [blockedBy, id]
      );
      
      res.status(200).json({
        error: false,
        message: 'User blocked successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Unblock a user
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async unblockUser(req, res, next) {
    try {
      const { id } = req.params;
      const blockedBy = req.user.id;
      
      // Remove from blocked users
      const result = await query(
        'DELETE FROM blocked_users WHERE user_id = $1 AND blocked_user_id = $2',
        [blockedBy, id]
      );
      
      res.status(200).json({
        error: false,
        message: result.rowCount > 0 ? 'User unblocked successfully' : 'User was not blocked'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get blocked users
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  async getBlockedUsers(req, res, next) {
    try {
      const userId = req.user.id;
      
      const result = await query(
        `SELECT bu.blocked_user_id, u.name, u.phone_number, u.photo, bu.created_at as blocked_at
        FROM blocked_users bu
        JOIN users u ON bu.blocked_user_id = u.id
        WHERE bu.user_id = $1
        ORDER BY bu.created_at DESC`,
        [userId]
      );
      
      res.status(200).json({
        error: false,
        message: 'Blocked users retrieved successfully',
        data: { blockedUsers: result.rows }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UserController();