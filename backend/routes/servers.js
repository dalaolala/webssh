const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const encryptionService = require('../utils/encryption');
const { Client } = require('ssh2');

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

// 获取用户的所有服务器
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [servers] = await db.pool.execute(
      `SELECT 
        s.id, s.name, s.host, s.port, s.username, s.auth_type, 
        s.group_id, s.group_name, g.name as group_name_actual,
        s.created_at, s.updated_at 
       FROM servers s
       LEFT JOIN \`groups\` g ON s.group_id = g.id
       WHERE s.user_id = ? 
       ORDER BY COALESCE(g.name, s.group_name), s.name`,
      [req.user.userId]
    );

    // 统一分组名称显示
    const processedServers = servers.map(server => ({
      ...server,
      group_name: server.group_name_actual || server.group_name
    }));

    res.json({ servers: processedServers });
  } catch (error) {
    console.error('获取服务器列表错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 添加新服务器
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, host, port, username, password, privateKey, authType, groupName } = req.body;

    // 验证必填字段
    if (!name || !host || !username) {
      return res.status(400).json({ error: '名称、主机和用户名是必填项' });
    }

    // 验证认证方式
    if (authType === 'password' && !password) {
      return res.status(400).json({ error: '密码认证需要提供密码' });
    }

    if (authType === 'key' && !privateKey) {
      return res.status(400).json({ error: '密钥认证需要提供私钥' });
    }

    // 加密敏感信息
    let passwordEncrypted = null;
    let privateKeyEncrypted = null;

    if (authType === 'password' && password) {
      passwordEncrypted = encryptionService.encryptPassword(password, req.user.userId);
    }

    if (authType === 'key' && privateKey) {
      privateKeyEncrypted = encryptionService.encryptPrivateKey(privateKey, req.user.userId);
    }

    // 处理分组信息
    let groupId = null;
    let finalGroupName = groupName || 'Default';

    // 查找对应的分组ID
    if (groupName) {
      const [groups] = await db.pool.execute(
        'SELECT id FROM \`groups\` WHERE user_id = ? AND name = ?',
        [req.user.userId, groupName]
      );

      if (groups.length > 0) {
        groupId = groups[0].id;
      } else {
        // 如果分组不存在，创建新分组
        const [groupResult] = await db.pool.execute(
          'INSERT INTO \`groups\` (user_id, name, description) VALUES (?, ?, ?)',
          [req.user.userId, groupName, `${groupName} 分组`]
        );
        groupId = groupResult.insertId;
      }
    }

    // 插入服务器记录
    const [result] = await db.pool.execute(
      `INSERT INTO servers 
       (user_id, name, host, port, username, password_encrypted, private_key_encrypted, auth_type, group_id, group_name) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.userId,
        name,
        host,
        port || 22,
        username,
        passwordEncrypted,
        privateKeyEncrypted,
        authType || 'password',
        groupId,
        finalGroupName
      ]
    );

    res.status(201).json({
      message: '服务器添加成功',
      server: {
        id: result.insertId,
        name,
        host,
        port: port || 22,
        username,
        authType: authType || 'password',
        groupName: groupName || 'Default'
      }
    });
  } catch (error) {
    console.error('添加服务器错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 更新服务器信息
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const serverId = req.params.id;
    const { name, host, port, username, password, privateKey, authType, groupName } = req.body;

    // 检查服务器是否存在且属于当前用户
    const [servers] = await db.pool.execute(
      'SELECT id FROM servers WHERE id = ? AND user_id = ?',
      [serverId, req.user.userId]
    );

    if (servers.length === 0) {
      return res.status(404).json({ error: '服务器不存在' });
    }

    // 构建更新字段
    const updateFields = [];
    const updateValues = [];

    if (name) {
      updateFields.push('name = ?');
      updateValues.push(name);
    }

    if (host) {
      updateFields.push('host = ?');
      updateValues.push(host);
    }

    if (port) {
      updateFields.push('port = ?');
      updateValues.push(port);
    }

    if (username) {
      updateFields.push('username = ?');
      updateValues.push(username);
    }

    if (groupName) {
      // 处理分组信息
      let groupId = null;

      // 查找对应的分组ID
      const [groups] = await db.pool.execute(
        'SELECT id FROM `groups` WHERE user_id = ? AND name = ?',
        [req.user.userId, groupName]
      );

      if (groups.length > 0) {
        groupId = groups[0].id;
      } else {
        // 如果分组不存在，创建新分组
        const [groupResult] = await db.pool.execute(
          'INSERT INTO `groups` (user_id, name, description) VALUES (?, ?, ?)',
          [req.user.userId, groupName, `${groupName} 分组`]
        );
        groupId = groupResult.insertId;
      }

      updateFields.push('group_id = ?');
      updateValues.push(groupId);
      updateFields.push('group_name = ?');
      updateValues.push(groupName);
    }

    // 处理认证信息更新
    if (authType) {
      updateFields.push('auth_type = ?');
      updateValues.push(authType);

      if (authType === 'password' && password) {
        const passwordEncrypted = encryptionService.encryptPassword(password, req.user.userId);
        updateFields.push('password_encrypted = ?');
        updateValues.push(passwordEncrypted);
        updateFields.push('private_key_encrypted = NULL');
      } else if (authType === 'key' && privateKey) {
        const privateKeyEncrypted = encryptionService.encryptPrivateKey(privateKey, req.user.userId);
        updateFields.push('private_key_encrypted = ?');
        updateValues.push(privateKeyEncrypted);
        updateFields.push('password_encrypted = NULL');
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: '没有提供更新信息' });
    }

    updateValues.push(serverId, req.user.userId);

    await db.pool.execute(
      `UPDATE servers SET ${updateFields.join(', ')} 
       WHERE id = ? AND user_id = ?`,
      updateValues
    );

    res.json({ message: '服务器更新成功' });
  } catch (error) {
    console.error('更新服务器错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 删除服务器
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const serverId = req.params.id;

    const [result] = await db.pool.execute(
      'DELETE FROM servers WHERE id = ? AND user_id = ?',
      [serverId, req.user.userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: '服务器不存在' });
    }

    res.json({ message: '服务器删除成功' });
  } catch (error) {
    console.error('删除服务器错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 获取服务器分组
router.get('/groups', authenticateToken, async (req, res) => {
  try {
    const [groups] = await db.pool.execute(
      'SELECT id, name, description, created_at, updated_at FROM `groups` WHERE user_id = ? ORDER BY name',
      [req.user.userId]
    );

    // 获取每个分组下的服务器数量
    for (let group of groups) {
      const [serverCount] = await db.pool.execute(
        'SELECT COUNT(*) as count FROM servers WHERE group_id = ? AND user_id = ?',
        [group.id, req.user.userId]
      );
      group.serverCount = serverCount[0].count;
    }

    res.json({ groups });
  } catch (error) {
    console.error('获取服务器分组错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 添加服务器分组
router.post('/groups', authenticateToken, async (req, res) => {
  try {
    const { name, description } = req.body;

    // 验证必填字段
    if (!name) {
      return res.status(400).json({ error: '分组名称是必填项' });
    }

    // 检查分组名称是否已存在
    const [existingGroups] = await db.pool.execute(
      'SELECT id FROM `groups` WHERE user_id = ? AND name = ?',
      [req.user.userId, name]
    );

    if (existingGroups.length > 0) {
      return res.status(400).json({ error: '分组名称已存在' });
    }

    // 插入新的分组记录
    const [result] = await db.pool.execute(
      'INSERT INTO `groups` (user_id, name, description) VALUES (?, ?, ?)',
      [req.user.userId, name, description || `${name} 分组`]
    );

    // 获取新创建的分组详情
    const [newGroup] = await db.pool.execute(
      'SELECT id, name, description, created_at, updated_at FROM `groups` WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      message: '分组添加成功',
      group: {
        ...newGroup[0],
        serverCount: 0
      }
    });
  } catch (error) {
    console.error('添加分组错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 更新服务器分组
router.put('/groups/:id', authenticateToken, async (req, res) => {
  try {
    const groupId = req.params.id;
    const { name, description } = req.body;

    // 验证必填字段
    if (!name) {
      return res.status(400).json({ error: '分组名称是必填项' });
    }

    // 检查分组是否存在且属于当前用户
    const [existingGroup] = await db.pool.execute(
      'SELECT id FROM `groups` WHERE id = ? AND user_id = ?',
      [groupId, req.user.userId]
    );

    if (existingGroup.length === 0) {
      return res.status(404).json({ error: '分组不存在' });
    }

    // 检查新名称是否已存在（排除当前分组）
    const [duplicateGroups] = await db.pool.execute(
      'SELECT id FROM `groups` WHERE user_id = ? AND name = ? AND id != ?',
      [req.user.userId, name, groupId]
    );

    if (duplicateGroups.length > 0) {
      return res.status(400).json({ error: '分组名称已存在' });
    }

    // 更新分组信息
    await db.pool.execute(
      'UPDATE `groups` SET name = ?, description = ? WHERE id = ? AND user_id = ?',
      [name, description || `${name} 分组`, groupId, req.user.userId]
    );

    // 获取更新后的分组详情
    const [updatedGroup] = await db.pool.execute(
      'SELECT id, name, description, created_at, updated_at FROM `groups` WHERE id = ?',
      [groupId]
    );

    // 获取服务器数量
    const [serverCount] = await db.pool.execute(
      'SELECT COUNT(*) as count FROM servers WHERE group_id = ? AND user_id = ?',
      [groupId, req.user.userId]
    );

    res.json({
      message: '分组更新成功',
      group: {
        ...updatedGroup[0],
        serverCount: serverCount[0].count
      }
    });
  } catch (error) {
    console.error('更新分组错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 删除服务器分组
router.delete('/groups/:id', authenticateToken, async (req, res) => {
  try {
    const groupId = req.params.id;

    // 检查分组是否存在且属于当前用户
    const [existingGroup] = await db.pool.execute(
      'SELECT id FROM `groups` WHERE id = ? AND user_id = ?',
      [groupId, req.user.userId]
    );

    if (existingGroup.length === 0) {
      return res.status(404).json({ error: '分组不存在' });
    }

    // 获取该分组下的服务器数量
    const [serverCount] = await db.pool.execute(
      'SELECT COUNT(*) as count FROM servers WHERE group_id = ? AND user_id = ?',
      [groupId, req.user.userId]
    );

    const count = serverCount[0].count;

    // 如果分组中有服务器，不允许删除
    if (count > 0) {
      return res.status(400).json({
        error: `分组中包含 ${count} 个服务器，请先删除或移出所有服务器后再删除分组`
      });
    }

    // 删除分组
    await db.pool.execute(
      'DELETE FROM `groups` WHERE id = ? AND user_id = ?',
      [groupId, req.user.userId]
    );

    res.json({
      message: '分组删除成功'
    });
  } catch (error) {
    console.error('删除分组错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 获取服务器基本信息（不含密钥，用于展示）
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const serverId = req.params.id;

    const [servers] = await db.pool.execute(
      `SELECT id, name, host, port, username, auth_type, group_name
       FROM servers WHERE id = ? AND user_id = ?`,
      [serverId, req.user.userId]
    );

    if (servers.length === 0) {
      return res.status(404).json({ error: '服务器不存在' });
    }

    res.json({ server: servers[0] });
  } catch (error) {
    console.error('获取服务器信息错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 获取服务器详情（包含解密后的认证信息）
router.get('/:id/credentials', authenticateToken, async (req, res) => {
  try {
    const serverId = req.params.id;

    const [servers] = await db.pool.execute(
      `SELECT id, name, host, port, username, password_encrypted, 
              private_key_encrypted, auth_type, group_name 
       FROM servers WHERE id = ? AND user_id = ?`,
      [serverId, req.user.userId]
    );

    if (servers.length === 0) {
      return res.status(404).json({ error: '服务器不存在' });
    }

    const server = servers[0];
    let credentials = {};

    // 解密认证信息
    if (server.auth_type === 'password' && server.password_encrypted) {
      credentials.password = encryptionService.decryptPassword(
        server.password_encrypted,
        req.user.userId
      );
    } else if (server.auth_type === 'key' && server.private_key_encrypted) {
      credentials.privateKey = encryptionService.decryptPrivateKey(
        server.private_key_encrypted,
        req.user.userId
      );
    }

    res.json({
      server: {
        id: server.id,
        name: server.name,
        host: server.host,
        port: server.port,
        username: server.username,
        authType: server.auth_type,
        groupName: server.group_name
      },
      credentials
    });
  } catch (error) {
    console.error('获取服务器认证信息错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 测试服务器连接（使用当前表单数据）
router.post('/test-connection', authenticateToken, async (req, res) => {
  try {
    const {
      host,
      port = 22,
      username,
      password,
      privateKey,
      authType = 'password'
    } = req.body;

    // 验证必填字段
    if (!host || !username) {
      return res.status(400).json({
        success: false,
        error: '主机地址和用户名是必填项'
      });
    }

    // 验证认证信息
    if (authType === 'password' && !password) {
      return res.status(400).json({
        success: false,
        error: '密码认证需要提供密码'
      });
    }

    if (authType === 'key' && !privateKey) {
      return res.status(400).json({
        success: false,
        error: '密钥认证需要提供私钥'
      });
    }

    // 创建SSH连接配置
    const sshConfig = {
      host: host,
      port: parseInt(port) || 22,
      username: username,
      readyTimeout: 10000, // 10秒超时
    };

    // 添加认证信息
    if (authType === 'password' && password) {
      sshConfig.password = password;
    } else if (authType === 'key' && privateKey) {
      sshConfig.privateKey = privateKey;
    }

    // 测试连接
    const conn = new Client();

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        conn.end();
        res.status(408).json({
          success: false,
          error: '连接超时'
        });
        resolve();
      }, 10000);

      conn.on('ready', () => {
        clearTimeout(timeout);
        conn.end();
        res.json({
          success: true,
          message: '连接测试成功'
        });
        resolve();
      });

      conn.on('error', (err) => {
        clearTimeout(timeout);
        console.error('SSH连接测试错误:', err);
        res.status(500).json({
          success: false,
          error: `连接失败: ${err.message || '未知错误'}`
        });
        resolve();
      });

      conn.connect(sshConfig);
    });

  } catch (error) {
    console.error('测试连接错误:', error);
    res.status(500).json({
      success: false,
      error: '服务器内部错误'
    });
  }
});

module.exports = router;