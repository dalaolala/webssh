const jwt = require('jsonwebtoken');

/**
 * JWT认证中间件
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: '访问令牌不存在' 
    });
  }

  try {
    const secret = process.env.JWT_SECRET || 'webssh-secret-key';
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('JWT验证失败:', error);
    return res.status(403).json({ 
      success: false, 
      message: '无效的访问令牌' 
    });
  }
}

module.exports = {
  authenticateToken
};