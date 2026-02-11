const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../config/database');

const router = express.Router();

// 验证令牌中间件
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: '访问令牌缺失' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'webssh-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ error: '令牌无效' });
    }
    req.user = user;
    next();
  });
};

// 检查是否是管理员
const requireAdmin = async (req, res, next) => {
  try {
    const [users] = await db.pool.execute(
      'SELECT role FROM users WHERE id = ?',
      [req.user.userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }

    if (users[0].role !== 'admin') {
      return res.status(403).json({ error: '需要管理员权限' });
    }

    next();
  } catch (error) {
    console.error('检查管理员权限错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
};

// 获取所有用户列表（仅管理员）
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [users] = await db.pool.execute(`
      SELECT 
        id, email, phone, role, status, 
        created_at, updated_at 
      FROM users 
      ORDER BY created_at DESC
    `);

    // 获取每个用户的服务器数量
    for (let user of users) {
      const [serverCount] = await db.pool.execute(
        'SELECT COUNT(*) as count FROM servers WHERE user_id = ?',
        [user.id]
      );
      user.serverCount = serverCount[0].count;
    }

    res.json({ users });
  } catch (error) {
    console.error('获取用户列表错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 创建新用户（仅管理员）
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { email, phone, password, role = 'user' } = req.body;

    // 验证输入
    if (!email || !password) {
      return res.status(400).json({ error: '邮箱和密码是必填项' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: '密码长度至少6位' });
    }

    if (!['admin', 'user'].includes(role)) {
      return res.status(400).json({ error: '角色参数无效' });
    }

    // 检查用户是否已存在
    const [existingUsers] = await db.pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ error: '该邮箱已被注册' });
    }

    // 加密密码
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 创建用户
    const [result] = await db.pool.execute(
      'INSERT INTO users (email, phone, password_hash, role, status) VALUES (?, ?, ?, ?, ?)',
      [email, phone || null, passwordHash, role, 'active']
    );

    // 获取新创建的用户详情
    const [newUser] = await db.pool.execute(
      'SELECT id, email, phone, role, status, created_at FROM users WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      message: '用户创建成功',
      user: {
        ...newUser[0],
        serverCount: 0
      }
    });
  } catch (error) {
    console.error('创建用户错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 更新用户信息（仅管理员）
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const { email, phone, role, status } = req.body;

    // 检查用户是否存在
    const [existingUsers] = await db.pool.execute(
      'SELECT id FROM users WHERE id = ?',
      [userId]
    );

    if (existingUsers.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 验证角色参数
    if (role && !['admin', 'user'].includes(role)) {
      return res.status(400).json({ error: '角色参数无效' });
    }

    // 验证状态参数
    if (status && !['active', 'disabled'].includes(status)) {
      return res.status(400).json({ error: '状态参数无效' });
    }

    // 检查邮箱是否已被其他用户使用
    if (email) {
      const [duplicateUsers] = await db.pool.execute(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, userId]
      );

      if (duplicateUsers.length > 0) {
        return res.status(400).json({ error: '该邮箱已被其他用户使用' });
      }
    }

    // 构建更新字段
    const updateFields = [];
    const updateValues = [];

    if (email) {
      updateFields.push('email = ?');
      updateValues.push(email);
    }

    if (phone !== undefined) {
      updateFields.push('phone = ?');
      updateValues.push(phone || null);
    }

    if (role) {
      updateFields.push('role = ?');
      updateValues.push(role);
    }

    if (status) {
      updateFields.push('status = ?');
      updateValues.push(status);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: '没有提供更新信息' });
    }

    updateValues.push(userId);

    await db.pool.execute(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    // 获取更新后的用户详情
    const [updatedUser] = await db.pool.execute(
      'SELECT id, email, phone, role, status, created_at FROM users WHERE id = ?',
      [userId]
    );

    // 获取服务器数量
    const [serverCount] = await db.pool.execute(
      'SELECT COUNT(*) as count FROM servers WHERE user_id = ?',
      [userId]
    );

    res.json({
      message: '用户信息更新成功',
      user: {
        ...updatedUser[0],
        serverCount: serverCount[0].count
      }
    });
  } catch (error) {
    console.error('更新用户信息错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 重置用户密码（仅管理员）
router.put('/:id/password', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ error: '新密码是必填项' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: '新密码长度至少6位' });
    }

    // 检查用户是否存在
    const [existingUsers] = await db.pool.execute(
      'SELECT id FROM users WHERE id = ?',
      [userId]
    );

    if (existingUsers.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 加密新密码
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // 更新密码
    await db.pool.execute(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [newPasswordHash, userId]
    );

    res.json({ message: '密码重置成功' });
  } catch (error) {
    console.error('重置用户密码错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 删除用户（仅管理员）
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const userId = req.params.id;

    // 检查用户是否存在
    const [existingUsers] = await db.pool.execute(
      'SELECT id, role FROM users WHERE id = ?',
      [userId]
    );

    if (existingUsers.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 不能删除自己
    if (parseInt(userId) === parseInt(req.user.userId)) {
      return res.status(400).json({ error: '不能删除自己的账户' });
    }

    // 获取用户的服务器数量
    const [serverCount] = await db.pool.execute(
      'SELECT COUNT(*) as count FROM servers WHERE user_id = ?',
      [userId]
    );

    const count = serverCount[0].count;

    // 删除用户（级联删除相关数据）
    await db.pool.execute(
      'DELETE FROM users WHERE id = ?',
      [userId]
    );

    res.json({
      message: `用户删除成功，同时删除了 ${count} 个相关服务器`
    });
  } catch (error) {
    console.error('删除用户错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 获取当前用户信息（包含角色和状态）
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const [users] = await db.pool.execute(
      'SELECT id, email, phone, role, status, created_at FROM users WHERE id = ?',
      [req.user.userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }

    res.json({ user: users[0] });
  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

module.exports = router;