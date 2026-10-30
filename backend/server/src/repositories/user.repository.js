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
        return await db('refresh_tokens').insert(data);
    }


    /**
     * 
     * @param {*} id 
     * @returns 
     */
    async getUserProfiles(id) {
        const result = await db('users')
            .leftJoin('teachers as t', 't.user_id', 'users.id')
            .leftJoin('parents as p', 'p.user_id', 'users.id')
            .leftJoin('students as s', 's.user_id', 'users.id')
            .where('users.id', userid)
            .select(
            't.id as t_id', 't.name as t_name',
            'p.id as p_id', 'p.name as p_name',
            's.id as s_id', 's.name as s_name'
            )
            .first();

        if (!result) return { teacher: null, parent: null, student: null };

        return {
            teacher: result.t_id ? { id: result.t_id, name: result.t_name } : null,
            parent: result.p_id ? { id: result.p_id, name: result.p_name } : null,
            student: result.s_id ? { id: result.s_id, name: result.s_name } : null,
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
