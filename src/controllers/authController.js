const jwt = require("jsonwebtoken");
const User = require("../models/User");

/* ================== REGISTER ================== */
exports.registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "Email already exists" });
        }

        const user = await User.create({ name, email, password });

        res.json({
            message: "Registration successful",
            user: { id: user._id, name: user.name, email: user.email, password: user.password }
        });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


/* ================== LOGIN ================== */
exports.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const token = jwt.sign(
            { id: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.json({
            message: "Login success",
            token,
            user: { id: user._id, name: user.name, email: user.email, password: user.password }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


/* ================== GET ME ================== */
exports.getMe = async (req, res) => {
    const user = await User.findById(req.user.id).select("-password");

    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
};


/* ================== LOGOUT ================== */
exports.logoutUser = async (req, res) => {
    try {
        // No server-side session stored, so just return success
        return res.json({
            message: "Logged out successfully"
        });

    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
};