const db = require('../db');

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
     * Gets all users from the database.
     * @returns {Promise<Array>} An array of user objects.
     */
    async getAllUsers() {
        return await db('users').select('*');
    }
}


module.exports = UserRepository;
