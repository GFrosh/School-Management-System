const db = require("../db/db");

class SessionRepository {
    async getAllSessions(current) {
        return current ? await db("academic_sessions").where({ is_current: true }).first() : await db("academic_sessions").orderBy("start_date", "desc");
    }

    async getSessionById(id) {
        return await db("academic_sessions").where({ id }).first();
    }

    async getTermsBySessId(id) {
        return await db("terms").where({ session_id: id });
    }

    async createNew(data) {
        return db.transaction(async (trx) => {
            const overlap = await trx('academic_sessions')
                .where('start_date', '<', data.end_date)
                .andWhere('end_date', '>', data.start_date)
                .first('id');
            if (overlap) {
                const error = new Error('Academic session dates overlap an existing session');
                error.status = 422;
                error.code = 'VALIDATION_FAILED';
                error.isOperational = true;
                throw error;
            }
            if (data.is_current) {
                await trx('academic_sessions').update({ is_current: false });
            }
            const [newSession] = await trx('academic_sessions').insert(data).returning('*');
            return newSession;
        }
    )}

    async updateSession(id, data) {
        return db.transaction(async (trx) => {
            const existing = await trx('academic_sessions').where({ id }).first();
            if (!existing) return undefined;
            const startDate = data.start_date || existing.start_date;
            const endDate = data.end_date || existing.end_date;
            const overlap = await trx('academic_sessions')
                .whereNot({ id })
                .where('start_date', '<', endDate)
                .andWhere('end_date', '>', startDate)
                .first('id');
            if (overlap) {
                const error = new Error('Academic session dates overlap an existing session');
                error.status = 422;
                error.code = 'VALIDATION_FAILED';
                error.isOperational = true;
                throw error;
            }
            if (data.is_current) {
                await trx('academic_sessions').update({ is_current: false });
            }
            const [updatedCurrent] = await trx("academic_sessions").where({ id }).update(data).returning("*");
            return updatedCurrent;
        });
    }


    async createNewTerm(data) {
        return await db("terms").insert(data);
    }
}

module.exports = SessionRepository;
