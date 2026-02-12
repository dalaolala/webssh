const express = require('express');
const db = require('../config/database');

const router = express.Router();

// 管理员权限中间件
const requireAdmin = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ error: '需要管理员权限' });
  }
  next();
};

// 获取系统统计信息
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    // 获取用户统计
    const [userStats] = await db.pool.execute(`
      SELECT 
        COUNT(*) as total_users,
        SUM(is_admin) as admin_count,
        SUM(is_active) as active_users,
        COUNT(*) - SUM(is_active) as inactive_users,
        COUNT(CASE WHEN last_login IS NOT NULL THEN 1 END) as logged_in_users
      FROM users
    `);

    // 获取服务器统计
    const [serverStats] = await db.pool.execute(`
      SELECT 
        COUNT(*) as total_servers,
        COUNT(DISTINCT user_id) as users_with_servers,
        AVG(server_count) as avg_servers_per_user
      FROM (
        SELECT user_id, COUNT(*) as server_count
        FROM servers
        GROUP BY user_id
      ) user_server_counts
    `);

    // 获取连接统计
    const [connectionStats] = await db.pool.execute(`
      SELECT 
        COUNT(*) as total_connections,
        SUM(duration) as total_duration_seconds,
        AVG(duration) as avg_duration_seconds,
        MAX(start_time) as last_connection_time
      FROM connection_logs
    `);

    // 获取最近活跃用户
    const [recentUsers] = await db.pool.execute(`
      SELECT 
        u.id, u.email, u.last_login, 
        COUNT(s.id) as server_count,
        COUNT(cl.id) as connection_count
      FROM users u
      LEFT JOIN servers s ON u.id = s.user_id
      LEFT JOIN connection_logs cl ON u.id = cl.user_id
      WHERE u.last_login IS NOT NULL
      GROUP BY u.id, u.email, u.last_login
      ORDER BY u.last_login DESC
      LIMIT 10
    `);

    res.json({
      user_stats: userStats[0],
      server_stats: serverStats[0],
      connection_stats: connectionStats[0],
      recent_users: recentUsers
    });
  } catch (error) {
    console.error('获取系统统计错误:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// 获取系统健康状态
router.get('/health', requireAdmin, async (req, res) => {
  try {
    // 检查数据库连接
    const [dbCheck] = await db.pool.execute('SELECT 1 as db_ok');
    
    // 检查关键表是否存在
    const [tablesCheck] = await db.pool.execute(`
      SELECT 
        COUNT(*) as users_table_exists,
        (SELECT COUNT(*) FROM servers) as servers_count,
        (SELECT COUNT(*) FROM connection_logs) as logs_count
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() AND table_name = 'users'
    `);

    // 获取系统信息
    const systemInfo = {
      node_version: process.version,
      platform: process.platform,
      memory_usage: process.memoryUsage(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development'
    };

    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: dbCheck.length > 0 ? 'connected' : 'disconnected',
      tables: tablesCheck[0],
      system: systemInfo
    };

    res.json(healthStatus);
  } catch (error) {
    console.error('系统健康检查错误:', error);
    res.status(500).json({ 
      status: 'unhealthy',
      error: '系统健康检查失败',
      details: error.message 
    });
  }
});

// 清理过期连接日志
router.post('/cleanup', requireAdmin, async (req, res) => {
  try {
    const { days = 30 } = req.body;
    
    // 清理超过指定天数的连接日志
    const [result] = await db.pool.execute(
      'DELETE FROM connection_logs WHERE start_time < DATE_SUB(NOW(), INTERVAL ? DAY)',
      [days]
    );

    res.json({
      message: `已清理 ${result.affectedRows} 条过期连接日志`,
      cleaned_rows: result.affectedRows
    });
  } catch (error) {
    console.error('清理连接日志错误:', error);
    res.status(500).json({ error: '清理连接日志失败' });
  }
});

// 获取系统设置（预留接口）
router.get('/settings', requireAdmin, async (req, res) => {
  try {
    // 这里可以返回系统配置信息
    res.json({
      settings: {
        max_servers_per_user: 100,
        max_connections_per_user: 10,
        session_timeout_minutes: 60,
        allow_registration: true,
        require_email_verification: false
      }
    });
  } catch (error) {
    console.error('获取系统设置错误:', error);
    res.status(500).json({ error: '获取系统设置失败' });
  }
});

module.exports = router;