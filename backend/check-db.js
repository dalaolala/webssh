const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

async function checkDatabase() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'webssh'
    });

    console.log('=== 检查用户表 ===');
    const [users] = await connection.execute('SELECT id, email FROM users');
    console.log('用户总数:', users.length);
    users.forEach(user => console.log('用户:', user));

    console.log('\n=== 检查服务器表 ===');
    const [servers] = await connection.execute('SELECT id, user_id, name, host FROM servers');
    console.log('服务器总数:', servers.length);
    servers.forEach(server => console.log('服务器:', server));

    await connection.end();
  } catch (error) {
    console.error('数据库连接错误:', error.message);
  }
}

checkDatabase();