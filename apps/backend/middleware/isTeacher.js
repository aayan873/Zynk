export const isTeacher = (req, res, next) => {
  if (req.user && req.user.role === 'Teacher') {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: 'Access denied: Teachers only',
    });
  }
};
