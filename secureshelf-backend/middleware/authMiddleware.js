export const verifyRole = (allowedRoles) => {
  return (req, res, next) => {
    const userRole = req.headers['x-user-role'];
    if (!userRole || !allowedRoles.includes(userRole)) {
      return res.status(403).json({ message: 'Access denied: Unauthorized role.' });
    }
    next();
  };
};