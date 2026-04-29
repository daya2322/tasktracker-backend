// exports.allowRoles = (...roles) => {
//   return (req, res, next) => {
//     if (!req.user || !roles.includes(req.user.role)) {
//       return res.status(403).json({
//         status: false,
//         message: "Access denied",
//       });
//     }
//     next();
//   };
// };
exports.allowRoles = (...roles) => {
  return (req, res, next) => {
    console.log("User Role:", req.user?.role);
    console.log("Allowed Roles:", roles);

    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        status: false,
        message: "Access denied",
      });
    }

    next();
  };
};
