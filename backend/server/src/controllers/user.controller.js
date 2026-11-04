const config = require("../config/index");
const ApiResponse = require('../utils/Response');
const { loginUser, getAllUsers, getUserById, getUserSessionById, refreshUserSession, revokeUserSession, revokeAllUserSessions } = require("../services/user.service");

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


const getSession = async (req, res) => {
	const user = await getUserById(req.user.sub);

	if (!user) {
		throw ApiResponse.error(404, "NOT_FOUND", "User Not Found");
	}

	return ApiResponse.success(res, user, null, 200);
}



const refreshSession = async (req, res) => {
	const user = await refreshUserSession(req.user.token, req.user.sub);

	return ApiResponse.success(res, user, null, 200);
}



const revokeSession = async (req, res) => {
	const user = await getUserById(req.user.sub);
	if (!user) throw ApiResponse.error(404, "NOT_FOUND", "User Not Found");
	const session = await getUserSessionById(req.user.sessionId);

	if (!session) {
		throw ApiResponse.error(404, "NOT_FOUND", "Session Not Found");
	}

	await revokeUserSession(req.user.sessionId);

	return ApiResponse.success(res, user, null, 200);
}




const revokeAllUserSessionsHandler = async (req, res) => {
	const user = await getUserById(req.user.sub);
	if (!user) throw ApiResponse.error(404, "NOT_FOUND", "User Not Found");
	await revokeAllUserSessions(req.user.sub);
	return ApiResponse.success(res, req.user, null, 200);
}



module.exports = {
	handleLogin,
	fetchAll,
	getSession,
	refreshSession,
	revokeSession,
	revokeAllUserSessionsHandler
};
