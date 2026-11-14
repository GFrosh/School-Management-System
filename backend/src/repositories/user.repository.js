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
            .leftJoin('staff as sp', 'sp.user_id', 'u.id')
            .leftJoin('teachers as t', 't.staff_id', 'sp.id')
            .leftJoin('parents as p', 'p.user_id', 'u.id')
            .leftJoin('students as s', 's.user_id', 'u.id')
            .where('u.id', id)
            .select(
                't.id as t_id',
                'p.id as p_id',
                's.id as s_id',
                'sp.id as staff_id',
                // Names live on the profile tables now. Priority only matters when one
                // account has several profiles (e.g. teacher + parent), where the names match.
                db.raw(`coalesce(
                    sp.first_name || ' ' || sp.last_name,
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
            staffId: result.staff_id ? result.staff_id : null,
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

    async listProfilesForAccounts() {
        const [parents, teachers, students, staff] = await Promise.all([
            db('parents').select('id', 'user_id', 'first_name', 'middle_name', 'last_name', 'email'),
            db('teachers as t').join('staff as s', 's.id', 't.staff_id').select('t.id', 's.user_id', 's.first_name', 's.middle_name', 's.last_name'),
            db('students').select('id', 'user_id', 'first_name', 'middle_name', 'last_name'),
            db('staff').select('id', 'user_id', 'first_name', 'middle_name', 'last_name'),
        ]);
        const map = (profileType, rows) => rows.map((row) => ({
            profileType,
            profileId: row.id,
            userId: row.user_id,
            name: [row.first_name, row.middle_name, row.last_name].filter(Boolean).join(' '),
            email: row.email || null,
            canCreate: !row.user_id,
        }));
        return [...map('parent', parents), ...map('teacher', teachers), ...map('student', students), ...map('staff', staff)];
    }

    async createUserFromProfile({ profileType, profileId, email, passwordHash, systemRole }) {
        return db.transaction(async (trx) => {
            const tables = { parent: 'parents', teacher: 'teachers', student: 'students', staff: 'staff' };
            const roles = { parent: 'parent', teacher: 'teacher', student: 'student' };
            const table = tables[profileType];
            const profileQuery = table === 'teacher'
                ? trx('teachers as t').join('staff as s', 's.id', 't.staff_id').where('t.id', profileId).select('t.*', 's.user_id', 's.first_name', 's.middle_name', 's.last_name').first()
                : trx(table).where({ id: profileId }).first();
            const profile = await profileQuery;
            if (!profile) return null;
            if (profile.user_id) {
                throw Object.assign(new Error('This profile already has a user account'), { code: 'PROFILE_ALREADY_LINKED' });
            }
            const roleName = systemRole || roles[profileType];
            if (!roleName) {
                throw Object.assign(new Error('A system role is required for this staff account'), { code: 'SYSTEM_ROLE_REQUIRED' });
            }
            const [user] = await trx('users').insert({ email, password_hash: passwordHash }).returning(['id', 'email', 'status']);
            const [role] = await trx('roles').where({ name: roleName }).select('id');
            if (!role) throw Object.assign(new Error('Selected system role does not exist'), { code: 'INVALID_SYSTEM_ROLE' });
            await trx('user_roles').insert({ user_id: user.id, role_id: role.id });
            if (table === 'teacher') {
                await trx('staff').where({ id: profile.staff_id }).update({ user_id: user.id, updated_at: trx.fn.now() });
            } else {
                await trx(table).where({ id: profileId }).update({ user_id: user.id, updated_at: trx.fn.now() });
            }
            return { ...user, profileType, profileId, name: [profile.first_name, profile.middle_name, profile.last_name].filter(Boolean).join(' '), role: roleName };
        });
    }
}


module.exports = UserRepository;
