const { pool } = require('../config/database');

// 通用查询函数
async function query(sql, params = []) {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (error) {
    console.error('数据库查询错误:', error);
    throw error;
  }
}

// 根据ID获取服务器
async function getServerById(id) {
  const sql = 'SELECT * FROM servers WHERE id = ?';
  const result = await query(sql, [id]);
  return result.length > 0 ? result[0] : null;
}

// 获取用户的所有服务器
async function getUserServers(userId) {
  const sql = 'SELECT * FROM servers WHERE user_id = ? ORDER BY name';
  return await query(sql, [userId]);
}

// 创建服务器
async function createServer(serverData) {
  const sql = `
    INSERT INTO servers (user_id, name, host, port, username, password_encrypted, private_key_encrypted, group_name, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
  `;
  const result = await query(sql, [
    serverData.user_id,
    serverData.name,
    serverData.host,
    serverData.port,
    serverData.username,
    serverData.password,
    serverData.private_key,
    serverData.group_name || 'default'
  ]);
  
  return { id: result.insertId, ...serverData };
}

// 更新服务器
async function updateServer(id, serverData) {
  const sql = `
    UPDATE servers 
    SET name = ?, host = ?, port = ?, username = ?, password_encrypted = ?, private_key_encrypted = ?, group_name = ?, updated_at = NOW()
    WHERE id = ?
  `;
  
  await query(sql, [
    serverData.name,
    serverData.host,
    serverData.port,
    serverData.username,
    serverData.password,
    serverData.private_key,
    serverData.group_name,
    id
  ]);
  
  return { id, ...serverData };
}

// 删除服务器
async function deleteServer(id) {
  const sql = 'DELETE FROM servers WHERE id = ?';
  await query(sql, [id]);
  return true;
}

// 获取用户信息
async function getUserByEmail(email) {
  const sql = 'SELECT * FROM users WHERE email = ?';
  const result = await query(sql, [email]);
  return result.length > 0 ? result[0] : null;
}

async function getUserById(id) {
  const sql = 'SELECT id, email, created_at FROM users WHERE id = ?';
  const result = await query(sql, [id]);
  return result.length > 0 ? result[0] : null;
}

// 创建用户
async function createUser(userData) {
  const sql = 'INSERT INTO users (email, password, created_at) VALUES (?, ?, NOW())';
  const result = await query(sql, [userData.email, userData.password]);
  return { id: result.insertId, email: userData.email };
}

module.exports = {
  pool,
  query,
  getServerById,
  getUserServers,
  createServer,
  updateServer,
  deleteServer,
  getUserByEmail,
  getUserById,
  createUser
};