const db = require('../db/db');

class UserRepository {
    /**
     * Gets a user by their ID.
     * @param {*} id 
     * @returns 
     */
    async getUserById(id) {
        return await db('users').where({ id }).first();
    }

    /**
     * 
     * @param {string} email 
     * @returns 
     */
    async getUserByEmail(email) {
        return await db('users').where({ email }).first();
    }


    /**
     * 
     * @param {number} id 
     * @param {object} data 
     * @returns 
     */
    async updateUserFailedAttempts(id, data) {
        return await db('users').where({ id }).update(data);
    }


    /**
     * 
     * @param {number} id 
     * @param {object} data 
     * @returns {void}
     */
    async updateUserLastLogin(id, data) {
        return await db("users")
            .where({ id })
            .update({ ...data, last_login_at: db.fn.now() });
    }


    /**
     * 
     * @param {number} id 
     * @returns {string}
     */
    async getUserRoles(id) {
        return await db('user_roles as ur')
            .join("users as u", "u.id", "=", "ur.user_id")
            .join("roles as r", "r.id", "=", "ur.role_id")
            .where("ur.user_id", id)
            .select("r.name");
    }


    /**
     * 
     * @param {*} id 
     * @param {*} data 
     * @returns {void}
     */
    async updateUserRefreshToken(data) {
        return await db('refresh_tokens').insert({ ...data, updated_at: db.fn.now() });
    }



    async getRefreshTokenByHash(tokenHash) {
        return await db('refresh_tokens').where({ token_hash: tokenHash }).first();
    }


    

    /**
     * 
     * @param {*} sessionId 
     * @returns {object}
     */
    async getUserSessionById(sessionId) {
        return await db('refresh_tokens').where({ id: sessionId }).first();
    }


    /**
     * 
     * @param {*} sessionId 
     * @returns {void}
     */
    async revokeUserRefreshToken(sessionId) {
        return await db('refresh_tokens').where({ id: sessionId }).update({ revoked_at: db.fn.now() });
    }



    /**
     * 
     * @param {*} userId 
     * @returns {void}
     */
    async revokeAllUserRefreshTokens(userId) {
        return await db('refresh_tokens').where({ user_id: userId }).update({ revoke_at: db.fn.now() });
    }


    /**
     * 
     * @param {*} id 
     * @returns 
     */
    async getUserProfiles(id) {
        const result = await db('users as u')
            .leftJoin('teachers as t', 't.user_id', 'u.id')
            .leftJoin('parents as p', 'p.user_id', 'u.id')
            .leftJoin('students as s', 's.user_id', 'u.id')
            .leftJoin('staff_profiles as sp', 'sp.user_id', 'u.id')
            .where('u.id', id)
            .select(
                't.id as t_id',
                'p.id as p_id',
                's.id as s_id',
                // Names live on the profile tables now. Priority only matters when one
                // account has several profiles (e.g. teacher + parent), where the names match.
                db.raw(`coalesce(
                    sp.first_name || ' ' || sp.last_name,
                    t.first_name  || ' ' || t.last_name,
                    p.first_name  || ' ' || p.last_name,
                    s.first_name  || ' ' || s.last_name
                ) as user_name`)
            )
            .first();

        if (!result) return { teacher: null, parent: null, student: null };

        return {
            teacherId: result.t_id ? result.t_id : null,
            parentId: result.p_id ? result.p_id : null,
            studentId: result.s_id ? result.s_id : null,
            userName: result.user_name ? result.user_name : null
        };
    }



    /**
     * Gets all users from the database.
     * @returns {Promise<Array>} An array of user objects.
     */
    async getAllUsers() {
        return await db('users').select('*');
    }
}


module.exports = UserRepository;
