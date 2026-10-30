const config = require("../config/index");
const ApiResponse = require('../utils/Response');
const { loginUser, getAllUsers } = require("../services/user.service");

const handleLogin = async (req, res) => {
	const { email, password } = req.body; 
	const result = await loginUser(email, password);


	res.cookie('refreshToken', result.refreshToken, {
	  httpOnly: true,
	  secure: config.nodeEnv === 'production',
	  sameSite: 'strict',
	  maxAge: 7 * 24 * 60 * 60 * 1000, 
	});


	const responsePayload = {
      message: 'Login successful',
      accessToken: result.accessToken,
      user: result.user
    };


	return ApiResponse.success(res, responsePayload, null, 200);
};


const fetchAll = async (req, res) => {
	const allUsers = await getAllUsers();
	return ApiResponse.success(res, allUsers, null, 200);
}


module.exports = {
	handleLogin,
	fetchAll
};
