const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// 所有路由都需要认证
router.use(authenticateToken);

// 管理员权限中间件
const requireAdmin = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ error: '需要管理员权限' });
  }
  next();
};

// 获取所有用户列表（管理员）
router.get('/', requireAdmin, async (req, res) => {
  try {
    const [users] = await db.pool.execute(`
      SELECT 
        id, email, phone, is_admin, is_active, 
        last_login, created_at, updated_at,
        (SELECT COUNT(*) FROM servers WHERE user_id = users.id) as server_count
      FROM users 
      ORDER BY created_at DESC
    `);

    res.json({ users });
  } catch (error) {
    console.error('获取用户列表错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 获取单个用户详细信息（管理员）
router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // 获取用户基本信息
    const [users] = await db.pool.execute(
      'SELECT id, email, phone, is_admin, is_active, last_login, created_at, updated_at FROM users WHERE id = ?',
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const user = users[0];

    // 获取用户的服务器列表
    const [servers] = await db.pool.execute(`
      SELECT 
        id, name, host, port, username, auth_type, 
        group_name, created_at, updated_at
      FROM servers 
      WHERE user_id = ?
      ORDER BY created_at DESC
    `, [id]);

    // 获取用户的连接日志统计
    const [connectionStats] = await db.pool.execute(`
      SELECT 
        COUNT(*) as total_connections,
        SUM(duration) as total_duration,
        MAX(start_time) as last_connection
      FROM connection_logs 
      WHERE user_id = ?
    `, [id]);

    res.json({
      user: {
        ...user,
        server_count: servers.length,
        connection_stats: connectionStats[0]
      },
      servers
    });
  } catch (error) {
    console.error('获取用户详情错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 创建新用户（管理员）
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { email, phone, password, is_admin = false } = req.body;

    // 验证输入
    if (!email || !password) {
      return res.status(400).json({ error: '邮箱和密码是必填项' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: '密码长度至少6位' });
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
      'INSERT INTO users (email, phone, password_hash, is_admin) VALUES (?, ?, ?, ?)',
      [email, phone || null, passwordHash, is_admin ? 1 : 0]
    );

    res.status(201).json({
      message: '用户创建成功',
      user: {
        id: result.insertId,
        email,
        phone,
        is_admin: is_admin ? 1 : 0
      }
    });
  } catch (error) {
    console.error('创建用户错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 更新用户信息（管理员）
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { email, phone, is_admin, is_active } = req.body;

    // 检查用户是否存在
    const [users] = await db.pool.execute(
      'SELECT id FROM users WHERE id = ?',
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 构建更新字段
    const updateFields = [];
    const updateValues = [];

    if (email !== undefined) {
      updateFields.push('email = ?');
      updateValues.push(email);
    }

    if (phone !== undefined) {
      updateFields.push('phone = ?');
      updateValues.push(phone);
    }

    if (is_admin !== undefined) {
      updateFields.push('is_admin = ?');
      updateValues.push(is_admin ? 1 : 0);
    }

    if (is_active !== undefined) {
      updateFields.push('is_active = ?');
      updateValues.push(is_active ? 1 : 0);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: '没有需要更新的字段' });
    }

    updateValues.push(id);

    // 更新用户信息
    await db.pool.execute(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    res.json({ message: '用户信息更新成功' });
  } catch (error) {
    console.error('更新用户信息错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 重置用户密码（管理员）
router.put('/:id/password', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ error: '新密码是必填项' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: '密码长度至少6位' });
    }

    // 检查用户是否存在
    const [users] = await db.pool.execute(
      'SELECT id FROM users WHERE id = ?',
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 加密新密码
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // 更新密码
    await db.pool.execute(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [newPasswordHash, id]
    );

    res.json({ message: '密码重置成功' });
  } catch (error) {
    console.error('重置密码错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 删除用户（管理员）
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // 检查用户是否存在
    const [users] = await db.pool.execute(
      'SELECT id FROM users WHERE id = ?',
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: '用户不存在' });
    }

    // 检查是否为管理员自身（不允许删除自己）
    if (parseInt(id) === parseInt(req.user.userId)) {
      return res.status(400).json({ error: '不能删除自己的账户' });
    }

    // 删除用户（由于外键约束，关联的服务器和分组也会被删除）
    await db.pool.execute('DELETE FROM users WHERE id = ?', [id]);

    res.json({ message: '用户删除成功' });
  } catch (error) {
    console.error('删除用户错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

module.exports = router;